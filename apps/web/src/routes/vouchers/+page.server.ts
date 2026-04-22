import { db } from '$lib/server/db.js';
import { vouchers, voucherLines } from '@booksky/db';
import { eq, desc, sql } from 'drizzle-orm';
import { numericToOre } from '@booksky/core';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ parent }) => {
  const { company } = await parent();

  const rows = await db
    .select({
      id: vouchers.id,
      series: vouchers.series,
      number: vouchers.number,
      voucherDate: vouchers.voucherDate,
      description: vouchers.description,
      postedAt: vouchers.postedAt,
      total: sql<string>`coalesce(sum(${voucherLines.debit}), '0')`
    })
    .from(vouchers)
    .leftJoin(voucherLines, eq(voucherLines.voucherId, vouchers.id))
    .where(eq(vouchers.companyId, company.id))
    .groupBy(vouchers.id)
    .orderBy(desc(vouchers.voucherDate), desc(vouchers.number));

  return {
    vouchers: rows.map((r) => ({ ...r, totalOre: numericToOre(r.total) }))
  };
};
