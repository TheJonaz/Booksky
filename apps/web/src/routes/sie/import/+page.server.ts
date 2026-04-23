import { db } from '$lib/server/db.js';
import { sie } from '@booksky/core';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types.js';

export const load: PageServerLoad = async ({ parent }) => {
  await parent();
  return {};
};

async function readFileFromForm(form: FormData): Promise<{ bytes: Uint8Array; filename: string } | null> {
  const file = form.get('file');
  if (file instanceof File && file.size > 0) {
    return { bytes: new Uint8Array(await file.arrayBuffer()), filename: file.name };
  }
  // På confirm-steget skickas filen som base64 i ett hidden-fält
  const b64 = form.get('fileB64');
  const filename = String(form.get('filename') ?? 'upload.se');
  if (typeof b64 === 'string' && b64.length > 0) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return { bytes, filename };
  }
  return null;
}

export const actions: Actions = {
  preview: async ({ request, parent }) => {
    const { company, fiscalYear } = await parent();
    const form = await request.formData();
    const file = await readFileFromForm(form);
    if (!file) return fail(400, { error: 'Ingen fil vald' });

    const text = sie.decodeSieBytes(file.bytes);
    const { doc, warnings } = sie.parseSie(text);
    const preview = await sie.previewImport(db, doc, {
      companyId: company.id,
      fiscalYearId: fiscalYear.id
    });

    let binary = '';
    for (const b of file.bytes) binary += String.fromCharCode(b);
    const fileB64 = btoa(binary);

    return {
      step: 'preview' as const,
      preview,
      warnings,
      filename: file.filename,
      fileB64,
      companyName: doc.companyName,
      orgNumber: doc.orgNumber,
      sieType: doc.sieType
    };
  },

  confirm: async ({ request, parent }) => {
    const { company, fiscalYear } = await parent();
    const form = await request.formData();
    const file = await readFileFromForm(form);
    if (!file) return fail(400, { error: 'Fil saknas i confirm-steget' });

    const text = sie.decodeSieBytes(file.bytes);
    const { doc } = sie.parseSie(text);
    const result = await sie.importSieDocument(db, doc, {
      companyId: company.id,
      fiscalYearId: fiscalYear.id,
      series: 'I'
    });

    return { step: 'done' as const, result };
  }
};
