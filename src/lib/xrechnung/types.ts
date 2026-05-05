/**
 * XRechnung-Typen + Codes (UBL 2.1, EN 16931).
 */
import type {
  Ausgangsrechnung,
  AusgangsrechnungPosition,
  Project,
  Workspace,
} from "@/db/schema";

/** UN/CEFACT Codeliste 1001 — Document Type Code (BT-3). */
export const INVOICE_TYPE_CODE = {
  /** Handelsrechnung (Schluss / einzelne). */
  COMMERCIAL: "380",
  /** Teilrechnung (Abschlag in Bauwesen — international 326). */
  PARTIAL: "326",
  /** Gutschrift. */
  CREDIT_NOTE: "381",
} as const;

/** ISO 4217 — Standard EUR. */
export const DEFAULT_CURRENCY = "EUR";

/** Profile-URN für XRechnung 3.x (CustomizationID, BT-24). */
export const XRECHNUNG_PROFILE_URN =
  "urn:cen.eu:en16931:2017#compliant#urn:xoev-de:kosit:standard:xrechnung_3.0";

/** Profile-ID für UBL 2.1 (BT-23) — XRechnung nutzt fix Reporting. */
export const XRECHNUNG_PROFILE_ID =
  "urn:fdc:peppol.eu:2017:poacc:billing:01:1.0";

/** UBL 2.1 Namespaces. */
export const UBL_NS = {
  invoice:
    "urn:oasis:names:specification:ubl:schema:xsd:Invoice-2",
  cac: "urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2",
  cbc: "urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2",
} as const;

/** Pflichtfeld-Validierungs-Result für XRechnung. */
export type XrechnungValidationResult =
  | { ok: true }
  | { ok: false; missing: string[]; warnings: string[] };

export type XrechnungContext = {
  ar: Ausgangsrechnung;
  positionen: AusgangsrechnungPosition[];
  project: Project;
  workspace: Workspace;
};
