/**
 * HOAI-Honorartafel-Parser.
 *
 * Hintergrund: Der XML-Fetcher (scripts/fetch-laws.ts) extrahiert die HOAI
 * aus der amtlichen XML-Quelle. Tabellenstrukturen (<table>/<tr>/<entry>)
 * werden dabei zu zusammenhängendem Text reduziert — die Spaltenwerte
 * "85 269" + "100 098" landen z. B. als "85 269100 098" im Content-Feld.
 *
 * Dieser Parser rekonstruiert die strukturierten Honorartafeln aus diesem
 * Text. Er nutzt die HOAI-Invariante v(i+1) = b(i) (oberer Honorarsatz
 * einer Zone = Basishonorarsatz der Folgezone) als Disambiguierungs-Constraint.
 *
 * Trifft die Erkennung nicht zu (kein Honorartafel-Paragraph), gibt der
 * Parser `null` für `table` zurück und der Caller fällt auf rohen Text zurück.
 */

export type HoaiHonorartafelZone = {
  /** "I", "II", … */
  roman: string;
  /** Anforderungs-Beschreibung, z. B. "geringe Anforderungen". */
  label: string;
};

export type HoaiHonorartafelRow = {
  /** Bezugsgröße: Hektar, anrechenbare Kosten in € — siehe `basis.unit`. */
  basis: number;
  /** Pro Zone: { von: Basishonorarsatz, bis: oberer Honorarsatz }. Länge = zones.length. */
  zones: { von: number; bis: number }[];
};

export type HoaiHonorartafel = {
  /** Bezugsgrößen-Spalte (z. B. "Fläche in Hektar"). */
  basis: {
    label: string;
    unit: "ha" | "EUR";
  };
  zones: HoaiHonorartafelZone[];
  rows: HoaiHonorartafelRow[];
};

export type HoaiContentParts = {
  /** Erläuternder Prosatext nach der Tabelle (z. B. „(1) Für die in §…"). */
  prose: string;
  /** Strukturierte Honorartafel — null wenn kein Tafel-Paragraph erkannt. */
  table: HoaiHonorartafel | null;
};

/**
 * Block-orientierte Repräsentation eines HOAI-Paragraphen.
 *
 * Der XML-Fetcher (scripts/fetch-laws.ts) liefert seit der preserveOrder-
 * Umstellung saubere Newline-getrennte Listen: Items beginnen mit „N. " am
 * Zeilenanfang. Dieser Parser zerlegt den Text in Paragraphen, Listen und
 * Tabellen, ohne Komma-Splitter-Heuristik.
 */
export type HoaiBlock =
  | { kind: "paragraph"; marker: string | null; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; table: HoaiHonorartafel };

export type HoaiBlocks = {
  blocks: HoaiBlock[];
  /** Original-Content unverändert — Fallback bei Render-Bugs. */
  rawContent: string;
};

// Case-insensitiv: § 44 hat im amtlichen XML eine Großschreibung "Vonbis"
// als Inkonsistenz — wir akzeptieren beide Varianten.
const TABLE_MARKER_RE = /(?:vonbis){3,5}(Euro){3,5}/i;

/**
 * Splittet das `content`-Feld eines HOAI-Paragraphen in strukturierte Tafel
 * + verbleibenden Prosa-Text. Liefert `table: null`, wenn kein Tafel-Marker
 * gefunden wird (alle Nicht-Honorar-Paragraphen).
 */
