/**
 * Lädt BGB §§ 631–650v und HOAI 2021 als XML von gesetze-im-internet.de
 * und schreibt die Inhalte in src/data/legal/{bgb,hoai}.ts.
 *
 * Beide Werke sind nach § 5 UrhG amtliche Werke und gemeinfrei.
 *
 * Aufruf: npm run db:fetch-laws
 */

import path from "node:path";
import fs from "node:fs/promises";
import AdmZip from "adm-zip";
import { XMLParser } from "fast-xml-parser";

type ParaRange = [number, number];

type SourceSpec = {
  url: string;
  /**
   * Mehrere Ranges möglich. null = alle Paragraphen behalten.
   * Bei BGB kuratierte Bau-relevante Ranges:
   *   187–193 · Fristberechnung
   *   195–218 · Verjährung (inkl. Hemmung, Neubeginn)
   *   276–292 · Schuldnerverschulden, Pflichtverletzung, Verzug
   *   305–310 · AGB-Recht
   *   320–327 · Synallagma, Rücktritt, Befreiung
   *   339–345 · Vertragsstrafe
   *   387–396 · Aufrechnung
   *   631–650v · Werkvertrag/Bauvertrag (Kern)
   */
  filterRanges: ParaRange[] | null;
  outFile: string;
  constName: string;
  headerComment: string;
};

const SOURCES: Record<string, SourceSpec> = {
  bgb: {
    url: "https://www.gesetze-im-internet.de/bgb/xml.zip",
    filterRanges: [
      [187, 193],
      [195, 218],
      [276, 292],
      [305, 310],
      [320, 327],
      [339, 345],
      [387, 396],
      [631, 650],
    ],
    outFile: "src/data/legal/bgb.ts",
    constName: "BGB",
    headerComment: `/**
 * BGB · Bau-relevante Paragraphen
 *
 * Enthaltene Bereiche:
 *   §§ 187–193  Fristberechnung
 *   §§ 195–218  Verjährung
 *   §§ 276–292  Pflichtverletzung, Verzug, Schadensersatz
 *   §§ 305–310  AGB-Recht
 *   §§ 320–327  Synallagma, Rücktritt
 *   §§ 339–345  Vertragsstrafe
 *   §§ 387–396  Aufrechnung
 *   §§ 631–650v Werkvertrag und Bauvertragsrecht (Kern)
 *
 * Quelle: gesetze-im-internet.de · automatisiert geladen.
 * Status: amtliches Werk · § 5 UrhG · gemeinfrei.
 * Generiert via \`npm run db:fetch-laws\` — nicht von Hand bearbeiten.
 */`,
  },
  hoai: {
    // Achtung: URL-Slug stammt vom Erlassjahr 2013; Inhalt enthält die 2021er Novelle.
    url: "https://www.gesetze-im-internet.de/hoai_2013/xml.zip",
    filterRanges: null,
    outFile: "src/data/legal/hoai.ts",
    constName: "HOAI",
    headerComment: `/**
 * HOAI 2021 · Honorarordnung für Architekten und Ingenieure
 * Quelle: gesetze-im-internet.de · automatisiert geladen.
 * Status: amtliches Werk · § 5 UrhG · gemeinfrei.
 * Generiert via \`npm run db:fetch-laws\` — nicht von Hand bearbeiten.
 */`,
  },
};

type Chunk = {
  slug: string;
  ref: string;
  title: string;
  summary: string;
  content: string;
  orderIdx: number;
};

async function downloadZip(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": "lexbau-law-fetcher/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function extractXml(zipBuffer: Buffer): string {
  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();
  const xmlEntry = entries.find((e) => e.entryName.toLowerCase().endsWith(".xml"));
  if (!xmlEntry) throw new Error("Keine XML-Datei im ZIP gefunden.");
  const data = xmlEntry.getData();

  // Encoding aus XML-Deklaration ermitteln
  const head = data.subarray(0, Math.min(200, data.length)).toString("latin1");
  const m = /encoding\s*=\s*["']([^"']+)["']/i.exec(head);
  const encoding = m ? m[1].toLowerCase() : "utf-8";

  if (encoding === "iso-8859-1" || encoding === "latin1") {
    return data.toString("latin1");
  }
  return data.toString("utf-8");
}

/**
 * Rekursiv aus parsed-XML-Baum Klartext extrahieren.
 *
 * Erwartet `preserveOrder: true`-Format von fast-xml-parser:
 * jeder Knoten ist ein einschlüsseliges Objekt `{ tagName: [children] }`,
 * Geschwister stehen als Array von solchen Objekten in Original-Reihenfolge.
 *
 * Listen `<DL><DT>1.</DT><DD>item</DD>…</DL>` werden zu sauberen Markdown-
 * artigen Items: jede Zeile beginnt mit `\nN. body`. Der HOAI-Block-Parser
 * im Frontend (parseHoaiBlocks) erkennt diese Zeilen deterministisch als
 * Listen-Items — ohne Komma-Splitting-Heuristik.
 */
function extractText(node: unknown): string {
  if (node === null || node === undefined) return "";
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (typeof node !== "object") return "";

  // preserveOrder-Knoten: einschlüsseliges Objekt (außer dem Attribute-Slot ":@").
  const obj = node as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => k !== ":@");
  if (keys.length !== 1) {
    // Fallback (sollte mit preserveOrder nicht vorkommen): Werte konkatenieren.
    return keys.map((k) => extractText(obj[k])).join("");
  }
  const key = keys[0];
  const val = obj[key];

  if (key === "#text") return typeof val === "string" ? val : String(val);
  if (key === "BR") return "\n";
  if (key === "DL" || key === "OL" || key === "UL") {
    return "\n" + renderList(val) + "\n";
  }
  if (key === "DT" || key === "DD" || key === "LA") {
    // Üblicherweise vom DL-Branch erfasst; Fallback für DL-lose Verwendung.
    return extractText(val);
  }
  if (key === "P") {
    return "\n\n" + extractText(val).trim() + "\n\n";
  }
  // Inline/Wrapper (I, B, SUP, SUB, Content, …): Kinder durchreichen.
  return extractText(val);
}

