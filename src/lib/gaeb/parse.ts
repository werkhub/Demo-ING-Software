/**
 * GAEB DA XML 3.x Parser.
 *
 * Unterstützt die Standard-Hierarchie:
 *   GAEB > Award > BoQ > BoQBody > BoQCtgy* > BoQItem*
 *
 * Felder, die wir lesen:
 *   AwardingAuthority/Name           → partyAg
 *   Bidder/Name                      → partyAn (bei X83/X84)
 *   Currency                         → currency
 *   BoQCtgy/RNoPart                  → kind=titel/untertitel (Tiefe), oz
 *   BoQCtgy/LblTx/p                  → shortText
 *   BoQItem/RNoPart                  → oz
 *   BoQItem/Qty                      → quantity
 *   BoQItem/QU                       → unit
 *   BoQItem/UP/UPCOMP                → unitPrice (oder Total/UP / UPCT?)
 *   BoQItem/Description/CompleteText/DetailTxt/Text/p  → longText
 *   BoQItem/Description/OutlineText/OutlTxt/TextOutlTxt/p  → shortText (fallback)
 *
 * Bewusst tolerant gegen kleine Varianten (Hersteller-Quirks). Bei harten
 * Strukturfehlern → GaebParseError (fail-loud, kein silent-empty).
 */
import { XMLParser } from "fast-xml-parser";
import type { LvItemKind } from "@/db/schema";
import {
  GaebParseError,
  type GaebDocType,
  type GaebParseResult,
  type GaebParsedItem,
} from "./types";

type XmlNode = Record<string, unknown>;

function asArray<T>(v: T | T[] | undefined | null): T[] {
  if (v === undefined || v === null) return [];
  return Array.isArray(v) ? v : [v];
}

function getStr(node: unknown): string | null {
  if (node === null || node === undefined) return null;
  if (typeof node === "string") return node.trim() || null;
  if (typeof node === "number") return String(node);
  if (typeof node === "object") {
    const o = node as XmlNode;
    // fast-xml-parser packt Text in #text wenn Attribute existieren
    if (typeof o["#text"] === "string") return (o["#text"] as string).trim() || null;
    // Manche GAEB-Generatoren verschachteln Text in <p>
    if (o.p !== undefined) return getStr(o.p);
  }
  return null;
}

