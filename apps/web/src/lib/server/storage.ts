import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { env } from '$env/dynamic/private';

const DATA_DIR = env.BOOKSKY_DATA_DIR
  ? path.resolve(env.BOOKSKY_DATA_DIR)
  : path.resolve(process.cwd(), '../../data');

export async function saveAttachment(
  companyId: number,
  file: File
): Promise<{
  sha256: string;
  storagePath: string;
  sizeBytes: number;
  contentType: string;
  filename: string;
}> {
  const buf = Buffer.from(await file.arrayBuffer());
  const sha256 = createHash('sha256').update(buf).digest('hex');
  const dir = path.join(DATA_DIR, 'attachments', String(companyId));
  await fs.mkdir(dir, { recursive: true });
  const storagePath = path.join(String(companyId), sha256);
  const absolute = path.join(DATA_DIR, 'attachments', storagePath);
  try {
    await fs.access(absolute);
    // Finns redan (dedupe): hoppa över skrivning
  } catch {
    await fs.writeFile(absolute, buf);
  }
  return {
    sha256,
    storagePath,
    sizeBytes: buf.length,
    contentType: file.type || 'application/octet-stream',
    filename: file.name || 'bilaga'
  };
}

export async function readAttachment(storagePath: string): Promise<Buffer> {
  const safe = storagePath.replace(/\.\.+/g, '');
  const absolute = path.join(DATA_DIR, 'attachments', safe);
  return fs.readFile(absolute);
}
