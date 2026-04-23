// Radbaserad tokenisering för SIE-poster.
// Regler (SIE 4B §4.1):
//   - Tokens separeras av whitespace (SP/TAB).
//   - Citerade strängar: "..." med backslash-escape för " och \.
//   - Ociterade tokens får inte innehålla whitespace eller { } " \.
//   - { ... } omgärdar en lista (dimensioner/objekt). Vi modellerar som ett
//     eget token-värde så anroparen kan plocka ut innehållet.

export type SieToken =
  | { kind: 'word'; value: string }
  | { kind: 'string'; value: string }
  | { kind: 'list'; items: SieToken[] };

export function tokenizeLine(line: string): SieToken[] {
  const tokens: SieToken[] = [];
  let i = 0;
  const n = line.length;

  const parse = (stopOnBrace: boolean): SieToken[] => {
    const out: SieToken[] = [];
    while (i < n) {
      const ch = line[i];
      if (ch === ' ' || ch === '\t' || ch === '\r') {
        i++;
        continue;
      }
      if (stopOnBrace && ch === '}') {
        i++;
        return out;
      }
      if (ch === '{') {
        i++;
        const items = parse(true);
        out.push({ kind: 'list', items });
        continue;
      }
      if (ch === '"') {
        i++;
        let s = '';
        while (i < n) {
          const c = line[i];
          if (c === '\\' && i + 1 < n) {
            s += line[i + 1];
            i += 2;
          } else if (c === '"') {
            i++;
            break;
          } else {
            s += c;
            i++;
          }
        }
        out.push({ kind: 'string', value: s });
        continue;
      }
      // Ociterat ord
      let w = '';
      while (i < n) {
        const c = line[i];
        if (c === ' ' || c === '\t' || c === '\r' || c === '{' || c === '}' || c === '"') break;
        w += c;
        i++;
      }
      if (w.length > 0) out.push({ kind: 'word', value: w });
    }
    return out;
  };

  const result = parse(false);
  for (const t of result) tokens.push(t);
  return tokens;
}

export function asString(t: SieToken | undefined): string | undefined {
  if (!t) return undefined;
  if (t.kind === 'word' || t.kind === 'string') return t.value;
  return undefined;
}
