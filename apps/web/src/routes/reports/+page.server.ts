import { db } from '$lib/server/db.js';
import { getAccountBalances, buildBalanceSheet, buildIncomeStatement } from '@booksky/core';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ parent, url }) => {
  const { company, fiscalYear } = await parent();
  const fromDate = url.searchParams.get('from') || fiscalYear.startDate;
  const toDate = url.searchParams.get('to') || fiscalYear.endDate;

  const balances = await getAccountBalances(db, {
    companyId: company.id,
    fromDate,
    toDate
  });

  return {
    fromDate,
    toDate,
    balanceSheet: buildBalanceSheet(balances),
    incomeStatement: buildIncomeStatement(balances)
  };
};
