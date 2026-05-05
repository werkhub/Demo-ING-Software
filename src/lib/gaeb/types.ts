/**
 * GAEB DA XML 3.x — Typen für Parser-Output.
 *
 * Wir abstrahieren bewusst weg von der GAEB-XML-Verschachtelung und liefern
 * eine flache Item-Liste mit parentId-Refs, die direkt 1:1 in unsere
 * lv_items-Tabelle wandert.
 */
import type { LvItemKind } from "@/db/schema";

export type GaebDocType =
  | "X81"  // Anfrage (vom AG)
  | "X83"  // Angebot (vom AN)
  | "X84"  // Auftrag (vom AG, akzeptiertes Angebot)
  | "X86"  // Aufmaß-Übergabe
  | "unknown";

export type GaebParseResult = {
  /** Z. B. „GAEB DA XML 3.2 / X84". */
  versionLabel: string;
  docType: GaebDocType;
  partyAg: string | null;
  partyAn: string | null;
  currency: string;
  totalNet: number;
  items: GaebParsedItem[];
};

export type GaebParsedItem = {
  /** Stabile lokale ID innerhalb des Imports — ersetzt parentId-Refs. */
  localId: string;
  parentLocalId: string | null;
  kind: LvItemKind;
  oz: string | null;
  shortText: string;
  longText: string | null;
  quantity: number | null;
  unit: string | null;
  unitPrice: number | null;
  totalPrice: number | null;
  /** GAEB RNoPart oder vergleichbar — für Re-Import. */
  externalId: string | null;
  sortIndex: number;
};

/** Geworfener Parser-Fehler — fail-loud statt silent-default. */
export class GaebParseError extends Error {
  constructor(
    message: string,
    public hint?: string
  ) {
    super(message);
    this.name = "GaebParseError";
  }
}
