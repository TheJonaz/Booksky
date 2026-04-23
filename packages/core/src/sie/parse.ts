// SIE 4B-parser. Tolkar en hel fil (texten) till ett SieDocument.
// Hanterar typ 1–4. Okända taggar sparas i unknown[] för round-trip.

import { tokenizeLine, asString, type SieToken } from './tokenize.js';
import {
  emptyDocument,
  type SieDocument,
  type SieVoucher,
  type SieTransaction,
  type SieType
} from './types.js';

/** YYYYMMDD -> YYYY-MM-DD. Tomma strängar bevaras. */
function normalizeDate(raw: string | undefined): string {
  if (!raw) return '';
  const s = raw.trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  return s;
}

/** Kanoniskt belopp: bevarar tecken, två decimaler ("1234.50"). */
function normalizeAmount(raw: string | undefined): string {
  if (!raw) return '0.00';
  const s = raw.trim().replace(',', '.');
  const num = Number(s);
  if (!Number.isFinite(num)) return '0.00';
  const neg = num < 0;
  const abs = Math.abs(num);
  const whole = Math.floor(abs);
  const frac = Math.round((abs - whole) * 100);
  return `${neg ? '-' : ''}${whole}.${frac.toString().padStart(2, '0')}`;
}

export interface ParseResult {
  doc: SieDocument;
  warnings: string[];
}

export function parseSie(text: string): ParseResult {
  const doc = emptyDocument();
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/);

  let inVerBlock = false;
  let currentVoucher: SieVoucher | null = null;

  const finishVoucher = () => {
    if (currentVoucher) {
      doc.vouchers.push(currentVoucher);
      currentVoucher = null;
    }
    inVerBlock = false;
  };

  for (let idx = 0; idx < lines.length; idx++) {
    const raw = lines[idx];
    const line = raw.trim();
    if (!line) continue;

    // Block-kontroller: '{' öppnar transaktionslista efter #VER.
    if (line === '{') {
      if (currentVoucher) inVerBlock = true;
      else warnings.push(`Rad ${idx + 1}: '{' utan #VER`);
      continue;
    }
    if (line === '}') {
      if (inVerBlock) finishVoucher();
      continue;
    }

    if (!line.startsWith('#')) {
      warnings.push(`Rad ${idx + 1}: ignorerar rad utan tagg: ${line}`);
      continue;
    }

    const tokens = tokenizeLine(line);
    const tag = (tokens[0] as { kind: 'word'; value: string }).value;
    const rest = tokens.slice(1);

    if (inVerBlock && tag === '#TRANS') {
      const tr = parseTrans(rest);
      if (tr && currentVoucher) currentVoucher.transactions.push(tr);
      continue;
    }

    // Utanför block → stäng ev. pågående verifikation (tolerant)
    if (currentVoucher && tag !== '#TRANS') {
      if (tag !== '#VER' && !inVerBlock) {
        // Vissa producenter lägger rader mellan #VER och '{' — men vi har
        // redan checkat '{'. Säkraste: avsluta om nästa tagg inte är #VER.
      }
    }

    switch (tag) {
      case '#FLAGGA':
        doc.flagga = asString(rest[0]) === '1' ? 1 : 0;
        break;
      case '#PROGRAM':
        doc.program = {
          name: asString(rest[0]) ?? '',
          version: asString(rest[1]) ?? ''
        };
        break;
      case '#FORMAT': {
        const v = (asString(rest[0]) ?? 'PC8').toUpperCase();
        doc.format = v === 'UTF-8' || v === 'UTF8' ? 'UTF-8' : 'PC8';
        break;
      }
      case '#GEN':
        doc.generated = {
          date: normalizeDate(asString(rest[0])),
          sign: asString(rest[1])
        };
        break;
      case '#SIETYP': {
        const n = Number(asString(rest[0]));
        if (n >= 1 && n <= 4) doc.sieType = n as SieType;
        break;
      }
      case '#FNAMN':
        doc.companyName = asString(rest[0]);
        break;
      case '#ORGNR':
        doc.orgNumber = asString(rest[0]);
        break;
      case '#RAR': {
        const yearOffset = Number(asString(rest[0]) ?? '0');
        doc.fiscalYears.push({
          yearOffset,
          startDate: normalizeDate(asString(rest[1])),
          endDate: normalizeDate(asString(rest[2]))
        });
        break;
      }
      case '#KONTO':
        doc.accounts.push({
          number: asString(rest[0]) ?? '',
          name: asString(rest[1]) ?? ''
        });
        break;
      case '#KTYP': {
        const accNo = asString(rest[0]);
        const type = (asString(rest[1]) ?? '').toUpperCase();
        const acc = doc.accounts.find((a) => a.number === accNo);
        if (acc && (type === 'T' || type === 'S' || type === 'I' || type === 'K')) {
          acc.type = type;
        }
        break;
      }
      case '#SRU': {
        const accNo = asString(rest[0]);
        const sru = asString(rest[1]);
        const acc = doc.accounts.find((a) => a.number === accNo);
        if (acc) acc.sru = sru;
        break;
      }
      case '#IB':
        doc.incomingBalances.push({
          yearOffset: Number(asString(rest[0]) ?? '0'),
          account: asString(rest[1]) ?? '',
          amount: normalizeAmount(asString(rest[2]))
        });
        break;
      case '#UB':
        doc.outgoingBalances.push({
          yearOffset: Number(asString(rest[0]) ?? '0'),
          account: asString(rest[1]) ?? '',
          amount: normalizeAmount(asString(rest[2]))
        });
        break;
      case '#RES':
        doc.resultBalances.push({
          yearOffset: Number(asString(rest[0]) ?? '0'),
          account: asString(rest[1]) ?? '',
          amount: normalizeAmount(asString(rest[2]))
        });
        break;
      case '#VER': {
        finishVoucher();
        currentVoucher = {
          series: asString(rest[0]) ?? '',
          number: asString(rest[1]),
          voucherDate: normalizeDate(asString(rest[2])),
          description: asString(rest[3]),
          regDate: normalizeDate(asString(rest[4])),
          sign: asString(rest[5]),
          transactions: []
        };
        break;
      }
      default:
        doc.unknown.push({ tag, raw: line });
    }
  }

  finishVoucher();
  return { doc, warnings };
}

function parseTrans(rest: SieToken[]): SieTransaction | null {
  // #TRANS account {objects} amount [transdate] [desc] [quantity] [sign]
  const account = asString(rest[0]);
  if (!account) return null;
  // rest[1] är {...}-listan. Vi sparar inte dimensioner i datamodellen just nu.
  let i = 1;
  if (rest[i]?.kind === 'list') i++;
  const amount = normalizeAmount(asString(rest[i++]));
  const transDate = normalizeDate(asString(rest[i++]));
  const description = asString(rest[i++]);
  const quantity = asString(rest[i++]);
  const sign = asString(rest[i++]);
  return {
    account,
    amount,
    transDate: transDate || undefined,
    description,
    quantity,
    sign
  };
}
