/**
 * Lädt baurelevante BGH-Entscheidungen aus dem ECLI-Index der BMJ
 * (rechtsprechung-im-internet.de) und schreibt sie in die `case_decisions`-Tabelle.
 *
 * Quelle: https://www.rechtsprechung-im-internet.de/jportal/docs/eclicrawler/
 * User-Agent: DG_JUSTICE_CRAWLER (offiziell vorgesehen, robots.txt-konform)
 *
 * Filter: Senat VII ZR (Werkvertrag, Bauvertrag, Architektenrecht).
 * Erweiterbar in BAU_SENATE_PATTERN.
 *
 * Aufruf: npm run db:fetch-cases
 */

import { gunzipSync } from "node:zlib";
import { XMLParser } from "fast-xml-parser";
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";

const ROBOTS_URL =
  "https://www.rechtsprechung-im-internet.de/jportal/docs/eclicrawler/robots.txt";
const USER_AGENT = "DG_JUSTICE_CRAWLER";
const REQUEST_DELAY_MS = 150;

// Senate, deren Entscheidungen baurelevant sind. Mindestens VII. Zivilsenat
// (Werkvertrag/Bauvertrag/Architektenrecht). Bei Bedarf erweitern.
//
// ECLI-Format codiert: {6-stelliges-Datum}{Typ-Buchstabe}{Senate}{Nummer}.{Jahr}.{Suffix}
// Beispiel: "160425BVIIZR60.24.0" → 16.04.2025, Beschluss, VII ZR 60/24
//
// Lookbehind sorgt dafür, dass nur ein Typ-Buchstabe vor dem Senat-Code steht.
// Lookahead nach Ziffer trennt Senat sauber von Aktenzeichen-Nummer.
// VII ZR = Werkvertrag/Bauvertrag/Architektenrecht (Hauptbau-Senat)
// V ZR  = Sachenrecht / Grundstücke / Nachbarrecht (häufig baurelevant)
const BAU_SENATE_ECLI_PATTERN = /(?<=[UBVTZ])(VIIZR|VZR)(?=\d)/;

type SitemapEntry = {
  ecli: string;
  court: string;
  date: string; // YYYY-MM-DD
  title: string;
  sourceUrl: string;
};

async function httpGet(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, "Accept-Encoding": "gzip" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} bei ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

function maybeDecompressGzip(buf: Buffer): Buffer {
  // gzip magic bytes
  if (buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b) {
    return gunzipSync(buf);
  }
  return buf;
}

async function fetchText(url: string): Promise<string> {
  const buf = await httpGet(url);
  return maybeDecompressGzip(buf).toString("utf-8");
}

async function listSitemapDailyIndexes(): Promise<string[]> {
  const robots = await fetchText(ROBOTS_URL);
  const urls: string[] = [];
  for (const line of robots.split(/\r?\n/)) {
    const m = /^Sitemap:\s*(\S+)/i.exec(line);
    if (m) urls.push(m[1]);
  }
  return urls;
}

async function listSitemapDayChildren(indexUrl: string): Promise<string[]> {
  const xml = await fetchText(indexUrl);
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: false,
    trimValues: true,
  });
  const data = parser.parse(xml);
  const sitemap = data.sitemapindex?.sitemap;
  if (!sitemap) return [];
  const arr = Array.isArray(sitemap) ? sitemap : [sitemap];
  return arr.map((s: { loc: string }) => s.loc).filter(Boolean);
}

const ENTRY_PARSER = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true,
  // ECLI-Element kommt mit Namespace-Prefix `ecli:`
  removeNSPrefix: true,
});

