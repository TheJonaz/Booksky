// Brygga mellan DB-domänmodellen och SieDocument.
// buildSieDocument: exportläge — läser ur DB till SIE-struktur.
// importSieDocument: importläge — skapar konton + utkastverifikationer i serien 'I'.

import { and, eq, max, gte, lte, sql } from 'drizzle-orm';
import {
  accounts,
  vouchers,
  voucherLines,
  fiscalYears,
  companies,
  auditLog,
  type Db,
  type AccountType
} from '@booksky/db';
import { kronorToOre, oreToNumeric } from '../money.js';
import { getAccountBalances } from '../reports.js';
import type {
  SieAccount,
  SieDocument,
  SieType,
  SieVoucher
} from './types.js';
import { emptyDocument } from './types.js';

const TYPE_TO_KTYP: Record<AccountType, 'T' | 'S' | 'I' | 'K'> = {
  asset: 'T',
  liability: 'S',
  equity: 'S',
  income: 'I',
  expense: 'K'
};

const KTYP_TO_TYPE: Record<'T' | 'S' | 'I' | 'K', AccountType> = {
  T: 'asset',
  S: 'liability',
  I: 'income',
  K: 'expense'
};

function oreToSie(ore: number): string {
  const neg = ore < 0;
  const abs = Math.abs(ore);
  const kr = Math.floor(abs / 100);
  const o = abs % 100;
  return `${neg ? '-' : ''}${kr}.${o.toString().padStart(2, '0')}`;
}

export interface BuildOptions {
  companyId: number;
  fiscalYearId: number;
  sieType?: SieType; // default 4
  /** Om satt: endast verifikationer där voucher_date ligger i intervallet. Default: hela räkenskapsåret. */
  fromDate?: string;
  toDate?: string;
  /** Endast bokförda verifikationer (posted_at IS NOT NULL). Default: true. */
  postedOnly?: boolean;
}

/** Läser DB och bygger upp en SieDocument redo att encode:as. */
export async function buildSieDocument(db: Db, opts: BuildOptions): Promise<SieDocument> {
  const sieType: SieType = opts.sieType ?? 4;
  const postedOnly = opts.postedOnly ?? true;

  const [company] = await db.select().from(companies).where(eq(companies.id, opts.companyId));
  if (!company) throw new Error('Företag saknas');
  const [fy] = await db.select().from(fiscalYears).where(eq(fiscalYears.id, opts.fiscalYearId));
  if (!fy) throw new Error('Räkenskapsår saknas');

  const from = opts.fromDate ?? fy.startDate;
  const to = opts.toDate ?? fy.endDate;

  const doc = emptyDocument();
  doc.sieType = sieType;
  doc.companyName = company.name;
  doc.orgNumber = company.orgNumber;
  doc.generated = { date: new Date().toISOString().slice(0, 10), sign: 'booksky' };
  doc.fiscalYears.push({
    yearOffset: 0,
    startDate: fy.startDate,
    endDate: fy.endDate
  });

  // Konton
  const accRows = await db
    .select({
      id: accounts.id,
      number: accounts.number,
      name: accounts.name,
      type: accounts.type
    })
    .from(accounts)
    .where(eq(accounts.companyId, opts.companyId))
    .orderBy(accounts.number);

  const accById = new Map<number, (typeof accRows)[number]>();
  for (const a of accRows) accById.set(a.id, a);

  const sieAccounts: SieAccount[] = accRows.map((a) => ({
    number: a.number,
    name: a.name,
    type: TYPE_TO_KTYP[a.type]
  }));
  doc.accounts = sieAccounts;

  // Saldon (typ 1–3 samt typ 4 innehåller alla UB/RES)
  if (sieType >= 1) {
    const balances = await getAccountBalances(db, {
      companyId: opts.companyId,
      fromDate: fy.startDate,
      toDate: fy.endDate
    });
    for (const b of balances) {
      if (b.type === 'asset' || b.type === 'liability' || b.type === 'equity') {
        doc.outgoingBalances.push({
          yearOffset: 0,
          account: b.number,
          amount: oreToSie(b.balance)
        });
      } else {
        doc.resultBalances.push({
          yearOffset: 0,
          account: b.number,
          amount: oreToSie(b.balance)
        });
      }
    }
  }

  // Verifikationer (endast typ 4)
  if (sieType === 4) {
    const whereConds = [
      eq(vouchers.companyId, opts.companyId),
      eq(vouchers.fiscalYearId, opts.fiscalYearId),
      gte(vouchers.voucherDate, from),
      lte(vouchers.voucherDate, to)
    ];
    if (postedOnly) whereConds.push(sql`${vouchers.postedAt} IS NOT NULL`);

    const vRows = await db
      .select()
      .from(vouchers)
      .where(and(...whereConds))
      .orderBy(vouchers.series, vouchers.number);

    for (const v of vRows) {
      const lineRows = await db
        .select({
          accountId: voucherLines.accountId,
          debit: voucherLines.debit,
          credit: voucherLines.credit,
          description: voucherLines.description
        })
        .from(voucherLines)
        .where(eq(voucherLines.voucherId, v.id))
        .orderBy(voucherLines.id);

      const sieVoucher: SieVoucher = {
        series: v.series,
        number: String(v.number),
        voucherDate: v.voucherDate,
        description: v.description,
        regDate: v.postedAt ? v.postedAt.toISOString().slice(0, 10) : undefined,
        transactions: lineRows.map((l) => {
          const acc = accById.get(l.accountId);
          const debitOre = kronorToOre(l.debit);
          const creditOre = kronorToOre(l.credit);
          const ore = debitOre - creditOre;
          return {
            account: acc?.number ?? '0000',
            amount: oreToSie(ore),
            description: l.description ?? undefined
          };
        })
      };
      doc.vouchers.push(sieVoucher);
    }
  }

  return doc;
}

