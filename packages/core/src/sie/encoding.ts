// CP437 (IBM PC-8) <-> Unicode.
// SIE 4B §3.3: "PC8 teckentabell" = CP437. Vissa program skickar UTF-8 och
// signalerar med #FORMAT UTF-8. Vi stödjer båda — default vid läsning styrs
// av #FORMAT-raden eller BOM.

// Standardmappning 0x80–0xFF enligt CP437.
// Se https://en.wikipedia.org/wiki/Code_page_437
const CP437_UPPER: string[] = [
  'Ç', 'ü', 'é', 'â', 'ä', 'à', 'å', 'ç', 'ê', 'ë', 'è', 'ï', 'î', 'ì', 'Ä', 'Å',
  'É', 'æ', 'Æ', 'ô', 'ö', 'ò', 'û', 'ù', 'ÿ', 'Ö', 'Ü', '¢', '£', '¥', '₧', 'ƒ',
  'á', 'í', 'ó', 'ú', 'ñ', 'Ñ', 'ª', 'º', '¿', '⌐', '¬', '½', '¼', '¡', '«', '»',
  '░', '▒', '▓', '│', '┤', '╡', '╢', '╖', '╕', '╣', '║', '╗', '╝', '╜', '╛', '┐',
  '└', '┴', '┬', '├', '─', '┼', '╞', '╟', '╚', '╔', '╩', '╦', '╠', '═', '╬', '╧',
  '╨', '╤', '╥', '╙', '╘', '╒', '╓', '╫', '╪', '┘', '┌', '█', '▄', '▌', '▐', '▀',
  'α', 'ß', 'Γ', 'π', 'Σ', 'σ', 'µ', 'τ', 'Φ', 'Θ', 'Ω', 'δ', '∞', 'φ', 'ε', '∩',
  '≡', '±', '≥', '≤', '⌠', '⌡', '÷', '≈', '°', '∙', '·', '√', 'ⁿ', '²', '■', ' '
];

export function decodeCp437(bytes: Uint8Array): string {
  let out = '';
  for (const b of bytes) {
    if (b < 0x80) out += String.fromCharCode(b);
    else out += CP437_UPPER[b - 0x80];
  }
  return out;
}

const UNICODE_TO_CP437 = (() => {
  const m = new Map<number, number>();
  for (let i = 0x80; i < 0x100; i++) {
    const ch = CP437_UPPER[i - 0x80];
    m.set(ch.codePointAt(0)!, i);
  }
  return m;
})();

export function encodeCp437(text: string): Uint8Array {
  const out: number[] = [];
  for (const ch of text) {
    const cp = ch.codePointAt(0)!;
    if (cp < 0x80) {
      out.push(cp);
    } else {
      const mapped = UNICODE_TO_CP437.get(cp);
      out.push(mapped ?? 0x3F); // '?' för otecknbara glyfer
    }
  }
  return Uint8Array.from(out);
}

// Tolkar en SIE-fil från bytes. Auto-detekterar encoding:
// 1) UTF-8 BOM -> UTF-8
// 2) #FORMAT UTF-8 i första 1 kB -> UTF-8
// 3) annars CP437
export function decodeSieBytes(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(bytes.subarray(3));
  }
  const probe = new TextDecoder('latin1').decode(bytes.subarray(0, Math.min(bytes.length, 1024)));
  if (/^#FORMAT\s+UTF-?8/mi.test(probe)) {
    return new TextDecoder('utf-8').decode(bytes);
  }
  return decodeCp437(bytes);
}
