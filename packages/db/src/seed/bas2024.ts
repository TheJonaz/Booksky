import type { accountType } from '../schema.js';

type AccType = (typeof accountType.enumValues)[number];

export interface BasAccount {
  number: string;
  name: string;
  type: AccType;
  vatCode?: string;
}

// Urval av BAS 2024 — kärnkonton för enskild firma och mindre AB.
// Utökas vid behov.
export const BAS_CORE: BasAccount[] = [
  // 1xxx Tillgångar
  { number: '1220', name: 'Inventarier och verktyg', type: 'asset' },
  { number: '1229', name: 'Ackumulerade avskrivningar på inventarier', type: 'asset' },
  { number: '1510', name: 'Kundfordringar', type: 'asset' },
  { number: '1630', name: 'Avräkning skatter och avgifter (skattekonto)', type: 'asset' },
  { number: '1650', name: 'Momsfordran', type: 'asset' },
  { number: '1910', name: 'Kassa', type: 'asset' },
  { number: '1930', name: 'Företagskonto/checkkonto/affärskonto', type: 'asset' },
  { number: '1940', name: 'Övriga bankkonton', type: 'asset' },

  // 2xxx Eget kapital & skulder
  { number: '2010', name: 'Eget kapital, delägare 1 (EF)', type: 'equity' },
  { number: '2011', name: 'Egna varuuttag (EF)', type: 'equity' },
  { number: '2012', name: 'Avräkning för skatter och avgifter (EF)', type: 'equity' },
  { number: '2013', name: 'Övriga egna uttag (EF)', type: 'equity' },
  { number: '2018', name: 'Övriga egna insättningar (EF)', type: 'equity' },
  { number: '2019', name: 'Årets resultat (EF)', type: 'equity' },
  { number: '2081', name: 'Aktiekapital', type: 'equity' },
  { number: '2091', name: 'Balanserat resultat', type: 'equity' },
  { number: '2098', name: 'Vinst eller förlust från föregående år', type: 'equity' },
  { number: '2099', name: 'Årets resultat', type: 'equity' },
  { number: '2440', name: 'Leverantörsskulder', type: 'liability' },
  { number: '2510', name: 'Skatteskulder', type: 'liability' },
  { number: '2610', name: 'Utgående moms 25 %', type: 'liability', vatCode: 'MP1' },
  { number: '2611', name: 'Utgående moms varor/tjänster Sverige 25 %', type: 'liability', vatCode: 'MP1' },
  { number: '2620', name: 'Utgående moms 12 %', type: 'liability', vatCode: 'MP2' },
  { number: '2630', name: 'Utgående moms 6 %', type: 'liability', vatCode: 'MP3' },
  { number: '2640', name: 'Ingående moms', type: 'asset', vatCode: 'MI' },
  { number: '2641', name: 'Debiterad ingående moms', type: 'asset', vatCode: 'MI' },
  { number: '2650', name: 'Redovisningskonto för moms', type: 'liability' },
  { number: '2710', name: 'Personalens källskatt', type: 'liability' },
  { number: '2730', name: 'Lagstadgade sociala avgifter', type: 'liability' },

  // 3xxx Intäkter
  { number: '3001', name: 'Försäljning varor/tjänster Sverige 25 % moms', type: 'income' },
  { number: '3002', name: 'Försäljning varor/tjänster Sverige 12 % moms', type: 'income' },
  { number: '3003', name: 'Försäljning varor/tjänster Sverige 6 % moms', type: 'income' },
  { number: '3041', name: 'Försäljning tjänster utanför Sverige, EU', type: 'income' },
  { number: '3045', name: 'Försäljning tjänster till land utanför EU', type: 'income' },
  { number: '3740', name: 'Öres- och kronutjämning', type: 'income' },

  // 4xxx Varor/material
  { number: '4010', name: 'Inköp av varor och material', type: 'expense' },

  // 5xxx-6xxx Externa kostnader
  { number: '5010', name: 'Lokalhyra', type: 'expense' },
  { number: '5410', name: 'Förbrukningsinventarier', type: 'expense' },
  { number: '5420', name: 'Programvaror', type: 'expense' },
  { number: '5611', name: 'Drivmedel för personbilar', type: 'expense' },
  { number: '5800', name: 'Resekostnader', type: 'expense' },
  { number: '6110', name: 'Kontorsmateriel', type: 'expense' },
  { number: '6212', name: 'Mobiltelefon', type: 'expense' },
  { number: '6230', name: 'Datakommunikation', type: 'expense' },
  { number: '6310', name: 'Företagsförsäkringar', type: 'expense' },
  { number: '6540', name: 'IT-tjänster', type: 'expense' },
  { number: '6570', name: 'Bankkostnader', type: 'expense' },
  { number: '6990', name: 'Övriga externa kostnader', type: 'expense' },

  // 7xxx Personal
  { number: '7010', name: 'Löner till tjänstemän', type: 'expense' },
  { number: '7510', name: 'Lagstadgade sociala avgifter', type: 'expense' },
  { number: '7832', name: 'Avskrivningar på inventarier och verktyg', type: 'expense' },

  // 8xxx Finansiella poster och resultat
  { number: '8310', name: 'Ränteintäkter från bank', type: 'income' },
  { number: '8410', name: 'Räntekostnader', type: 'expense' },
  { number: '8910', name: 'Skatt som belastar årets resultat', type: 'expense' },
  { number: '8999', name: 'Årets resultat', type: 'equity' }
];