export interface ImportOptions {
  companyId: number;
  fiscalYearId: number;
  /** Serie att skapa importerade verifikationer i (default 'I'). */
  series?: string;
  /** Om true: endast analys — inget skrivs. */
  dryRun?: boolean;
}

export interface ImportPreview {
  voucherCount: number;
  transactionCount: number;
  missingAccounts: { number: string; name: string; type?: string }[];
  outsideFiscalYear: number;
  unbalanced: { series: string; number?: string; diff: string }[];
  dateRange: { min: string; max: string } | null;
}

export interface ImportResult extends ImportPreview {
  createdAccountIds: number[];
  createdVoucherIds: number[];
}

/** Analyserar en SIE-fil mot DB-tillståndet — returnerar rapport utan att skriva. */
export async function previewImport(
  db: Db,
  doc: SieDocument,
  opts: ImportOptions
): Promise<ImportPreview> {
  const [fy] = await db.select().from(fiscalYears).where(eq(fiscalYears.id, opts.fiscalYearId));
  if (!fy) throw new Error('Räkenskapsår saknas');

  const existing = await db
    .select({ number: accounts.number })
    .from(accounts)
    .where(eq(accounts.companyId, opts.companyId));
  const have = new Set(existing.map((a) => a.number));
  const used = new Set<string>();
  for (const v of doc.vouchers) for (const t of v.transactions) used.add(t.account);

  const missingNumbers = [...used].filter((n) => !have.has(n));
  const missingAccounts = missingNumbers.map((n) => {
    const info = doc.accounts.find((a) => a.number === n);
    return { number: n, name: info?.name ?? n, type: info?.type };
  });

  let outsideFiscalYear = 0;
  const unbalanced: ImportPreview['unbalanced'] = [];
  let transactionCount = 0;
  let minD: string | null = null;
  let maxD: string | null = null;

  for (const v of doc.vouchers) {
    if (v.voucherDate < fy.startDate || v.voucherDate > fy.endDate) outsideFiscalYear++;
    if (!minD || v.voucherDate < minD) minD = v.voucherDate;
    if (!maxD || v.voucherDate > maxD) maxD = v.voucherDate;

    let sum = 0;
    for (const t of v.transactions) {
      transactionCount++;
      sum += Math.round(Number(t.amount) * 100);
    }
    if (sum !== 0) {
      unbalanced.push({
        series: v.series,
        number: v.number,
        diff: oreToSie(sum)
      });
    }
  }

  return {
    voucherCount: doc.vouchers.length,
    transactionCount,
    missingAccounts,
    outsideFiscalYear,
    unbalanced,
    dateRange: minD && maxD ? { min: minD, max: maxD } : null
  };
}

/**
 * Importerar SIE-filen till DB. Skapar saknade konton, lägger verifikationer
 * som utkast (posted_at = null) i valfri serie. Hash-kedjan påverkas först
 * när användaren postar dem via postVoucher.
 *
 * Obalanserade verifikationer hoppas över och rapporteras.
 */
