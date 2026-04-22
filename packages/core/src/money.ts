// Öre-baserad heltalsaritmetik för pengar. Undviker float-fel.

export type Ore = number; // belopp i ören (1 kr = 100 ören)

export function kronorToOre(kr: string | number): Ore {
  const s = typeof kr === 'number' ? kr.toString() : kr.trim().replace(',', '.');
  if (!s) return 0;
  const [whole, frac = ''] = s.split('.');
  const fracPadded = (frac + '00').slice(0, 2);
  const sign = whole.startsWith('-') ? -1 : 1;
  const wholeAbs = whole.replace('-', '') || '0';
  return sign * (parseInt(wholeAbs, 10) * 100 + parseInt(fracPadded || '0', 10));
}

export function oreToKronor(ore: Ore): string {
  const sign = ore < 0 ? '-' : '';
  const abs = Math.abs(ore);
  const kr = Math.floor(abs / 100);
  const o = abs % 100;
  return `${sign}${kr}.${o.toString().padStart(2, '0')}`;
}

export function formatKronor(ore: Ore): string {
  const sign = ore < 0 ? '-' : '';
  const abs = Math.abs(ore);
  const kr = Math.floor(abs / 100);
  const o = abs % 100;
  const krStr = kr.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${sign}${krStr},${o.toString().padStart(2, '0')}`;
}

// Drizzle numeric -> ören
export function numericToOre(n: string | null | undefined): Ore {
  if (!n) return 0;
  return kronorToOre(n);
}

// Ören -> Drizzle numeric string
export function oreToNumeric(ore: Ore): string {
  return oreToKronor(ore);
}