export function parseHoaiContent(content: string): HoaiContentParts {
  const markerMatch = TABLE_MARKER_RE.exec(content);
  if (!markerMatch) {
    return { prose: content, table: null };
  }

  const markerStart = markerMatch.index;
  const markerEnd = markerStart + markerMatch[0].length;
  const zoneCount = (markerMatch[0].match(/Euro/g) ?? []).length;

  // Header steht unmittelbar vor dem Marker. preserveOrder hat Newlines an
  // anderen Stellen platziert als der frühere Parser — daher Whitespace
  // normalisieren und die Box rückwärts vom Marker eingrenzen: sie beginnt
  // beim Bezugsgrößen-Label „Fläche in Hektar" / „Anrechenbare Kosten in Euro".
  const fullHeader = content.slice(0, markerStart).replace(/\s+/g, " ");
  const basisRe = /(Fläche\s+in\s+Hektar|Anrechenbare\s+Kosten\s+in\s+Euro)/;
  const basisM = basisRe.exec(fullHeader);
  if (!basisM) return { prose: content, table: null };
  const headerStart = basisM.index;
  const preTable = fullHeader.slice(0, headerStart).trim(); // Prosa vor der Tafel
  const header = fullHeader.slice(headerStart).trim();

  // Splitte am ersten „Honorarzone" — alles davor ist die Bezugsgrößen-Spalte.
  const firstZoneIdx = header.search(/Honorarzone\s+[IVX]+/);
  const basisLabel = (firstZoneIdx >= 0 ? header.slice(0, firstZoneIdx) : header).trim() || "Bezugsgröße";
  const basisUnit: "ha" | "EUR" = /Hektar/i.test(basisLabel) ? "ha" : "EUR";

  // Restlicher Header: „Honorarzone I geringe Anforderungen Honorarzone II …".
  // Splitte global an der nächsten „Honorarzone X"-Boundary.
  const zones: HoaiHonorartafelZone[] = [];
  if (firstZoneIdx >= 0) {
    const zoneSection = header.slice(firstZoneIdx);
    const matches = [...zoneSection.matchAll(/Honorarzone\s+([IVX]+)\s+/g)];
    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const labelStart = m.index! + m[0].length;
      const labelEnd = i + 1 < matches.length ? matches[i + 1].index! : zoneSection.length;
      const label = zoneSection.slice(labelStart, labelEnd).trim();
      zones.push({ roman: m[1], label });
    }
  }

  if (zones.length !== zoneCount) {
    // Header passt nicht zur Marker-Anzahl — Tafel verwerfen, raw bleiben.
    return { prose: content, table: null };
  }

  // Tafel-Daten beginnen nach dem Marker und enden vor der ersten Prosa.
  // Prosa-Beginn: typischerweise "(1) ", "(2) " oder Aufzählungsmuster wie
  // "1.2.3.…" am Beginn einer Zeile. Pragmatisch: erste Position, an der
  // ein "(\d+)" oder ein "\n\n…(\d+)" auftaucht.
  const afterMarker = content.slice(markerEnd);
  const proseStartLocal = findProseStart(afterMarker);
  const tableData =
    proseStartLocal === -1 ? afterMarker : afterMarker.slice(0, proseStartLocal);
  const postTableProse =
    proseStartLocal === -1 ? "" : afterMarker.slice(proseStartLocal).trimStart();
  // Pre-Table-Prosa (typisch: „(1) Für die in § X … Orientierungswerte:") + Rest.
  const prose = preTable ? `${preTable}\n\n${postTableProse}` : postTableProse;

  const valuesPerRow = 1 + 2 * zoneCount;
  const groups = tokenizeToGroups(tableData);
  const rows = parseRows(groups, valuesPerRow);
  if (!rows) {
    // Parsing fehlgeschlagen — Tafel verwerfen, vollständigen Text behalten.
    return { prose: content, table: null };
  }

  const table: HoaiHonorartafel = {
    basis: { label: basisLabel, unit: basisUnit },
    zones,
    rows,
  };
  return { prose, table };
}

function findProseStart(s: string): number {
  // Prosa beginnt mit "(N)" oder einer Zeile, die nach "\n" mit "(N)"
  // anfängt. Das ist robust für alle bisher gesehenen HOAI-Honorartafeln.
  const m = /\(\d+\)/.exec(s);
  return m ? m.index : -1;
}

/**
 * Zerlegt den Tafel-Datentext in Ziffer-„Gruppen". Eine Gruppe ist entweder:
 * - 1–3 Ziffern (führende oder einzige Stelle eines Wertes),
 * - oder ein Komma-Dezimalwert wie "0,5", "1,5".
 *
 * Aufeinanderfolgende Werte ohne Trennzeichen erscheinen als kollidierter
 * Token (z. B. "85 269100 098" → Tokens "85", "269100", "098100", …).
 * Tokens > 3 Zeichen werden auf 3 + Rest-Länge re-gesplittet (siehe Doc oben).
 */
