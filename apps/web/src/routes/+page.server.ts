import { db } from '$lib/server/db.js';
import { vouchers, voucherLines } from '@booksky/db';
import { getAccountBalances, buildIncomeStatement, buildBalanceSheet } from '@booksky/core';
import { eq, desc, sql } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ parent }) => {
  const { company, fiscalYear } = await parent();

  const recent = await db
    .select({
      id: vouchers.id,
      series: vouchers.series,
      number: vouchers.number,
      voucherDate: vouchers.voucherDate,
      description: vouchers.description,
      postedAt: vouchers.postedAt
    })
    .from(vouchers)
    .where(eq(vouchers.companyId, company.id))
    .orderBy(desc(vouchers.voucherDate), desc(vouchers.id))
    .limit(5);

  const [count] = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(vouchers)
    .where(eq(vouchers.companyId, company.id));

  const balances = await getAccountBalances(db, {
    companyId: company.id,
    fromDate: fiscalYear.startDate,
    toDate: fiscalYear.endDate
  });
  const income = buildIncomeStatement(balances);
  const balance = buildBalanceSheet(balances);

  return {
    recentVouchers: recent,
    voucherCount: count.c,
    summary: {
      incomeTotal: income.income.total,
      expenseTotal: income.expense.total,
      result: income.result,
      assetsTotal: balance.assets.total
    }
  };
};
