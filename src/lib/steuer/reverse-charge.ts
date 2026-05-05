/**
 * Reverse-Charge-Erkennung für Bauleistungen.
 *
 *   § 13b II Nr. 4 UStG    — Steuerschuldnerschaft des Leistungsempfängers bei
 *                            Bauleistungen
 *   § 13b V S. 2 UStG      — gilt nur, wenn der Empfänger selbst Bauleistungen
 *                            erbringt (Bauunternehmer)
 *   § 14a V UStG           — Pflichtangabe in der Rechnung: "Steuerschuldnerschaft
 *                            des Leistungsempfängers"
 *
 * Reine Logik, keine DB-Zugriffe — Caller liefert Snapshot der Daten.
 */
import type { Ausgangsrechnung, Project } from "@/db/schema";

/** Pflichthinweis nach § 14a V UStG. Wörtliche Formulierung. */
export const REVERSE_CHARGE_HINWEIS =
  "Steuerschuldnerschaft des Leistungsempfängers § 13b UStG";

/** Subset der AR-Felder, die die RC-Logik braucht — vereinfacht das Testen. */
export type ReverseChargeArInput = Pick<
  Ausgangsrechnung,
  | "recipientIsBauunternehmer"
  | "recipientVatId"
  | "partyAnVatId"
  | "partyAnTaxId"
>;

/** Subset der Projekt-Felder, die die RC-Logik braucht. */
export type ReverseChargeProjectInput = Pick<Project, "isBauleistung">;

export type ReverseChargeResult = {
  /** RC anwendbar? Nur dann darf die Rechnung ohne USt-Ausweis gehen. */
  applies: boolean;
  /** Begründung für UI/Audit, immer gesetzt. */
  reason: string;
  /** Pflichthinweis-Text — null, wenn applies=false. */
  hinweis: string | null;
  /**
   * Liste fehlender Pflichtangaben, falls applies=true. Leer = alle
   * Pflichtangaben vorhanden, Rechnung darf so versendet werden.
   */
  missing: string[];
};

/**
 * Prüft, ob Reverse-Charge nach § 13b UStG auf eine Ausgangsrechnung anwendbar
 * ist. Drei Voraussetzungen:
 *   (1) Leistung ist Bauleistung (project.isBauleistung)
 *   (2) Empfänger ist Bauunternehmer (ar.recipientIsBauunternehmer)
 *   (3) Empfänger hat USt-IdNr. (ar.recipientVatId)
 *
 * Alle drei müssen erfüllt sein. Fehlende Voraussetzungen werden in `reason`
 * dokumentiert. Wenn anwendbar, prüft die Funktion zusätzlich, ob die
 * Pflichtangaben auf AN-Seite (Steuernummer ODER USt-IdNr) vorhanden sind.
 */
export function isReverseCharge(
  ar: ReverseChargeArInput,
  project: ReverseChargeProjectInput
): ReverseChargeResult {
  const reasons: string[] = [];
  if (!project.isBauleistung) {
    reasons.push("Projekt ist keine Bauleistung");
  }
  if (!ar.recipientIsBauunternehmer) {
    reasons.push("Empfänger ist nicht Bauunternehmer");
  }
  if (!ar.recipientVatId || ar.recipientVatId.trim() === "") {
    reasons.push("Empfänger ohne USt-IdNr.");
  }

  if (reasons.length > 0) {
    return {
      applies: false,
      reason: reasons.join(" · "),
      hinweis: null,
      missing: [],
    };
  }

  const missing: string[] = [];
  const hasAnTaxIdent =
    (ar.partyAnTaxId && ar.partyAnTaxId.trim() !== "") ||
    (ar.partyAnVatId && ar.partyAnVatId.trim() !== "");
  if (!hasAnTaxIdent) {
    missing.push("Steuernummer oder USt-IdNr. des Leistenden (§ 14 IV Nr. 2 UStG)");
  }

  return {
    applies: true,
    reason: "Bauleistung an Bauunternehmer-Empfänger mit USt-IdNr.",
    hinweis: REVERSE_CHARGE_HINWEIS,
    missing,
  };
}

export type ReverseChargeAusweis = {
  /** Effektive USt — bei RC immer 0. */
  effectiveVatPercent: number;
  /** Effektiver USt-Betrag — bei RC immer 0. */
  effectiveVatAmount: number;
  /** Brutto = Netto bei RC. */
  effectiveGross: number;
  /** Pflichthinweis für die Rechnung. */
  hinweis: string;
  /** Begründung der RC-Aktivierung (in Audit-Log). */
  grund: string;
};

/**
 * Erzeugt die RC-Ausweis-Werte für eine Rechnung. Ersetzt die normale
 * USt-Berechnung — die Rechnung weist 0 % USt aus, dafür den Pflichthinweis
 * und nennt die Begründung.
 *
 * Caller (Server-Action für Versand) prüft vorher mit `isReverseCharge`,
 * dass `applies=true` und `missing.length === 0`.
 */
export function generateRcAusweis(opts: {
  netNet: number;
  grund: string | null;
}): ReverseChargeAusweis {
  return {
    effectiveVatPercent: 0,
    effectiveVatAmount: 0,
    effectiveGross: opts.netNet,
    hinweis: REVERSE_CHARGE_HINWEIS,
    grund:
      opts.grund && opts.grund.trim() !== ""
        ? opts.grund
        : "Bauleistung an Bauunternehmer-Empfänger nach § 13b II Nr. 4 UStG",
  };
}
