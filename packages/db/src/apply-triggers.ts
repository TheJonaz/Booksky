import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL saknas');
  const sql = postgres(url, { max: 1 });
  const sqlFile = fs.readFileSync(path.resolve(__dirname, '../sql/triggers.sql'), 'utf8');
  await sql.unsafe(sqlFile);
  console.log('Triggers applicerade.');
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
