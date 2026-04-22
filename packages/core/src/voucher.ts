import { kronorToOre, type Ore } from './money.js';

export interface VoucherLineInput {
  accountId: number;
  debit: string; // kronor som "123,45" eller "123.45"
  credit: string;
  description?: string | null;
}

export interface VoucherDraft {
  voucherDate: string; // YYYY-MM-DD
  description: string;
  lines: VoucherLineInput[];
}

export interface VoucherValidation {
  ok: boolean;
  totalDebit: Ore;
  totalCredit: Ore;
  errors: string[];
}

export function validateVoucher(draft: VoucherDraft): VoucherValidation {
  const errors: string[] = [];
  if (!draft.voucherDate) errors.push('Datum saknas');
  if (!draft.description?.trim()) errors.push('Beskrivning saknas');
  if (draft.lines.length < 2) errors.push('Minst två rader krävs för dubbel bokföring');

  let totalDebit: Ore = 0;
  let totalCredit: Ore = 0;

  for (const [i, line] of draft.lines.entries()) {
    const d = kronorToOre(line.debit || '0');
    const c = kronorToOre(line.credit || '0');
    if (d < 0 || c < 0) errors.push(`Rad ${i + 1}: belopp får inte vara negativt`);
    if (d > 0 && c > 0) errors.push(`Rad ${i + 1}: endast debet ELLER kredit`);
    if (d === 0 && c === 0) errors.push(`Rad ${i + 1}: belopp saknas`);
    if (!line.accountId) errors.push(`Rad ${i + 1}: konto saknas`);
    totalDebit += d;
    totalCredit += c;
  }

  if (totalDebit !== totalCredit) {
    errors.push(`Obalans: debet ${totalDebit / 100} ≠ kredit ${totalCredit / 100}`);
  }
  if (totalDebit === 0) {
    errors.push('Summan får inte vara noll');
  }

  return { ok: errors.length === 0, totalDebit, totalCredit, errors };
}