function parseDailySitemap(xml: string): SitemapEntry[] {
  const data = ENTRY_PARSER.parse(xml);
  const urlset = data.urlset?.url;
  if (!urlset) return [];
  const arr = Array.isArray(urlset) ? urlset : [urlset];

  const out: SitemapEntry[] = [];
  for (const entry of arr) {
    const loc = entry.loc;
    const meta = entry.document?.metadata;
    if (!loc || !meta) continue;

    const isVersionOf = meta.isVersionOf;
    if (!isVersionOf) continue;
    const ecli = isVersionOf["@_value"] ?? "";
    if (!ecli) continue;

    const court = isVersionOf.court ?? "";
    const date = String(meta.date ?? "").trim();
    const titleNode = meta.title;
    const title =
      typeof titleNode === "string"
        ? titleNode.trim()
        : titleNode?.["#text"]?.trim() ?? "";

    if (!court || !date) continue;

    out.push({
      ecli,
      court,
      date,
      title,
      sourceUrl: typeof loc === "string" ? loc : loc["#text"] ?? "",
    });
  }
  return out;
}

/**
 * Wandelt ECLI-Az.-Codierung wie "VIIZR13.16" in das übliche "VII ZR 13/16".
 * Liefert null, wenn Format nicht erkannt.
 */
function ecliToAz(ecli: string): { az: string; senate: string } | null {
  // ECLI:DE:BGH:2017:130417UVIIZR13.16.0
  const parts = ecli.split(":");
  if (parts.length < 5) return null;
  const tail = parts[4]; // "130417UVIIZR13.16.0"

  // Datum (6 Ziffern) + Typ (1 Buchstabe) + Senat-Az.
  const m = /^\d{6}([A-Z])([IVX]+[A-Z]+\d+\.\d+)/.exec(tail);
  if (!m) return null;

  const azCompact = m[2]; // "VIIZR13.16"
  const azMatch = /^([IVX]+)([A-Z]+)(\d+)\.(\d+)$/.exec(azCompact);
  if (!azMatch) return null;

  const senate = `${azMatch[1]} ${azMatch[2]}`; // "VII ZR"
  const az = `${senate} ${azMatch[3]}/${azMatch[4]}`; // "VII ZR 13/16"
  return { az, senate };
}

function decisionTypeFromEcli(ecli: string): string | null {
  const parts = ecli.split(":");
  if (parts.length < 5) return null;
  const tail = parts[4];
  const m = /^\d{6}([A-Z])/.exec(tail);
  if (!m) return null;
  switch (m[1]) {
    case "U":
      return "Urteil";
    case "B":
      return "Beschluss";
    case "V":
      return "Versäumnisurteil";
    case "T":
      return "Teilurteil";
    case "Z":
      return "Zwischenurteil";
    default:
      return null;
  }
}

function courtKindFor(court: string): string {
  const upper = court.toUpperCase();
  if (upper === "BGH") return "BGH";
  if (upper === "BVERFG") return "BVerfG";
  if (upper === "BAG") return "BAG";
  if (upper === "BFH") return "BFH";
  if (upper === "BSG") return "BSG";
  if (upper === "BVERWG") return "BVerwG";
  if (upper.startsWith("OLG")) return "OLG";
  if (upper.startsWith("OVG")) return "OVG";
  if (upper.startsWith("LG")) return "LG";
  if (upper.startsWith("AG")) return "AG";
  return "andere";
}

function ecliToId(ecli: string): string {
  return ecli.replace(/[^A-Za-z0-9]/g, "_");
}

