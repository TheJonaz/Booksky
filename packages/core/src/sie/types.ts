// Typer för en SIE 4-fil (sie.se, Formatspecifikation version 4B, 2008).
// Belopp lagras som strängar i kanoniskt decimalformat "123.45" för att
// matcha hur posting/hash-kedjan serialiserar värden.

export type SieType = 1 | 2 | 3 | 4;

export interface SieAccount {
  number: string;
  name: string;
  /** KTYP: T=Tillgång, S=Skuld, I=Intäkt, K=Kostnad */
  type?: 'T' | 'S' | 'I' | 'K';
  /** SRU-kod (valfritt) */
  sru?: string;
}

export interface SieFiscalYear {
  /** RAR-offset: 0 = innevarande år, -1 = föregående, etc. */
  yearOffset: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
}

export interface SieBalance {
  yearOffset: number;
  account: string;
  amount: string; // kronor, kanoniskt "123.45"
}

export interface SieTransaction {
  account: string;
  amount: string; // positivt = debet, negativt = kredit (SIE-konvention)
  transDate?: string;  // YYYY-MM-DD (valfritt, ärvs från verifikationen)
  description?: string;
  quantity?: string;
  sign?: string;
}

export interface SieVoucher {
  series: string;
  number?: string; // SIE tillåter tom/autogenererad
  voucherDate: string; // YYYY-MM-DD
  description?: string;
  regDate?: string; // YYYY-MM-DD
  sign?: string;
  transactions: SieTransaction[];
}

export interface SieDocument {
  flagga: 0 | 1;
  program?: { name: string; version: string };
  format?: 'PC8' | 'UTF-8';
  generated?: { date: string; sign?: string };
  sieType?: SieType;
  companyName?: string;
  orgNumber?: string;
  fiscalYears: SieFiscalYear[];
  accounts: SieAccount[];
  incomingBalances: SieBalance[];
  outgoingBalances: SieBalance[];
  resultBalances: SieBalance[];
  vouchers: SieVoucher[];
  /** Okända/ohanterade taggar — sparas för robusthet och round-trip. */
  unknown: { tag: string; raw: string }[];
}

export function emptyDocument(): SieDocument {
  return {
    flagga: 0,
    fiscalYears: [],
    accounts: [],
    incomingBalances: [],
    outgoingBalances: [],
    resultBalances: [],
    vouchers: [],
    unknown: []
  };
}