export async function importSieDocument(
  db: Db,
  doc: SieDocument,
  opts: ImportOptions
): Promise<ImportResult> {
  const series = opts.series ?? 'I';
  const preview = await previewImport(db, doc, opts);

  if (opts.dryRun) {
    return { ...preview, createdAccountIds: [], createdVoucherIds: [] };
  }

  return db.transaction(async (tx) => {
    const createdAccountIds: number[] = [];
    const createdVoucherIds: number[] = [];

    // Skapa saknade konton
    const [fy] = await tx.select().from(fiscalYears).where(eq(fiscalYears.id, opts.fiscalYearId));
    if (!fy) throw new Error('Räkenskapsår saknas');

    const existing = await tx
      .select({ id: accounts.id, number: accounts.number })
      .from(accounts)
      .where(eq(accounts.companyId, opts.companyId));
    const numberToId = new Map(existing.map((a) => [a.number, a.id] as const));

    for (const miss of preview.missingAccounts) {
      const type: AccountType = miss.type && miss.type in KTYP_TO_TYPE
        ? KTYP_TO_TYPE[miss.type as 'T' | 'S' | 'I' | 'K']
        : inferTypeFromAccountNumber(miss.number);
      const [row] = await tx
        .insert(accounts)
        .values({
          companyId: opts.companyId,
          number: miss.number,
          name: miss.name,
          type
        })
        .returning({ id: accounts.id });
      numberToId.set(miss.number, row.id);
      createdAccountIds.push(row.id);
    }

    // Plocka nästa lediga nummer i målserien
    const [maxRow] = await tx
      .select({ m: max(vouchers.number) })
      .from(vouchers)
      .where(
        and(
          eq(vouchers.companyId, opts.companyId),
          eq(vouchers.fiscalYearId, opts.fiscalYearId),
          eq(vouchers.series, series)
        )
      );
    let nextNumber = (maxRow?.m ?? 0) + 1;

    for (const v of doc.vouchers) {
      // Hoppa över om obalanserad eller utanför räkenskapsår
      let sum = 0;
      for (const t of v.transactions) sum += Math.round(Number(t.amount) * 100);
      if (sum !== 0) continue;
      if (v.voucherDate < fy.startDate || v.voucherDate > fy.endDate) continue;
      if (v.transactions.length < 2) continue;

      const [inserted] = await tx
        .insert(vouchers)
        .values({
          companyId: opts.companyId,
          fiscalYearId: opts.fiscalYearId,
          series,
          number: nextNumber++,
          voucherDate: v.voucherDate,
          description: v.description ?? '(importerad)',
          postedAt: null
        })
        .returning({ id: vouchers.id });
      createdVoucherIds.push(inserted.id);

      const lineValues = v.transactions.map((t) => {
        const ore = Math.round(Number(t.amount) * 100);
        const accountId = numberToId.get(t.account);
        if (!accountId) throw new Error(`Konto ${t.account} saknas efter skapande`);
        return {
          voucherId: inserted.id,
          accountId,
          debit: oreToNumeric(ore > 0 ? ore : 0),
          credit: oreToNumeric(ore < 0 ? -ore : 0),
          description: t.description ?? null
        };
      });
      await tx.insert(voucherLines).values(lineValues);

      await tx.insert(auditLog).values({
        companyId: opts.companyId,
        entityType: 'voucher',
        entityId: inserted.id,
        action: 'import_sie',
        payload: {
          sourceSeries: v.series,
          sourceNumber: v.number,
          transactionCount: v.transactions.length
        }
      });
    }

    return { ...preview, createdAccountIds, createdVoucherIds };
  });
}

/** Heuristik enligt BAS-kontoplanen när KTYP saknas. */
function inferTypeFromAccountNumber(num: string): AccountType {
  const n = Number(num);
  if (!Number.isFinite(n)) return 'asset';
  if (n >= 1000 && n < 2000) return 'asset';
  if (n >= 2000 && n < 3000) {
    // 2000–2099 är eget kapital; resten är skulder
    if (n < 2100) return 'equity';
    return 'liability';
  }
  if (n >= 3000 && n < 4000) return 'income';
  if (n >= 4000 && n < 8000) return 'expense';
  // 8000-serien: finansiella poster (intäkter/kostnader). Default: expense.
  if (n >= 8000 && n < 9000) return 'expense';
  return 'asset';
}
