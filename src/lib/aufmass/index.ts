/**
 * Aufmaß-Logik (rein, ohne DB-Zugriffe).
 */
import type {
  AufmassStatus,
  AufmassZeile,
  AufmassZeileStatus,
} from "@/db/schema";

export const AUFMASS_STATUS_LABEL: Record<AufmassStatus, string> = {
  entwurf: "Entwurf",
  eingereicht: "Eingereicht",
  geprueft: "Geprüft",
  freigegeben: "Freigegeben",
  abgerechnet: "Abgerechnet",
};

export const AUFMASS_ZEILE_STATUS_LABEL: Record<AufmassZeileStatus, string> = {
  offen: "Offen",
  zugestimmt: "Zugestimmt",
  gekuerzt: "Gekürzt",
  bestritten: "Bestritten",
};

/** Edits an Zeilen sind nur im Entwurf erlaubt. */
export function isEditable(status: AufmassStatus): boolean {
  return status === "entwurf";
}

/** Status-Transitionen — welche Folge-Stati sind aus dem aktuellen Status erlaubt? */
export function nextAllowedStatuses(status: AufmassStatus): AufmassStatus[] {
  switch (status) {
    case "entwurf":
      return ["eingereicht"];
    case "eingereicht":
      return ["geprueft", "entwurf"]; // Zurücksetzen bei Fehlübermittlung
    case "geprueft":
      return ["freigegeben", "eingereicht"];
    case "freigegeben":
      return ["abgerechnet", "geprueft"];
    case "abgerechnet":
      return [];
  }
}

export type AufmassTotals = {
  /** Summe der ursprünglich erfassten totalPrice (alle Zeilen). */
  totalNet: number;
  /** Summe der approvedTotal (gekürzte Mengen) bzw. totalPrice (sonst). */
  totalApprovedNet: number;
  zeilenCount: number;
  zeilenWithErrors: number;
  zeilenGekuerzt: number;
  zeilenBestritten: number;
};

/**
 * Aggregat über alle Zeilen eines Aufmaßes. totalApprovedNet ist die
 * abrechnungsrelevante Summe — bei „gekürzt" zählt approvedTotal, bei
 * „bestritten" zählt 0, sonst zählt totalPrice.
 */
export function computeAufmassTotals(zeilen: AufmassZeile[]): AufmassTotals {
  let totalNet = 0;
  let totalApprovedNet = 0;
  let zeilenWithErrors = 0;
  let zeilenGekuerzt = 0;
  let zeilenBestritten = 0;
  for (const z of zeilen) {
    if (z.formulaError) zeilenWithErrors += 1;
    const tp = z.totalPrice ?? 0;
    totalNet += tp;
    if (z.status === "bestritten") {
      zeilenBestritten += 1;
      // 0 zur approvedSumme
    } else if (z.status === "gekuerzt") {
      zeilenGekuerzt += 1;
      totalApprovedNet += z.approvedTotal ?? 0;
    } else {
      // offen / zugestimmt
      totalApprovedNet += tp;
    }
  }
  return {
    totalNet: Math.round(totalNet * 100) / 100,
    totalApprovedNet: Math.round(totalApprovedNet * 100) / 100,
    zeilenCount: zeilen.length,
    zeilenWithErrors,
    zeilenGekuerzt,
    zeilenBestritten,
  };
}
