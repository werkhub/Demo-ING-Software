/**
 * REB-23.003-Formel-Parser.
 *
 * Sicherer arithmetischer Ausdrucks-Auswerter ohne `eval()`. Recursive-Descent:
 *   Expr   := Term ( ('+'|'-') Term )*
 *   Term   := Factor ( ('*'|'/') Factor )*
 *   Factor := Number | '(' Expr ')' | ('+'|'-') Factor
 *
 * Toleriert deutsche Notation (Komma als Dezimaltrennzeichen) und beliebige
 * Whitespaces. Liefert ein Result-Objekt — kein Throw, damit die UI Fehler
 * inline anzeigen kann.
 */

export type FormulaResult =
  | { ok: true; value: number }
  | { ok: false; error: string };

type Token =
  | { type: "num"; value: number }
  | { type: "op"; value: "+" | "-" | "*" | "/" }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(input: string): Token[] | { error: string } {
  const tokens: Token[] = [];
  let i = 0;
  while (i < input.length) {
    const c = input[i];
    if (c === " " || c === "\t" || c === "\n" || c === "\r") {
      i++;
      continue;
    }
    if (c === "+" || c === "-" || c === "*" || c === "/") {
      tokens.push({ type: "op", value: c });
      i++;
      continue;
    }
    if (c === "(") {
      tokens.push({ type: "lparen" });
      i++;
      continue;
    }
    if (c === ")") {
      tokens.push({ type: "rparen" });
      i++;
      continue;
    }
    if ((c >= "0" && c <= "9") || c === "." || c === ",") {
      let j = i;
      let dotCount = 0;
      while (j < input.length) {
        const ch = input[j];
        if (ch >= "0" && ch <= "9") {
          j++;
          continue;
        }
        if (ch === "." || ch === ",") {
          // Erlaube . und , gemischt. Nur ein Dezimaltrennzeichen — bei
          // mehreren prüfen wir nachher beim Number-Parse.
          dotCount++;
          j++;
          continue;
        }
        break;
      }
      if (j === i) {
        return { error: `Unerwartetes Zeichen: '${c}'` };
      }
      // Deutsche Notation: ersetze Komma mit Punkt. Tausender-Trenner-Punkt
      // (z. B. 1.234,56) entfernen wir.
      const raw = input.slice(i, j);
      let normalized = raw;
      if (raw.includes(",")) {
        // 1.234,56 → 1234.56
        normalized = raw.replace(/\./g, "").replace(",", ".");
      } else if (dotCount > 1) {
        // Mehrere Punkte ohne Komma → Tausender-Trenner-Notation
        normalized = raw.replace(/\./g, "");
      }
      const n = Number(normalized);
      if (!Number.isFinite(n)) {
        return { error: `Ungültige Zahl: '${raw}'` };
      }
      tokens.push({ type: "num", value: n });
      i = j;
      continue;
    }
    return { error: `Unerlaubtes Zeichen: '${c}'` };
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  parse(): FormulaResult {
    if (this.tokens.length === 0) {
      return { ok: false, error: "Formel ist leer." };
    }
    let value: number;
    try {
      value = this.parseExpr();
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
    if (this.pos !== this.tokens.length) {
      return { ok: false, error: "Unerwartetes Zeichen am Ende." };
    }
    if (!Number.isFinite(value)) {
      return { ok: false, error: "Ergebnis ist keine gültige Zahl (Division durch 0?)." };
    }
    return { ok: true, value };
  }

  private parseExpr(): number {
    let v = this.parseTerm();
    while (this.peekOp("+") || this.peekOp("-")) {
      const op = (this.consume() as { type: "op"; value: "+" | "-" }).value;
      const rhs = this.parseTerm();
      v = op === "+" ? v + rhs : v - rhs;
    }
    return v;
  }

  private parseTerm(): number {
    let v = this.parseFactor();
    while (this.peekOp("*") || this.peekOp("/")) {
      const op = (this.consume() as { type: "op"; value: "*" | "/" }).value;
      const rhs = this.parseFactor();
      if (op === "*") {
        v = v * rhs;
      } else {
        if (rhs === 0) throw new Error("Division durch 0.");
        v = v / rhs;
      }
    }
    return v;
  }

  private parseFactor(): number {
    const tok = this.peek();
    if (!tok) throw new Error("Unerwartetes Ende der Formel.");
    if (tok.type === "op" && (tok.value === "+" || tok.value === "-")) {
      this.consume();
      const inner = this.parseFactor();
      return tok.value === "-" ? -inner : inner;
    }
    if (tok.type === "lparen") {
      this.consume();
      const v = this.parseExpr();
      const next = this.consume();
      if (!next || next.type !== "rparen") {
        throw new Error("Fehlende schließende Klammer ')'.");
      }
      return v;
    }
    if (tok.type === "num") {
      this.consume();
      return tok.value;
    }
    throw new Error(
      `Erwartet: Zahl oder '(', gefunden: ${tok.type === "op" ? `'${tok.value}'` : tok.type}.`
    );
  }

  private peek(): Token | null {
    return this.tokens[this.pos] ?? null;
  }
  private peekOp(v: string): boolean {
    const t = this.peek();
    return t !== null && t.type === "op" && t.value === v;
  }
  private consume(): Token | null {
    const t = this.peek();
    if (t) this.pos++;
    return t;
  }
}

/**
 * Wertet eine REB-23.003-Formel aus.
 * Beispiele:
 *   "3,50 * 2,80"               → 9.8
 *   "3,5 * 2,8 - 0,9 * 2,1"     → 7.91
 *   "(1+2)*3"                   → 9
 *
 * Bei Fehler: { ok: false, error: "..." } — kein Throw, UI rendert inline.
 */
export function evaluateFormula(input: string): FormulaResult {
  if (input === null || input === undefined) {
    return { ok: false, error: "Formel ist leer." };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "Formel ist leer." };
  }
  const tokensOrError = tokenize(trimmed);
  if ("error" in tokensOrError) {
    return { ok: false, error: tokensOrError.error };
  }
  const parser = new Parser(tokensOrError);
  const result = parser.parse();
  if (result.ok) {
    // Auf 4 Dezimalstellen runden — typisch für REB.
    return {
      ok: true,
      value: Math.round(result.value * 10000) / 10000,
    };
  }
  return result;
}
