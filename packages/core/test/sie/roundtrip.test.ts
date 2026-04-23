import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseSie,
  encodeSie,
  decodeCp437,
  encodeCp437,
  tokenizeLine,
  type SieDocument
} from '../../src/sie/index.js';

// Minimal, syntetisk SIE-fil som täcker alla taggar vi stödjer.
const sample = [
  '#FLAGGA 0',
  '#PROGRAM "booksky" "0.1"',
  '#FORMAT UTF-8',
  '#GEN 20260423 "booksky"',
  '#SIETYP 4',
  '#FNAMN "Testbolaget AB"',
  '#ORGNR "556000-0000"',
  '#RAR 0 20260101 20261231',
  '#KONTO 1930 "Företagskonto"',
  '#KTYP 1930 T',
  '#KONTO 4010 "Inköp material"',
  '#KTYP 4010 K',
  '#IB 0 1930 1000.00',
  '#UB 0 1930 500.00',
  '#RES 0 4010 500.00',
  '#VER "A" "1" 20260115 "Första köp" 20260115 "jt"',
  '{',
  '#TRANS 4010 {} 500.00',
  '#TRANS 1930 {} -500.00',
  '}',
  ''
].join('\r\n');

test('parser: grundläggande taggar', () => {
  const { doc, warnings } = parseSie(sample);
  assert.equal(warnings.length, 0, `inga varningar, fick: ${warnings.join(', ')}`);
  assert.equal(doc.flagga, 0);
  assert.equal(doc.program?.name, 'booksky');
  assert.equal(doc.format, 'UTF-8');
  assert.equal(doc.sieType, 4);
  assert.equal(doc.companyName, 'Testbolaget AB');
  assert.equal(doc.orgNumber, '556000-0000');
  assert.equal(doc.fiscalYears[0].startDate, '2026-01-01');
  assert.equal(doc.fiscalYears[0].endDate, '2026-12-31');
  assert.equal(doc.accounts.length, 2);
  assert.equal(doc.accounts[0].number, '1930');
  assert.equal(doc.accounts[0].type, 'T');
  assert.equal(doc.incomingBalances[0].amount, '1000.00');
  assert.equal(doc.vouchers.length, 1);
  const v = doc.vouchers[0];
  assert.equal(v.series, 'A');
  assert.equal(v.number, '1');
  assert.equal(v.voucherDate, '2026-01-15');
  assert.equal(v.transactions.length, 2);
  assert.equal(v.transactions[0].account, '4010');
  assert.equal(v.transactions[0].amount, '500.00');
  assert.equal(v.transactions[1].amount, '-500.00');
});

test('round-trip: parse → encode → parse ger samma dokument', () => {
  const { doc: a } = parseSie(sample);
  const text = encodeSie(a, { format: 'UTF-8' });
  const { doc: b } = parseSie(text);

  const normalize = (d: SieDocument) => ({
    flagga: d.flagga,
    format: d.format,
    sieType: d.sieType,
    companyName: d.companyName,
    orgNumber: d.orgNumber,
    fiscalYears: d.fiscalYears,
    accounts: d.accounts,
    incomingBalances: d.incomingBalances,
    outgoingBalances: d.outgoingBalances,
    resultBalances: d.resultBalances,
    vouchers: d.vouchers.map((v) => ({
      series: v.series,
      number: v.number,
      voucherDate: v.voucherDate,
      description: v.description,
      transactions: v.transactions.map((t) => ({
        account: t.account,
        amount: t.amount,
        description: t.description
      }))
    }))
  });

  assert.deepEqual(normalize(b), normalize(a));
});

test('tokenizer: citerade strängar med escape', () => {
  const toks = tokenizeLine('#VER "A" "1" 20260115 "He sa \\"hej\\""');
  assert.equal(toks.length, 5);
  assert.deepEqual(toks[4], { kind: 'string', value: 'He sa "hej"' });
});

test('tokenizer: tom lista {} tolkas som lista', () => {
  const toks = tokenizeLine('#TRANS 1930 {} -500.00');
  assert.equal(toks.length, 4);
  assert.equal(toks[2].kind, 'list');
});

test('CP437 round-trip för åäö', () => {
  const text = 'Räkenskapsår för företaget';
  const bytes = encodeCp437(text);
  const back = decodeCp437(bytes);
  assert.equal(back, text);
});

test('CP437 bytes: å är 0x86, ä är 0x84, ö är 0x94', () => {
  const bytes = encodeCp437('åäö');
  assert.deepEqual([...bytes], [0x86, 0x84, 0x94]);
});

test('parser: normaliserar datum YYYYMMDD → YYYY-MM-DD', () => {
  const { doc } = parseSie('#RAR 0 20260101 20261231\r\n');
  assert.equal(doc.fiscalYears[0].startDate, '2026-01-01');
  assert.equal(doc.fiscalYears[0].endDate, '2026-12-31');
});

test('parser: okända taggar hamnar i unknown[]', () => {
  const { doc, warnings } = parseSie('#KPTYP NotReal foo\r\n');
  assert.equal(warnings.length, 0);
  assert.equal(doc.unknown.length, 1);
  assert.equal(doc.unknown[0].tag, '#KPTYP');
});

test('encoder: citerar strängar med whitespace', () => {
  const text = encodeSie({
    flagga: 0,
    fiscalYears: [],
    accounts: [{ number: '1930', name: 'Företagskonto SEB' }],
    incomingBalances: [],
    outgoingBalances: [],
    resultBalances: [],
    vouchers: [],
    unknown: []
  });
  assert.match(text, /#KONTO 1930 "Företagskonto SEB"/);
});
