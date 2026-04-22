import { sql, and, eq, gte, lte } from 'drizzle-orm';
import { accounts, voucherLines, vouchers, type Db } from '@booksky/db';
import { numericToOre, type Ore } from './money.js';

export interface AccountBalance {
  accountId: number;
  number: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'income' | 'expense';
  debit: Ore;
  credit: Ore;
  balance: Ore; // debet - kredit (positiv = debetsaldo)
}

export async function getAccountBalances(
  db: Db,
  opts: { companyId: number; fromDate?: string; toDate?: string }
): Promise<AccountBalance[]> {
  const voucherConds = [eq(vouchers.companyId, opts.companyId)];
  if (opts.fromDate) voucherConds.push(gte(vouchers.voucherDate, opts.fromDate));
  if (opts.toDate) voucherConds.push(lte(vouchers.voucherDate, opts.toDate));

  const rows = await db
    .select({
      accountId: accounts.id,
      number: accounts.number,
      name: accounts.name,
      type: accounts.type,
      debit: sql<string>`coalesce(sum(${voucherLines.debit}), '0')`,
      credit: sql<string>`coalesce(sum(${voucherLines.credit}), '0')`
    })
    .from(accounts)
    .leftJoin(voucherLines, eq(voucherLines.accountId, accounts.id))
    .leftJoin(vouchers, and(eq(vouchers.id, voucherLines.voucherId), ...voucherConds))
    .where(eq(accounts.companyId, opts.companyId))
    .groupBy(accounts.id, accounts.number, accounts.name, accounts.type)
    .orderBy(accounts.number);

  return rows.map((r) => {
    const debit = numericToOre(r.debit);
    const credit = numericToOre(r.credit);
    return {
      accountId: r.accountId,
      number: r.number,
      name: r.name,
      type: r.type,
      debit,
      credit,
      balance: debit - credit
    };
  });
}

export interface ReportLine {
  number: string;
  name: string;
  amount: Ore;
}

export interface ReportSection {
  title: string;
  lines: ReportLine[];
  total: Ore;
}

export interface BalanceSheet {
  assets: ReportSection;
  liabilitiesAndEquity: ReportSection;
  periodResult: Ore;
}

export function buildBalanceSheet(balances: AccountBalance[]): BalanceSheet {
  const assetsLines: ReportLine[] = balances
    .filter((b) => b.type === 'asset' && b.balance !== 0)
    .map((b) => ({ number: b.number, name: b.name, amount: b.balance }));

  const liabEquityLines: ReportLine[] = balances
    .filter((b) => (b.type === 'liability' || b.type === 'equity') && b.balance !== 0)
    .map((b) => ({ number: b.number, name: b.name, amount: -b.balance }));

  const incomeTotal = balances.filter((b) => b.type === 'income').reduce((a, b) => a + b.balance, 0);
  const expenseTotal = balances.filter((b) => b.type === 'expense').reduce((a, b) => a + b.balance, 0);
  const periodResult = -incomeTotal - expenseTotal;

  return {
    assets: {
      title: 'Tillgångar',
      lines: assetsLines,
      total: assetsLines.reduce((a, l) => a + l.amount, 0)
    },
    liabilitiesAndEquity: {
      title: 'Eget kapital och skulder',
      lines: liabEquityLines,
      total: liabEquityLines.reduce((a, l) => a + l.amount, 0)
    },
    periodResult
  };
}

export interface IncomeStatement {
  income: ReportSection;
  expense: ReportSection;
  result: Ore;
}

export function buildIncomeStatement(balances: AccountBalance[]): IncomeStatement {
  const incomeLines: ReportLine[] = balances
    .filter((b) => b.type === 'income' && b.balance !== 0)
    .map((b) => ({ number: b.number, name: b.name, amount: -b.balance }));
  const expenseLines: ReportLine[] = balances
    .filter((b) => b.type === 'expense' && b.balance !== 0)
    .map((b) => ({ number: b.number, name: b.name, amount: b.balance }));

  const incomeTotal = incomeLines.reduce((a, l) => a + l.amount, 0);
  const expenseTotal = expenseLines.reduce((a, l) => a + l.amount, 0);

  return {
    income: { title: 'Intäkter', lines: incomeLines, total: incomeTotal },
    expense: { title: 'Kostnader', lines: expenseLines, total: expenseTotal },
    result: incomeTotal - expenseTotal
  };
}
