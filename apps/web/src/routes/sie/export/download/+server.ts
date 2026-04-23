import { db } from '$lib/server/db.js';
import { getDefaultCompany } from '$lib/server/company.js';
import { sie } from '@booksky/core';
import { fiscalYears } from '@booksky/db';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ url }) => {
  const fiscalYearId = Number(url.searchParams.get('fiscalYearId'));
  const rawType = Number(url.searchParams.get('sieType') ?? '4');
  const sieType = ([1, 2, 3, 4].includes(rawType) ? rawType : 4) as 1 | 2 | 3 | 4;
  const format = url.searchParams.get('format') === 'UTF-8' ? 'UTF-8' : 'PC8';
  const postedOnly = url.searchParams.get('postedOnly') === '1';

  if (!fiscalYearId) throw error(400, 'fiscalYearId saknas');

  const company = await getDefaultCompany();
  const [fy] = await db.select().from(fiscalYears).where(eq(fiscalYears.id, fiscalYearId));
  if (!fy || fy.companyId !== company.id) throw error(404, 'Räkenskapsår saknas');

  const doc = await sie.buildSieDocument(db, {
    companyId: company.id,
    fiscalYearId,
    sieType,
    postedOnly
  });
  const text = sie.encodeSie(doc, { format });
  const bytes = format === 'UTF-8' ? new TextEncoder().encode(text) : sie.encodeCp437(text);

  const filename = `booksky_${company.orgNumber}_${fy.startDate.slice(0, 4)}_typ${sieType}.se`;

  const body = new Uint8Array(bytes).buffer;
  return new Response(body, {
    headers: {
      'content-type': 'application/octet-stream',
      'content-disposition': `attachment; filename="${filename}"`,
      'content-length': String(body.byteLength)
    }
  });
};