/**
 * Pairing für `<DL>`-Listen im preserveOrder-Format.
 * Children sind ein Array von `{ DT: […] }` und `{ DD: […] }` in Original-
 * Reihenfolge. Jedes konsekutive DT+DD-Paar ergibt ein Item.
 */
function renderList(children: unknown): string {
  if (!Array.isArray(children)) return "";

  const lines: string[] = [];
  let pendingDt: string | null = null;
  let autoIdx = 0;

  for (const child of children) {
    if (!child || typeof child !== "object") continue;
    const c = child as Record<string, unknown>;
    if ("DT" in c) {
      pendingDt = extractText(c.DT).trim();
    } else if ("DD" in c) {
      autoIdx++;
      const body = extractText(c.DD).trim();
      // DT enthält typischerweise „1.", „2." — Punkt ergänzen, falls fehlend.
      const marker = pendingDt && /\d+/.test(pendingDt)
        ? /\.$/.test(pendingDt) ? pendingDt : `${pendingDt}.`
        : `${autoIdx}.`;
      lines.push(`${marker} ${body}`.trim());
      pendingDt = null;
    }
    // Andere Tags innerhalb einer Liste (selten) ignorieren.
  }
  return lines.join("\n");
}

function makeSummary(content: string, max = 200): string {
  const single = content.replace(/\s+/g, " ").trim();
  if (single.length <= max) return single;
  // an Wortgrenze kürzen
  const cut = single.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut) + " …";
}

function parseEnbez(enbez: string): { num: number; suffix: string } | null {
  const m = /^§\s*(\d+)([a-z]*)/i.exec(enbez);
  if (!m) return null;
  return { num: parseInt(m[1], 10), suffix: (m[2] ?? "").toLowerCase() };
}

function parseXml(xml: string): Chunk[] {
  // preserveOrder: true erhält die Reihenfolge von #text und Element-Tags
  // innerhalb eines <P>-Knotens. Ohne diese Option würde fast-xml-parser
  // alle DLs in eines Property-Array gruppieren — getrennt vom umgebenden
  // Text — und die Reihenfolge „Intro-Satz → Liste → weiterer Text" ginge
  // verloren (Listen würden VOR den Intros stehen).
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributesGroupName: ":@",
    parseTagValue: false,
    trimValues: false,
    preserveOrder: true,
  });
  const doc = parser.parse(xml);
  const root = Array.isArray(doc) ? doc : [];
  const dokumente = findChild(root, "dokumente");
  if (!dokumente) throw new Error("Kein <dokumente>-Wurzelelement.");

  const norms = findAllChildren(dokumente, "norm");

  const chunks: Chunk[] = [];
  for (const norm of norms) {
    const meta = findChild(norm, "metadaten");
    if (!meta) continue;

    const enbezNode = findChild(meta, "enbez");
    if (!enbezNode) continue; // Kopfnorm überspringen
    const enbez = extractText(enbezNode).trim();

    const parsed = parseEnbez(enbez);
    if (!parsed) continue;

    const titelNode = findChild(meta, "titel");
    const title = titelNode ? extractText(titelNode).replace(/\s+/g, " ").trim() : "";
    if (!title) continue;

    const textdaten = findChild(norm, "textdaten");
    const text = textdaten ? findChild(textdaten, "text") : null;
    const contentNode = text ? findChild(text, "Content") : null;
    const content = contentNode ? extractContent(contentNode).trim() : "";

    if (!content) continue; // weggefallene Paragraphen ohne Inhalt überspringen

    chunks.push({
      slug: `${parsed.num}${parsed.suffix}`,
      ref: enbez,
      title,
      summary: makeSummary(content),
      content,
      orderIdx: parsed.num * 100 + (parsed.suffix ? parsed.suffix.charCodeAt(0) - 96 : 0),
    });
  }

  return chunks;
}