function tokenizeToGroups(data: string): string[] {
  const tokens = data.split(/\s+/).filter(Boolean);
  const groups: string[] = [];
  for (const tok of tokens) {
    if (tok.includes(",")) {
      // Dezimal-Wert (z. B. "0,5") — als Komplettwert behalten.
      groups.push(tok);
      continue;
    }
    if (!/^\d+$/.test(tok)) {
      // Unerwarteter Token — Tafel als nicht parsebar markieren via Sentinel.
      return [];
    }
    if (tok.length <= 3) {
      groups.push(tok);
      continue;
    }
    // Kollision: jeden 3er-Block als Tail der vorigen Wertgruppe abtrennen,
    // bis 1–3 Zeichen für den nächsten Lead übrig bleiben.
    let i = 0;
    while (tok.length - i > 3) {
      groups.push(tok.slice(i, i + 3));
      i += 3;
    }
    groups.push(tok.slice(i));
  }
  return groups;
}

function parseRows(
  groups: string[],
  valuesPerRow: number
): HoaiHonorartafelRow[] | null {
  if (groups.length === 0) return null;
  const rows: HoaiHonorartafelRow[] = [];
  let pos = 0;
  let prevBasis: number | null = null;

  while (pos < groups.length) {
    const row = tryParseRow(groups, pos, valuesPerRow, prevBasis);
    if (!row) return null;
    rows.push(row.row);
    prevBasis = row.row.basis;
    pos += row.consumed;
  }
  return rows.length > 0 ? rows : null;
}

function tryParseRow(
  groups: string[],
  start: number,
  K: number,
  prevBasis: number | null
): { row: HoaiHonorartafelRow; consumed: number } | null {
  // Basis-Wert kann Dezimal (genau 1 Gruppe) oder Integer (1–3 Gruppen) sein.
  const basisOptions = groups[start].includes(",") ? [1] : [1, 2, 3];
  const zones = (K - 1) / 2;

  // Backtracking: jeder Wert wird unabhängig mit 1–3 Gruppen versucht. Bei
  // großen anrechenbaren Kosten (§ 35, § 48) mischen sich 6- und 7-stellige
  // Zonenwerte in derselben Zeile — daher KEINE uniforme Annahme über die
  // Gruppen-Anzahl pro Zeile.
  for (const basisGc of basisOptions) {
    if (start + basisGc > groups.length) continue;
    const basis = assembleValue(groups.slice(start, start + basisGc));
    if (basis === null) continue;
    if (prevBasis !== null && basis <= prevBasis) continue;

    const result = parseZones(groups, start + basisGc, zones, []);
    if (result) {
      return {
        row: { basis, zones: result.zones },
        consumed: result.endPos - start,
      };
    }
  }
  return null;
}

function parseZones(
  groups: string[],
  start: number,
  zonesRemaining: number,
  done: { von: number; bis: number }[]
): { zones: { von: number; bis: number }[]; endPos: number } | null {
  if (zonesRemaining === 0) {
    return { zones: done, endPos: start };
  }
  const constraintVon = done.length === 0 ? null : done[done.length - 1].bis;

  for (const vonGc of [1, 2, 3]) {
    if (start + vonGc > groups.length) continue;
    const von = assembleValue(groups.slice(start, start + vonGc));
    if (von === null) continue;
    if (constraintVon !== null && von !== constraintVon) continue;

    for (const bisGc of [1, 2, 3]) {
      const bisStart = start + vonGc;
      if (bisStart + bisGc > groups.length) continue;
      const bis = assembleValue(groups.slice(bisStart, bisStart + bisGc));
      if (bis === null) continue;
      if (bis < von) continue;

      const next = parseZones(
        groups,
        bisStart + bisGc,
        zonesRemaining - 1,
        [...done, { von, bis }]
      );
      if (next) return next;
    }
  }
  return null;
}

