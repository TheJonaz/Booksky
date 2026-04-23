// SIE 4B-encoder. Tar ett SieDocument och producerar filens textinnehåll.
// Anroparen väljer output-encoding (PC8/UTF-8) via encodeCp437 eller vanlig
// UTF-8-TextEncoder.

import type { SieDocument } from './types.js';

/** YYYY-MM-DD -> YYYYMMDD. Returnerar tom sträng om input är tom. */
function sieDate(d: string | undefined): string {
  if (!d) return '';
  return d.replace(/-/g, '');
}

/** Citera sträng om den innehåller whitespace, '{', '}' eller '"'. */
function quote(s: string | undefined | null): string {
  const v = s ?? '';
  if (v === '') return '""';
  if (/[\s"{}]/.test(v)) {
    return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  }
  return v;
}

function sieAmount(a: string): string {
  // Vårt kanoniska format "123.45" matchar redan SIE (punkt som decimaltecken).
  return a;
}

export interface EncodeOptions {
  /** Sätter raden '#FORMAT UTF-8' (default: 'PC8'). */
  format?: 'PC8' | 'UTF-8';
  /** Program-metadata. Default: "booksky" + version "0.1". */
  program?: { name: string; version: string };
}

export function encodeSie(doc: SieDocument, opts: EncodeOptions = {}): string {
  const out: string[] = [];
  const format = opts.format ?? doc.format ?? 'PC8';
  const prog = opts.program ?? doc.program ?? { name: 'booksky', version: '0.1' };

  out.push(`#FLAGGA ${doc.flagga}`);
  out.push(`#PROGRAM ${quote(prog.name)} ${quote(prog.version)}`);
  out.push(`#FORMAT ${format}`);
  if (doc.generated) {
    out.push(
      doc.generated.sign
        ? `#GEN ${sieDate(doc.generated.date)} ${quote(doc.generated.sign)}`
        : `#GEN ${sieDate(doc.generated.date)}`
    );
  }
  if (doc.sieType) out.push(`#SIETYP ${doc.sieType}`);
  if (doc.companyName) out.push(`#FNAMN ${quote(doc.companyName)}`);
  if (doc.orgNumber) out.push(`#ORGNR ${quote(doc.orgNumber)}`);

  for (const fy of doc.fiscalYears) {
    out.push(`#RAR ${fy.yearOffset} ${sieDate(fy.startDate)} ${sieDate(fy.endDate)}`);
  }
  for (const acc of doc.accounts) {
    out.push(`#KONTO ${quote(acc.number)} ${quote(acc.name)}`);
    if (acc.type) out.push(`#KTYP ${quote(acc.number)} ${acc.type}`);
    if (acc.sru) out.push(`#SRU ${quote(acc.number)} ${quote(acc.sru)}`);
  }
  for (const b of doc.incomingBalances) {
    out.push(`#IB ${b.yearOffset} ${quote(b.account)} ${sieAmount(b.amount)}`);
  }
  for (const b of doc.outgoingBalances) {
    out.push(`#UB ${b.yearOffset} ${quote(b.account)} ${sieAmount(b.amount)}`);
  }
  for (const b of doc.resultBalances) {
    out.push(`#RES ${b.yearOffset} ${quote(b.account)} ${sieAmount(b.amount)}`);
  }

  for (const v of doc.vouchers) {
    const head: string[] = [
      '#VER',
      quote(v.series),
      quote(v.number ?? ''),
      sieDate(v.voucherDate),
      quote(v.description ?? '')
    ];
    if (v.regDate) head.push(sieDate(v.regDate));
    if (v.sign) head.push(quote(v.sign));
    out.push(head.join(' '));
    out.push('{');
    for (const t of v.transactions) {
      const parts: string[] = ['#TRANS', quote(t.account), '{}', sieAmount(t.amount)];
      if (t.transDate) parts.push(sieDate(t.transDate));
      if (t.description !== undefined) parts.push(quote(t.description));
      if (t.quantity !== undefined) parts.push(quote(t.quantity));
      if (t.sign !== undefined) parts.push(quote(t.sign));
      out.push(parts.join(' '));
    }
    out.push('}');
  }

  return out.join('\r\n') + '\r\n';
}
