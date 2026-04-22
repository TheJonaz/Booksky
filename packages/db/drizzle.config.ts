import { defineConfig } from 'drizzle-kit';

const url =
  process.env.DATABASE_URL ??
  'postgres://booksky:booksky_dev@127.0.0.1:5433/booksky';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url }
});
