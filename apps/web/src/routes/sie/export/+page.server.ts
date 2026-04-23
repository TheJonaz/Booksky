import { db } from '$lib/server/db.js';
import { fiscalYears } from '@booksky/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ parent }) => {
  const { company } = await parent();
  const fy = await db
    .select()
    .from(fiscalYears)
    .where(eq(fiscalYears.companyId, company.id))
    .orderBy(fiscalYears.startDate);
  return { fiscalYears: fy };
};
