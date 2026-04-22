import { and, eq, desc, sql } from 'drizzle-orm';
import { vouchers, voucherLines, accounts, auditLog, type Db } from '@booksky/db';
import { computeVoucherHash } from './hash.js';

// Postar en utkastverifikation: sätter posted_at + hash/prev_hash.
// Atomiskt: om hashningen misslyckas rullas allt tillbaka.
export async function postVoucher(
  db: Db,
  opts: { voucherId: number; companyId: number; actor?: string }
): Promise<{ hash: string; postedAt: Date }> {
  return db.transaction(async (tx) => {
    const [v] = await tx
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.id, opts.voucherId), eq(vouchers.companyId, opts.companyId)));
    if (!v) throw new Error('Verifikation saknas');
    if (v.postedAt) throw new Error('Redan bokförd');

    // Hämta rader i kanonisk ordning
    const lines = await tx
      .select({
        accountNumber: accounts.number,
        debit: voucherLines.debit,
        credit: voucherLines.credit,
        description: voucherLines.description
      })
      .from(voucherLines)
      .innerJoin(accounts, eq(accounts.id, voucherLines.accountId))
      .where(eq(voucherLines.voucherId, v.id))
      .orderBy(voucherLines.id);

    // Föregående hash = senast postade verifikation i samma serie
    const [prev] = await tx
      .select({ hash: vouchers.hash })
      .from(vouchers)
      .where(
        and(
          eq(vouchers.companyId, v.companyId),
          eq(vouchers.fiscalYearId, v.fiscalYearId),
          eq(vouchers.series, v.series),
          sql`${vouchers.postedAt} IS NOT NULL`,
          sql`${vouchers.id} <> ${v.id}`
        )
      )
      .orderBy(desc(vouchers.number))
      .limit(1);

    const prevHash = prev?.hash ?? null;
    const hash = computeVoucherHash(prevHash, {
      series: v.series,
      number: v.number,
      voucherDate: v.voucherDate,
      description: v.description,
      correctsVoucherId: v.correctsVoucherId ?? null,
      lines
    });

    const postedAt = new Date();
    await tx
      .update(vouchers)
      .set({ postedAt, hash, prevHash })
      .where(eq(vouchers.id, v.id));

    await tx.insert(auditLog).values({
      companyId: v.companyId,
      actor: opts.actor ?? 'system',
      entityType: 'voucher',
      entityId: v.id,
      action: 'post',
      payload: { hash, prevHash, lineCount: lines.length }
    });

    return { hash, postedAt };
  });
}

export interface ChainVerification {
  ok: boolean;
  checked: number;
  issues: { voucherId: number; series: string; number: number; reason: string }[];
}

// Verifierar hashkedjan i en serie inom ett räkenskapsår.
export async function verifyChain(
  db: Db,
  opts: { companyId: number; fiscalYearId: number; series: string }
): Promise<ChainVerification> {
  const posted = await db
    .select()
    .from(vouchers)
    .where(
      and(
        eq(vouchers.companyId, opts.companyId),
        eq(vouchers.fiscalYearId, opts.fiscalYearId),
        eq(vouchers.series, opts.series),
        sql`${vouchers.postedAt} IS NOT NULL`
      )
    )
    .orderBy(vouchers.number);

  const issues: ChainVerification['issues'] = [];
  let expectedPrevHash: string | null = null;

  for (const v of posted) {
    const lines = await db
      .select({
        accountNumber: accounts.number,
        debit: voucherLines.debit,
        credit: voucherLines.credit,
        description: voucherLines.description
      })
      .from(voucherLines)
      .innerJoin(accounts, eq(accounts.id, voucherLines.accountId))
      .where(eq(voucherLines.voucherId, v.id))
      .orderBy(voucherLines.id);

    const expected = computeVoucherHash(expectedPrevHash, {
      series: v.series,
      number: v.number,
      voucherDate: v.voucherDate,
      description: v.description,
      correctsVoucherId: v.correctsVoucherId ?? null,
      lines
    });

    if (v.prevHash !== expectedPrevHash) {
      issues.push({
        voucherId: v.id,
        series: v.series,
        number: v.number,
        reason: `prev_hash fel: ${v.prevHash ?? 'null'} ≠ ${expectedPrevHash ?? 'null'}`
      });
    }
    if (v.hash !== expected) {
      issues.push({
        voucherId: v.id,
        series: v.series,
        number: v.number,
        reason: 'hash matchar inte omberäknad hash (innehåll eller ordning ändrad)'
      });
    }

    expectedPrevHash = v.hash;
  }

  return { ok: issues.length === 0, checked: posted.length, issues };
}
