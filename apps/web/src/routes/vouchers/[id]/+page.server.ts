import { db } from '$lib/server/db.js';
import { vouchers, voucherLines, accounts, attachments, auditLog } from '@booksky/db';
import { eq, and, desc, max } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { numericToOre, postVoucher, oreToNumeric } from '@booksky/core';
import { saveAttachment } from '$lib/server/storage.js';
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

  const files = await db
    .select({
      id: attachments.id,
      filename: attachments.filename,
      contentType: attachments.contentType,
      sizeBytes: attachments.sizeBytes,
      sha256: attachments.sha256,
      createdAt: attachments.createdAt
    })
    .from(attachments)
    .where(eq(attachments.voucherId, id))
    .orderBy(attachments.id);

  // Vad rättar denna? Och vilka rättelser finns mot denna?
  const corrects = v.correctsVoucherId
    ? (await db
        .select({ id: vouchers.id, series: vouchers.series, number: vouchers.number })
        .from(vouchers)
        .where(eq(vouchers.id, v.correctsVoucherId)))[0] ?? null
    : null;

  const correctedBy = await db
    .select({ id: vouchers.id, series: vouchers.series, number: vouchers.number, voucherDate: vouchers.voucherDate })
    .from(vouchers)
    .where(eq(vouchers.correctsVoucherId, id));

  const audit = await db
    .select()
    .from(auditLog)
    .where(and(eq(auditLog.entityType, 'voucher'), eq(auditLog.entityId, id), eq(auditLog.companyId, company.id)))
    .orderBy(desc(auditLog.createdAt));

  return {
    voucher: v,
    lines: lines.map((l) => ({
      ...l,
      debitOre: numericToOre(l.debit),
      creditOre: numericToOre(l.credit)
    })),
    attachments: files,
    corrects,
    correctedBy,
    audit
  };
};

export const actions: Actions = {
  post: async ({ params, parent }) => {
    const { company } = await parent();
    const id = Number(params.id);
    try {
      await postVoucher(db, { voucherId: id, companyId: company.id });
    } catch (e: any) {
      return fail(400, { message: e.message ?? 'Kunde inte bokföra' });
    }
    redirect(303, `/booksky/vouchers/${id}`);
  },

  upload: async ({ params, request, parent }) => {
    const { company } = await parent();
    const id = Number(params.id);
    const [v] = await db
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.id, id), eq(vouchers.companyId, company.id)));
    if (!v) return fail(404);
    if (v.postedAt) return fail(400, { message: 'Kan inte ladda upp på bokförd verifikation' });

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return fail(400, { message: 'Ingen fil vald' });
    }

    const saved = await saveAttachment(company.id, file);
    await db.insert(attachments).values({
      companyId: company.id,
      voucherId: id,
      filename: saved.filename,
      contentType: saved.contentType,
      sizeBytes: saved.sizeBytes,
      sha256: saved.sha256,
      storagePath: saved.storagePath
    });
    await db.insert(auditLog).values({
      companyId: company.id,
      entityType: 'voucher',
      entityId: id,
      action: 'attach',
      payload: { filename: saved.filename, sha256: saved.sha256, sizeBytes: saved.sizeBytes }
    });
  },

  correct: async ({ params, parent }) => {
    const { company, fiscalYear } = await parent();
    const id = Number(params.id);
    const [v] = await db
      .select()
      .from(vouchers)
      .where(and(eq(vouchers.id, id), eq(vouchers.companyId, company.id)));
    if (!v) return fail(404);
    if (!v.postedAt) return fail(400, { message: 'Endast bokförda verifikationer kan rättas' });

    const origLines = await db
      .select()
      .from(voucherLines)
      .where(eq(voucherLines.voucherId, id))
      .orderBy(voucherLines.id);

    const newId = await db.transaction(async (tx) => {
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

      const [nv] = await tx
        .insert(vouchers)
        .values({
          companyId: company.id,
          fiscalYearId: fiscalYear.id,
          series: 'A',
          number: nextNumber,
          voucherDate: new Date().toISOString().slice(0, 10),
          description: `Rättelse av ${v.series}${v.number}: ${v.description}`,
          correctsVoucherId: v.id
        })
        .returning({ id: vouchers.id });

      // Motbokning: byt debet ↔ kredit
      await tx.insert(voucherLines).values(
        origLines.map((l) => ({
          voucherId: nv.id,
          accountId: l.accountId,
          debit: oreToNumeric(numericToOre(l.credit)),
          credit: oreToNumeric(numericToOre(l.debit)),
          description: l.description
        }))
      );

      await tx.insert(auditLog).values({
        companyId: company.id,
        entityType: 'voucher',
        entityId: nv.id,
        action: 'create_correction',
        payload: { correctsVoucherId: v.id }
      });

      return nv.id;
    });

    redirect(303, `/booksky/vouchers/${newId}`);
  }
};
