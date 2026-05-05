/**
 * CP1252-Encoder ohne externe Library.
 *
 * DATEV-EXTF-Files sind ANSI-encoded (Windows-1252). Node.js' `Buffer.from(s, "latin1")`
 * deckt nur ISO-8859-1 ab (0x00-0xFF == U+0000-U+00FF). CP1252 unterscheidet sich
 * im Bereich 0x80-0x9F: dort liegen Sonderzeichen wie €, „, ", ', –, —.
 *
 * Implementierung: Mapping-Tabelle für 0x80-0x9F + Bulk-Pfad für 0x00-0x7F und
 * 0xA0-0xFF (1:1 zu Unicode-Codepoint).
 */

/**
 * CP1252-Sondermapping für Codepoints 0x80-0x9F (Unicode → CP1252-Byte).
 * Quelle: https://en.wikipedia.org/wiki/Windows-1252
 */
const CP1252_SPECIAL: Record<number, number> = {
  0x20ac: 0x80, // €
  0x201a: 0x82, // ‚
  0x0192: 0x83, // ƒ
  0x201e: 0x84, // „
  0x2026: 0x85, // …
  0x2020: 0x86, // †
  0x2021: 0x87, // ‡
  0x02c6: 0x88, // ˆ
  0x2030: 0x89, // ‰
  0x0160: 0x8a, // Š
  0x2039: 0x8b, // ‹
  0x0152: 0x8c, // Œ
  0x017d: 0x8e, // Ž
  0x2018: 0x91, // '
  0x2019: 0x92, // '
  0x201c: 0x93, // "
  0x201d: 0x94, // "
  0x2022: 0x95, // •
  0x2013: 0x96, // –
  0x2014: 0x97, // —
  0x02dc: 0x98, // ˜
  0x2122: 0x99, // ™
  0x0161: 0x9a, // š
  0x203a: 0x9b, // ›
  0x0153: 0x9c, // œ
  0x017e: 0x9e, // ž
  0x0178: 0x9f, // Ÿ
};

/**
 * Wandelt einen UTF-16-String in CP1252-Bytes (Buffer) um.
 * Nicht abbildbare Zeichen werden zu '?' (0x3F).
 */
export function toCp1252(input: string): Buffer {
  const bytes: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    // Surrogate pairs (U+10000+): nicht in CP1252 → '?'
    if (code >= 0xd800 && code <= 0xdfff) {
      bytes.push(0x3f);
      // Skip second half if high surrogate
      if (code >= 0xd800 && code <= 0xdbff && i + 1 < input.length) {
        const next = input.charCodeAt(i + 1);
        if (next >= 0xdc00 && next <= 0xdfff) i++;
      }
      continue;
    }
    if (code <= 0x7f) {
      bytes.push(code);
      continue;
    }
    if (code >= 0xa0 && code <= 0xff) {
      // 0xA0-0xFF: 1:1 zu Unicode (Latin-1-Block)
      bytes.push(code);
      continue;
    }
    // Sondermapping 0x80-0x9F
    const mapped = CP1252_SPECIAL[code];
    if (mapped !== undefined) {
      bytes.push(mapped);
      continue;
    }
    // Nicht abbildbar
    bytes.push(0x3f);
  }
  return Buffer.from(bytes);
}

/** Decoder zurück (für Tests). Reverse von toCp1252. */
const CP1252_REVERSE: Record<number, number> = {};
for (const [unicode, cp] of Object.entries(CP1252_SPECIAL)) {
  CP1252_REVERSE[cp] = Number(unicode);
}

export function fromCp1252(bytes: Buffer): string {
  let out = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b <= 0x7f || b >= 0xa0) {
      out += String.fromCharCode(b);
      continue;
    }
    const reverse = CP1252_REVERSE[b];
    if (reverse !== undefined) {
      out += String.fromCharCode(reverse);
      continue;
    }
    out += "?";
  }
  return out;
}
