import { db } from '$lib/server/db.js';
import { vouchers, voucherLines, accounts } from '@booksky/db';
import { eq, and } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { numericToOre } from '@booksky/core';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ params, parent }) => {
  const { company } = await parent();
  const id = Number(params.id);
  if (!Number.isFinite(id)) error(404);

  const [v] = await db
    .select()
    .from(vouchers)
    .where(and(eq(vouchers.id, id), eq(vouchers.companyId, company.id)));
  if (!v) error(404);

  const lines = await db
    .select({
      id: voucherLines.id,
      accountNumber: accounts.number,
      accountName: accounts.name,
      debit: voucherLines.debit,
      credit: voucherLines.credit,
      description: voucherLines.description
    })
    .from(voucherLines)
    .innerJoin(accounts, eq(accounts.id, voucherLines.accountId))
    .where(eq(voucherLines.voucherId, id))
    .orderBy(voucherLines.id);

  return {
    voucher: v,
    lines: lines.map((l) => ({
      ...l,
      debitOre: numericToOre(l.debit),
      creditOre: numericToOre(l.credit)
    }))
  };
};

export const actions: Actions = {
  post: async ({ params, parent }) => {
    const { company } = await parent();
    const id = Number(params.id);
    const [v] = await db
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.id, id), eq(vouchers.companyId, company.id)));
    if (!v) return fail(404);
    if (v.postedAt) return fail(400, { message: 'Redan bokförd' });

    await db.update(vouchers).set({ postedAt: new Date() }).where(eq(vouchers.id, id));
    redirect(303, `/booksky/vouchers/${id}`);
  }
};
