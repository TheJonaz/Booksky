import { db } from './db.js';
import { companies, fiscalYears } from '@booksky/db';
import { eq, desc } from 'drizzle-orm';

// MVP: en hårdkodad default-company (den som seedas).
// Utbyggt senare till multi-tenant auth.
export async function getDefaultCompany() {
  const [c] = await db.select().from(companies).orderBy(companies.id).limit(1);
  if (!c) throw new Error('Ingen seedad company. Kör npm run db:seed.');
  return c;
}

export async function getCurrentFiscalYear(companyId: number) {
  const [fy] = await db
    .select()
    .from(fiscalYears)
    .where(eq(fiscalYears.companyId, companyId))
    .orderBy(desc(fiscalYears.startDate))
    .limit(1);
  if (!fy) throw new Error('Inget räkenskapsår. Kör npm run db:seed.');
  return fy;
}
