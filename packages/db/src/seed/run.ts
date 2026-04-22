import { getDb, closeDb } from '../client.js';
import { companies, fiscalYears, accounts } from '../schema.js';
import { BAS_CORE } from './bas2024.js';
import { eq } from 'drizzle-orm';

async function main() {
  const db = getDb();

  const existing = await db.select().from(companies).where(eq(companies.orgNumber, '000000-0000'));
  let companyId: number;

  if (existing.length === 0) {
    const [inserted] = await db.insert(companies).values({
      name: 'Demo Enskild Firma',
      orgNumber: '000000-0000',
      form: 'sole_trader'
    }).returning({ id: companies.id });
    companyId = inserted.id;
    console.log(`Created company #${companyId}`);
  } else {
    companyId = existing[0].id;
    console.log(`Company already exists #${companyId}`);
  }

  const year = new Date().getFullYear();
  const fyExisting = await db.select().from(fiscalYears).where(eq(fiscalYears.companyId, companyId));
  if (fyExisting.length === 0) {
    await db.insert(fiscalYears).values({
      companyId,
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
      status: 'open'
    });
    console.log(`Created fiscal year ${year}`);
  } else {
    console.log(`Fiscal year already exists`);
  }

  const accExisting = await db.select().from(accounts).where(eq(accounts.companyId, companyId));
  if (accExisting.length === 0) {
    await db.insert(accounts).values(
      BAS_CORE.map((a) => ({
        companyId,
        number: a.number,
        name: a.name,
        type: a.type,
        vatCode: a.vatCode ?? null
      }))
    );
    console.log(`Seeded ${BAS_CORE.length} BAS accounts`);
  } else {
    console.log(`Accounts already seeded (${accExisting.length})`);
  }

  await closeDb();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