/**
 * Helper für preserveOrder-Format: findet das erste Child-Element mit
 * gegebenem Tag-Namen. Im preserveOrder-Format ist `parent` ein Knoten
 * `{ tagName: [children] }` — die Children-Array enthält weitere solche Knoten.
 */
function findChild(parent: unknown, tag: string): unknown[] | null {
  if (!parent) return null;
  const children = parent && typeof parent === "object" && tag in (parent as Record<string, unknown>)
    ? (parent as Record<string, unknown[]>)[tag]
    : extractChildren(parent);
  if (Array.isArray(children)) {
    for (const c of children) {
      if (c && typeof c === "object" && tag in (c as Record<string, unknown>)) {
        return (c as Record<string, unknown[]>)[tag] as unknown[];
      }
    }
  }
  return null;
}

function findAllChildren(parent: unknown, tag: string): unknown[][] {
  const children = extractChildren(parent);
  const out: unknown[][] = [];
  if (Array.isArray(children)) {
    for (const c of children) {
      if (c && typeof c === "object" && tag in (c as Record<string, unknown>)) {
        out.push((c as Record<string, unknown[]>)[tag] as unknown[]);
      }
    }
  }
  return out;
}

function extractChildren(parent: unknown): unknown[] | null {
  if (Array.isArray(parent)) return parent;
  if (parent && typeof parent === "object") {
    const obj = parent as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => k !== ":@");
    if (keys.length === 1) {
      const v = obj[keys[0]];
      return Array.isArray(v) ? v : null;
    }
  }
  return null;
}

/**
 * Content (typischerweise: mehrere `<P>`-Knoten) zu Klartext extrahieren.
 * `<P>`-Inhalte werden mit doppeltem Newline getrennt.
 */
function extractContent(content: unknown[]): string {
  if (!Array.isArray(content)) return "";
  return content
    .map((c) => extractText(c))
    .join("")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function filterRanges(chunks: Chunk[], ranges: ParaRange[] | null): Chunk[] {
  if (!ranges) return chunks;
  return chunks.filter((c) => {
    const m = /^(\d+)/.exec(c.slug);
    if (!m) return false;
    const n = parseInt(m[1], 10);
    return ranges.some(([min, max]) => n >= min && n <= max);
  });
}

function generateModule(spec: SourceSpec, chunks: Chunk[]): string {
  const sorted = [...chunks].sort((a, b) => a.orderIdx - b.orderIdx);
  const lines: string[] = [];
  lines.push(spec.headerComment);
  lines.push("");
  lines.push('import type { NewLegalChunk } from "@/db/schema";');
  lines.push("");
  lines.push(
    `export const ${spec.constName}: Omit<NewLegalChunk, "id" | "source">[] = [`
  );
  for (const c of sorted) {
    lines.push("  {");
    lines.push(`    slug: ${JSON.stringify(c.slug)},`);
    lines.push(`    ref: ${JSON.stringify(c.ref)},`);
    lines.push(`    title: ${JSON.stringify(c.title)},`);
    lines.push(`    summary: ${JSON.stringify(c.summary)},`);
    lines.push(`    orderIdx: ${c.orderIdx},`);
    lines.push(`    content: ${JSON.stringify(c.content)},`);
    lines.push("  },");
  }
  lines.push("];");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const cwd = process.cwd();
  console.log("📚 LexBau · Gesetzes-Fetcher\n");

  for (const [key, spec] of Object.entries(SOURCES)) {
    console.log(`▸ ${key.toUpperCase()}`);
    console.log(`  URL: ${spec.url}`);

    const zipBuf = await downloadZip(spec.url);
    console.log(`  ✓ ZIP geladen (${(zipBuf.length / 1024).toFixed(0)} KiB)`);

    const xml = extractXml(zipBuf);
    console.log(`  ✓ XML extrahiert (${(xml.length / 1024).toFixed(0)} KiB)`);

    const allChunks = parseXml(xml);
    const chunks = filterRanges(allChunks, spec.filterRanges);
    const filterLabel = spec.filterRanges
      ? ` (aus ${allChunks.length} gesamt, Filter ${spec.filterRanges.map(([a, b]) => `§§${a}–${b}`).join(", ")})`
      : "";
    console.log(`  ✓ ${chunks.length} Paragraphen geparst${filterLabel}`);

    if (chunks.length === 0) {
      throw new Error(`Keine Paragraphen für ${key} — Abbruch.`);
    }

    const out = generateModule(spec, chunks);
    const outPath = path.join(cwd, spec.outFile);
    await fs.writeFile(outPath, out, "utf-8");
    console.log(`  ✓ ${spec.outFile} geschrieben\n`);
  }

  console.log("✅ Fertig. Jetzt 'npm run db:seed' ausführen, um Daten in DB zu übernehmen.");
}

main().catch((err) => {
  console.error("❌ Fehler:", err);
  process.exit(1);
});