function assembleValue(groups: string[]): number | null {
  if (groups.length === 0) return null;
  // Dezimal-Spezialfall.
  if (groups.length === 1 && groups[0].includes(",")) {
    const n = parseFloat(groups[0].replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  // Lead-Gruppe: 1–3 Stellen; nachfolgende Tausender-Gruppen: exakt 3 Stellen.
  const lead = groups[0];
  if (lead.length < 1 || lead.length > 3 || !/^\d+$/.test(lead)) return null;
  for (let i = 1; i < groups.length; i++) {
    if (groups[i].length !== 3 || !/^\d+$/.test(groups[i])) return null;
  }
  const n = parseInt(groups.join(""), 10);
  return Number.isFinite(n) ? n : null;
}

/* =====================================================================
 * Block-Parser: zerlegt HOAI-Content in semantische Blöcke (Paragraph,
 * Liste, Tabelle), korrigiert die Reihenfolge „Liste vor Intro" und
 * versucht eine valide Splittung der verklumpten Marker `1.2.…N.`.
 * ===================================================================== */

const PARA_MARKER_RE = /^\((\d+)\)\s*/;
const LIST_ITEM_RE = /^(\d+)\.\s+(.*)$/;

export function parseHoaiBlocks(content: string): HoaiBlocks {
  const { table, prose } = parseHoaiContent(content);

  // Prosa-Blöcke zuerst, dann die Tafel an die richtige Stelle einsortieren:
  // direkt nach dem ersten Absatz, der mit „:" endet (das ist „(1) Für die in
  // § X und Anlage Y … sind die in der nachstehenden Honorartafel … :").
  // Falls keiner passt, kommt die Tafel ans Ende der Prosa.
  const blocks: HoaiBlock[] = [];

  // Zeilenweises Tokenizing. Trenner-Strategie:
  // - Leere Zeile → Block-Übergang (Paragraph endet, Liste endet)
  // - Zeile beginnt mit "(N) " → neuer Paragraph mit Marker
  // - Zeile beginnt mit "N. "  → Listen-Item
  // - Sonst → Fortsetzung des aktuellen Paragraphs
  const lines = prose.split(/\n/);

  let curParaMarker: string | null = null;
  let curParaLines: string[] = [];
  let curListItems: string[] = [];

  function flushParagraph() {
    if (curParaLines.length === 0 && curParaMarker === null) return;
    const text = curParaLines.join(" ").replace(/\s+/g, " ").trim();
    if (!text && !curParaMarker) {
      curParaLines = [];
      return;
    }
    blocks.push({ kind: "paragraph", marker: curParaMarker, text });
    curParaMarker = null;
    curParaLines = [];
  }
  function flushList() {
    if (curListItems.length === 0) return;
    blocks.push({ kind: "list", items: curListItems });
    curListItems = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      // Leere Zeile beendet den aktuellen Block.
      flushParagraph();
      flushList();
      continue;
    }

    const itemMatch = LIST_ITEM_RE.exec(line);
    if (itemMatch) {
      // Beim Listen-Beginn: vorausgehenden Paragraph schließen.
      flushParagraph();
      curListItems.push(itemMatch[2].trim());
      continue;
    }

    // Nicht-Listen-Zeile: laufende Liste schließen.
    flushList();

    const paraMatch = PARA_MARKER_RE.exec(line);
    if (paraMatch) {
      // Neuer Absatz mit (N)-Marker — vorigen Paragraph zuerst flushen.
      flushParagraph();
      curParaMarker = `(${paraMatch[1]})`;
      const rest = line.slice(paraMatch[0].length).trim();
      if (rest) curParaLines.push(rest);
      continue;
    }

    // Plain-Text-Fortsetzung.
    curParaLines.push(line);
  }

  flushParagraph();
  flushList();

  // Tafel einfügen: nach dem ersten Paragraphen, der mit „:" endet.
  if (table) {
    const tableBlock: HoaiBlock = { kind: "table", table };
    const introIdx = blocks.findIndex(
      (b) => b.kind === "paragraph" && b.text.trim().endsWith(":")
    );
    if (introIdx >= 0) {
      blocks.splice(introIdx + 1, 0, tableBlock);
    } else {
      blocks.push(tableBlock);
    }
  }

  return { blocks, rawContent: content };
}