function isBauRelevant(entry: SitemapEntry): boolean {
  if (entry.court.toUpperCase() !== "BGH") return false;
  // ECLI-Az. enthält den Senat ohne Leerzeichen
  const ecliTail = entry.ecli.split(":")[4] ?? "";
  return BAU_SENATE_ECLI_PATTERN.test(ecliTail);
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

async function main() {
  console.log("⚖️  LexBau · Urteile-Fetcher");
  console.log("   Quelle: rechtsprechung-im-internet.de · ECLI-Index\n");

  console.log("▸ Lade robots.txt …");
  const dailyIndexes = await listSitemapDailyIndexes();
  console.log(`  ✓ ${dailyIndexes.length} Tagessitemap-Indizes verfügbar\n`);

  let totalEntries = 0;
  let bauHits = 0;
  const collected: Array<SitemapEntry & { az: string; senate: string }> = [];

  for (let i = 0; i < dailyIndexes.length; i++) {
    const indexUrl = dailyIndexes[i];
    const dayLabel = indexUrl.match(/(\d{4}\/\d{2}\/\d{2})/)?.[1] ?? "?";

    let dayChildren: string[];
    try {
      dayChildren = await listSitemapDayChildren(indexUrl);
    } catch (err) {
      console.warn(`  ⚠ ${dayLabel}: ${(err as Error).message}`);
      continue;
    }
    await sleep(REQUEST_DELAY_MS);

    let dayHits = 0;
    let dayTotal = 0;
    for (const child of dayChildren) {
      try {
        const xml = await fetchText(child);
        const entries = parseDailySitemap(xml);
        dayTotal += entries.length;
        for (const e of entries) {
          if (!isBauRelevant(e)) continue;
          const azInfo = ecliToAz(e.ecli);
          if (!azInfo) continue;
          collected.push({ ...e, az: azInfo.az, senate: azInfo.senate });
          dayHits++;
        }
      } catch (err) {
        console.warn(`  ⚠ Sitemap ${child}: ${(err as Error).message}`);
      }
      await sleep(REQUEST_DELAY_MS);
    }

    totalEntries += dayTotal;
    bauHits += dayHits;

    const progress = `[${String(i + 1).padStart(3, " ")}/${dailyIndexes.length}]`;
    if (dayHits > 0) {
      console.log(
        `  ${progress} ${dayLabel} · ${dayTotal} ECLI gesamt · ${dayHits} Bau-relevant`
      );
    } else if ((i + 1) % 25 === 0) {
      console.log(`  ${progress} ${dayLabel} · ${totalEntries} ECLI / ${bauHits} Treffer`);
    }
  }

  console.log("");
  console.log(`📊 Gesamt: ${totalEntries} ECLI-Einträge gescannt`);
  console.log(`   Davon ${bauHits} BGH-Entscheidungen mit baurelevantem Senat\n`);

  if (collected.length === 0) {
    console.log("⚠ Keine Treffer — DB nicht angefasst.");
    process.exit(0);
  }

  // Upsert: bei duplikaten (gleiche ECLI) Eintrag aktualisieren
  console.log("💾 Schreibe in DB …");
  let inserted = 0;
  let updated = 0;
  for (const c of collected) {
    const id = ecliToId(c.ecli);
    const courtKind = courtKindFor(c.court) as
      | "BGH"
      | "BVerfG"
      | "BAG"
      | "BFH"
      | "BSG"
      | "BVerwG"
      | "OLG"
      | "OVG"
      | "LG"
      | "AG"
      | "andere";

    const existing = await db
      .select({ id: schema.caseDecisions.id })
      .from(schema.caseDecisions)
      .where(eq(schema.caseDecisions.ecli, c.ecli))
      .limit(1);

    const data = {
      id,
      ecli: c.ecli,
      court: c.court,
      courtKind,
      senate: c.senate,
      az: c.az,
      date: c.date,
      decisionType: decisionTypeFromEcli(c.ecli),
      title: c.title || `${c.court} ${c.az}`,
      sourceUrl: c.sourceUrl,
      fetchedAt: new Date(),
    };

    if (existing.length > 0) {
      await db
        .update(schema.caseDecisions)
        .set(data)
        .where(eq(schema.caseDecisions.id, existing[0].id));
      updated++;
    } else {
      await db.insert(schema.caseDecisions).values(data);
      inserted++;
    }
  }

  console.log(`  ✓ ${inserted} neu eingefügt, ${updated} aktualisiert`);
  console.log("\n✅ Fertig.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fehler:", err);
  process.exit(1);
});
