import { db } from '$lib/server/db.js';
import { verifyChain } from '@booksky/core';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ parent }) => {
  const { company, fiscalYear } = await parent();
  const result = await verifyChain(db, {
    companyId: company.id,
    fiscalYearId: fiscalYear.id,
    series: 'A'
  });
  return { result };
};
