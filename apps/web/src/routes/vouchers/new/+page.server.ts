import { db } from '$lib/server/db.js';
import { accounts, vouchers, voucherLines } from '@booksky/db';
import { validateVoucher, kronorToOre, oreToNumeric } from '@booksky/core';
import { eq, desc, max, and } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ parent }) => {
  const { company } = await parent();
  const acc = await db
    .select({ id: accounts.id, number: accounts.number, name: accounts.name })
    .from(accounts)
    .where(eq(accounts.companyId, company.id))
    .orderBy(accounts.number);
  return { accounts: acc, today: new Date().toISOString().slice(0, 10) };
};

export const actions: Actions = {
  default: async ({ request, parent }) => {
    const { company, fiscalYear } = await parent();
    const form = await request.formData();

    const voucherDate = String(form.get('voucherDate') ?? '');
    const description = String(form.get('description') ?? '');
    const post = form.get('post') === '1';

    // Parse rader: accountId_0, debit_0, credit_0, description_0 osv
    const lines: {
      accountId: number;
      debit: string;
      credit: string;
      description: string | null;
    }[] = [];
    for (let i = 0; i < 50; i++) {
      const accRaw = form.get(`accountId_${i}`);
      if (accRaw === null) break;
      const accId = Number(accRaw);
      const debit = String(form.get(`debit_${i}`) ?? '').trim();
      const credit = String(form.get(`credit_${i}`) ?? '').trim();
      const desc = String(form.get(`description_${i}`) ?? '').trim() || null;
      if (!accId && !debit && !credit) continue; // tom rad, hoppa över
      lines.push({ accountId: accId, debit, credit, description: desc });
    }

    const validation = validateVoucher({ voucherDate, description, lines });

    if (!validation.ok) {
      return fail(400, {
        errors: validation.errors,
        values: { voucherDate, description, lines }
      });
    }

    // Datumet måste ligga inom räkenskapsåret
    if (voucherDate < fiscalYear.startDate || voucherDate > fiscalYear.endDate) {
      return fail(400, {
        errors: [`Datumet måste ligga inom räkenskapsåret ${fiscalYear.startDate} – ${fiscalYear.endDate}`],
        values: { voucherDate, description, lines }
      });
    }

    const newId = await db.transaction(async (tx) => {
      // Nästa verifikationsnummer i serie A för detta räkenskapsår
      const [next] = await tx
        .select({ m: max(vouchers.number) })
        .from(vouchers)
        .where(
          and(
            eq(vouchers.companyId, company.id),
            eq(vouchers.fiscalYearId, fiscalYear.id),
            eq(vouchers.series, 'A')
          )
        );
      const nextNumber = (next?.m ?? 0) + 1;

      const [v] = await tx
        .insert(vouchers)
        .values({
          companyId: company.id,
          fiscalYearId: fiscalYear.id,
          series: 'A',
          number: nextNumber,
          voucherDate,
          description,
          postedAt: post ? new Date() : null
        })
        .returning({ id: vouchers.id });

      await tx.insert(voucherLines).values(
        lines.map((l) => ({
          voucherId: v.id,
          accountId: l.accountId,
          debit: oreToNumeric(kronorToOre(l.debit || '0')),
          credit: oreToNumeric(kronorToOre(l.credit || '0')),
          description: l.description
        }))
      );

      return v.id;
    });

    redirect(303, `/booksky/vouchers/${newId}`);
  }
};
