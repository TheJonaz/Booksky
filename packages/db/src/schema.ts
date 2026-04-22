import {
  pgTable,
  pgEnum,
  serial,
  integer,
  text,
  boolean,
  date,
  timestamp,
  numeric,
  uniqueIndex,
  index
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const companyForm = pgEnum('company_form', ['sole_trader', 'ab']);
export const accountType = pgEnum('account_type', ['asset', 'liability', 'equity', 'income', 'expense']);
export const fiscalYearStatus = pgEnum('fiscal_year_status', ['open', 'closed']);

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  orgNumber: text('org_number').notNull().unique(),
  form: companyForm('form').notNull(),
  currency: text('currency').notNull().default('SEK'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
});

export const fiscalYears = pgTable('fiscal_years', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  startDate: date('start_date').notNull(),
  endDate: date('end_date').notNull(),
  status: fiscalYearStatus('status').notNull().default('open')
}, (t) => ({
  uniqCompanyStart: uniqueIndex('fy_company_start_unique').on(t.companyId, t.startDate)
}));

export const accounts = pgTable('accounts', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  number: text('number').notNull(),
  name: text('name').notNull(),
  type: accountType('type').notNull(),
  vatCode: text('vat_code'),
  active: boolean('active').notNull().default(true)
}, (t) => ({
  uniqCompanyNumber: uniqueIndex('acc_company_number_unique').on(t.companyId, t.number)
}));

export const vouchers = pgTable('vouchers', {
  id: serial('id').primaryKey(),
  companyId: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  fiscalYearId: integer('fiscal_year_id').notNull().references(() => fiscalYears.id),
  series: text('series').notNull().default('A'),
  number: integer('number').notNull(),
  voucherDate: date('voucher_date').notNull(),
  description: text('description').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  postedAt: timestamp('posted_at', { withTimezone: true }),
  correctsVoucherId: integer('corrects_voucher_id')
}, (t) => ({
  uniqSeriesNumber: uniqueIndex('voucher_series_number_unique').on(t.companyId, t.fiscalYearId, t.series, t.number),
  byDate: index('voucher_date_idx').on(t.companyId, t.voucherDate)
}));

export const voucherLines = pgTable('voucher_lines', {
  id: serial('id').primaryKey(),
  voucherId: integer('voucher_id').notNull().references(() => vouchers.id, { onDelete: 'cascade' }),
  accountId: integer('account_id').notNull().references(() => accounts.id),
  debit: numeric('debit', { precision: 15, scale: 2 }).notNull().default('0'),
  credit: numeric('credit', { precision: 15, scale: 2 }).notNull().default('0'),
  description: text('description')
}, (t) => ({
  byVoucher: index('vl_voucher_idx').on(t.voucherId),
  byAccount: index('vl_account_idx').on(t.accountId)
}));

export const companiesRelations = relations(companies, ({ many }) => ({
  fiscalYears: many(fiscalYears),
  accounts: many(accounts),
  vouchers: many(vouchers)
}));

export const fiscalYearsRelations = relations(fiscalYears, ({ one, many }) => ({
  company: one(companies, { fields: [fiscalYears.companyId], references: [companies.id] }),
  vouchers: many(vouchers)
}));

export const accountsRelations = relations(accounts, ({ one, many }) => ({
  company: one(companies, { fields: [accounts.companyId], references: [companies.id] }),
  lines: many(voucherLines)
}));

export const vouchersRelations = relations(vouchers, ({ one, many }) => ({
  company: one(companies, { fields: [vouchers.companyId], references: [companies.id] }),
  fiscalYear: one(fiscalYears, { fields: [vouchers.fiscalYearId], references: [fiscalYears.id] }),
  lines: many(voucherLines)
}));

export const voucherLinesRelations = relations(voucherLines, ({ one }) => ({
  voucher: one(vouchers, { fields: [voucherLines.voucherId], references: [vouchers.id] }),
  account: one(accounts, { fields: [voucherLines.accountId], references: [accounts.id] })
}));
