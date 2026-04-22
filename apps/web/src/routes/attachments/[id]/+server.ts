import { db } from '$lib/server/db.js';
import { attachments } from '@booksky/db';
import { readAttachment } from '$lib/server/storage.js';
import { and, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getDefaultCompany } from '$lib/server/company.js';
import type { RequestHandler } from './$types.js';

export const GET: RequestHandler = async ({ params, url }) => {
  const company = await getDefaultCompany();
  const id = Number(params.id);
  if (!Number.isFinite(id)) error(404);
  const [a] = await db
    .select()
    .from(attachments)
    .where(and(eq(attachments.id, id), eq(attachments.companyId, company.id)));
  if (!a) error(404);

  const data = await readAttachment(a.storagePath);
  const disposition = url.searchParams.has('download') ? 'attachment' : 'inline';
  return new Response(data, {
    headers: {
      'Content-Type': a.contentType,
      'Content-Disposition': `${disposition}; filename="${encodeURIComponent(a.filename)}"`,
      'Cache-Control': 'private, max-age=3600'
    }
  });
};