function getNum(node: unknown): number | null {
  const s = getStr(node);
  if (s === null) return null;
  // GAEB nutzt deutsche oder englische Zahlen — beide tolerieren
  const cleaned = s.replace(/\./g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Sammelt alle <p>-Elemente aus einem geschachtelten Description-Knoten. */
function collectParagraphs(node: unknown): string[] {
  if (node === null || node === undefined) return [];
  if (typeof node === "string") {
    const s = node.trim();
    return s ? [s] : [];
  }
  if (Array.isArray(node)) {
    return node.flatMap((c) => collectParagraphs(c));
  }
  if (typeof node === "object") {
    const o = node as XmlNode;
    const out: string[] = [];
    for (const [key, val] of Object.entries(o)) {
      if (key === "#text") {
        const s = String(val).trim();
        if (s) out.push(s);
      } else if (key === "p") {
        out.push(...asArray(val).map((p) => getStr(p) ?? "").filter(Boolean));
      } else if (typeof val === "object" && val !== null) {
        out.push(...collectParagraphs(val));
      }
    }
    return out;
  }
  return [];
}

/**
 * Liest den Long-Text aus einem BoQItem — durchsucht die typischen
 * Description-Pfade.
 */
function extractLongText(item: XmlNode): string | null {
  const desc = item.Description as XmlNode | undefined;
  if (!desc) return null;
  const candidates = [
    (desc.CompleteText as XmlNode | undefined)?.DetailTxt,
    (desc.CompleteText as XmlNode | undefined)?.OutlineText,
    desc.OutlineText,
    desc.DetailTxt,
  ];
  for (const c of candidates) {
    const lines = collectParagraphs(c);
    if (lines.length > 0) return lines.join("\n");
  }
  return null;
}

function extractShortText(item: XmlNode): string {
  const desc = item.Description as XmlNode | undefined;
  if (desc) {
    const outline = (desc.OutlineText as XmlNode | undefined) ?? desc.OutlTxt;
    const lines = collectParagraphs(outline);
    if (lines.length > 0) return lines[0];
  }
  // Fallback auf RNoPart wenn sonst nichts da
  return getStr(item.RNoPart) ?? "(ohne Bezeichnung)";
}

function extractCtgyShortText(ctgy: XmlNode): string {
  const lbl = ctgy.LblTx ?? ctgy.LblTxt;
  const lines = collectParagraphs(lbl);
  if (lines.length > 0) return lines[0];
  return getStr(ctgy.RNoPart) ?? "(Titel)";
}

function extractUnitPrice(item: XmlNode): number | null {
  // Pfad bei X83/X84: <UP><UPS><UPSComp>price</UPSComp></UPS></UP>
  // Pragmatisch: erste numerische UP-Komponente nehmen.
  const up = item.UP as XmlNode | undefined;
  if (up) {
    const v =
      getNum((up.UPS as XmlNode | undefined)?.UPSComp) ??
      getNum(up.UPComp) ??
      getNum(up);
    if (v !== null) return v;
  }
  return null;
}

function detectDocType(award: XmlNode): GaebDocType {
  // <Award><DP><Award> usw. — GAEB packt den Typ häufig in <DP> (Document Profile).
  const dp = award.DP as XmlNode | undefined;
  if (!dp) return "unknown";
  const docTypeRaw =
    getStr(dp.DocType) ??
    getStr(dp.DocCtgy) ??
    getStr(dp.PrjType);
  if (!docTypeRaw) return "unknown";
  const upper = docTypeRaw.toUpperCase();
  if (upper.includes("X81")) return "X81";
  if (upper.includes("X83")) return "X83";
  if (upper.includes("X84")) return "X84";
  if (upper.includes("X86")) return "X86";
  return "unknown";
}

/**
 * Hauptfunktion: GAEB-XML → strukturiertes Result.
 *
 * Wirft GaebParseError bei harten Strukturproblemen — silent-default ist
 * verboten, weil ein leeres LV als „erfolgreich" leise täuschen würde.
 */
export function parseGaebXml(xml: string): GaebParseResult {
  if (!xml || xml.trim().length === 0) {
    throw new GaebParseError("Datei ist leer.");
  }
  if (!xml.includes("<")) {
    throw new GaebParseError("Datei ist keine XML-Datei (keine Tags gefunden).");
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "",
    parseAttributeValue: false,
    trimValues: true,
    // Single-Element-Arrays werden korrekt als Array gewünscht für BoQCtgy/BoQItem
    isArray: (name) => ["BoQCtgy", "BoQItem", "p"].includes(name),
  });

  let parsed: XmlNode;
  try {
    parsed = parser.parse(xml) as XmlNode;
  } catch (e) {
    throw new GaebParseError(
      "XML-Parse-Fehler: " + (e instanceof Error ? e.message : String(e))
    );
  }

  const root = (parsed.GAEB ?? parsed) as XmlNode;
  const award = root.Award as XmlNode | undefined;
  if (!award) {
    throw new GaebParseError(
      "Kein <Award>-Element gefunden — vermutlich kein GAEB DA XML 3.x.",
      "Wir unterstützen aktuell GAEB DA XML 3.x (Dateiendungen .X83/.X84/.xml). Ältere Formate (GAEB 90, GAEB 2000) werden nicht erkannt."
    );
  }

  const versionLabel =
    getStr(root.GAEBInfo) ??
    getStr((root.GAEBInfo as XmlNode | undefined)?.Version) ??
    "GAEB DA XML 3.x";
  const docType = detectDocType(award);

  // Stammdaten aus Award/PrjInfo / AwardingAuthority / Bidder
  const partyAg =
    getStr(((award.PrjInfo as XmlNode | undefined)?.AwardingAuthority as XmlNode | undefined)?.Name) ??
    getStr((award.AwardingAuthority as XmlNode | undefined)?.Name);
  const partyAn = getStr(
    ((award.PrjInfo as XmlNode | undefined)?.Bidder as XmlNode | undefined)?.Name
  );
  const currency =
    getStr((award.PrjInfo as XmlNode | undefined)?.Cur) ??
    getStr(award.Currency) ??
    "EUR";

  const boq = award.BoQ as XmlNode | undefined;
  if (!boq) {
    throw new GaebParseError("Kein <BoQ>-Element gefunden.");
  }
  const boqBody = boq.BoQBody as XmlNode | undefined;
  if (!boqBody) {
    throw new GaebParseError("Kein <BoQBody>-Element gefunden.");
  }

  const items: GaebParsedItem[] = [];
  let counter = 0;
  const nextId = () => `gaeb-${counter++}`;
  let totalNet = 0;

  function walk(
    node: XmlNode,
    parentLocalId: string | null,
    depth: number,
    sortStart: number
  ): number {
    let sort = sortStart;
    const ctgys = asArray(node.BoQCtgy as XmlNode | XmlNode[] | undefined);
    for (const c of ctgys) {
      const localId = nextId();
      const kind: LvItemKind = depth === 0 ? "titel" : "untertitel";
      items.push({
        localId,
        parentLocalId,
        kind,
        oz: getStr(c.RNoPart),
        shortText: extractCtgyShortText(c),
        longText: null,
        quantity: null,
        unit: null,
        unitPrice: null,
        totalPrice: null,
        externalId: getStr(c.RNoPart),
        sortIndex: sort++,
      });
      // Rekursion: erst weitere Untertitel, dann Items
      walk(c.BoQBody as XmlNode | undefined ?? c, localId, depth + 1, 0);
    }

    const itemsXml = asArray(node.BoQItem as XmlNode | XmlNode[] | undefined);
    for (const it of itemsXml) {
      const quantity = getNum(it.Qty);
      const unitPrice = extractUnitPrice(it);
      const totalPrice =
        quantity !== null && unitPrice !== null
          ? Math.round(quantity * unitPrice * 100) / 100
          : null;
      // Eventual / Bedarfsposition aus Attributen erkennen
      const itemType = (it.ItemType as string | undefined) ?? "";
      let kind: LvItemKind = "position";
      if (/eventual|bedarf|optional/i.test(itemType)) {
        kind = itemType.toLowerCase().includes("bedarf")
          ? "bedarfsposition"
          : "eventual";
      } else if (/stunden|hourly/i.test(itemType)) {
        kind = "stundenlohn";
      }
      items.push({
        localId: nextId(),
        parentLocalId,
        kind,
        oz: getStr(it.RNoPart),
        shortText: extractShortText(it),
        longText: extractLongText(it),
        quantity,
        unit: getStr(it.QU),
        unitPrice,
        totalPrice,
        externalId: getStr(it.RNoPart),
        sortIndex: sort++,
      });
      if (kind === "position" && totalPrice !== null) {
        totalNet += totalPrice;
      }
    }
    return sort;
  }

  walk(boqBody, null, 0, 0);

  if (items.length === 0) {
    throw new GaebParseError(
      "Keine Positionen oder Titel im LV gefunden.",
      "Möglicherweise eine leere oder ungewöhnlich strukturierte GAEB-Datei."
    );
  }

  return {
    versionLabel: docType !== "unknown" ? `${versionLabel} / ${docType}` : versionLabel,
    docType,
    partyAg,
    partyAn,
    currency,
    totalNet: Math.round(totalNet * 100) / 100,
    items,
  };
}
