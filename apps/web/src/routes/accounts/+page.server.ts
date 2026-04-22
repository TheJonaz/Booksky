import { db } from '$lib/server/db.js';
import { accounts } from '@booksky/db';
import { eq } from 'drizzle-orm';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ parent }) => {
  const { company } = await parent();
  const rows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.companyId, company.id))
    .orderBy(accounts.number);
  return { accounts: rows };
};
