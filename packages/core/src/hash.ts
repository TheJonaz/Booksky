import { createHash } from 'node:crypto';

export interface VoucherHashInput {
  series: string;
  number: number;
  voucherDate: string;
  description: string;
  correctsVoucherId: number | null;
  lines: {
    accountNumber: string;
    debit: string; // kanoniskt decimalformat "123.45"
    credit: string;
    description: string | null;
  }[];
}

// Kanonisk serialisering: stabil ordning av nycklar, rader redan i inmatningsordning.
export function canonicalVoucherPayload(v: VoucherHashInput): string {
  return JSON.stringify({
    s: v.series,
    n: v.number,
    d: v.voucherDate,
    t: v.description,
    c: v.correctsVoucherId,
    l: v.lines.map((l) => ({ a: l.accountNumber, d: l.debit, c: l.credit, t: l.description }))
  });
}

export function computeVoucherHash(prevHash: string | null, v: VoucherHashInput): string {
  const h = createHash('sha256');
  h.update(prevHash ?? 'GENESIS');
  h.update('\n');
  h.update(canonicalVoucherPayload(v));
  return h.digest('hex');
}
