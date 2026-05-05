/**
 * Pure Helper für Projekt-Status-Wechsel — keine DB- oder Netzwerk-Calls.
 * Die Server-Action `setProjectStatus` konsumiert das Ergebnis und schreibt
 * dann persistent.
 *
 * Diese Trennung dient zwei Zielen:
 *   1. Testbarkeit der Frist-Auto-Anlage ohne Test-DB.
 *   2. Klare Erwartungs-Doku, was beim Phasen-Wechsel automatisch passiert.
 */

import type { ContractType, ProjectStatus } from "@/db/schema";

export const PROJECT_STATUSES: readonly ProjectStatus[] = [
  "Geplant",
  "Bauphase",
  "Abnahme",
  "Gewährleistung",
  "Abgeschlossen",
] as const;

export type AutoFrist = {
  task: string;
  deadline: string;
  legalBasis: string;
};

export type AbnahmeAutomations = {
  /** Datum der tatsächlichen Abnahme — nur gesetzt wenn vorher leer. */
  abnahmeDate: string | null;
  /** Berechnetes Gewährleistungs-Ende — nur gesetzt wenn vorher leer. */
  warrantyEnd: string | null;
  /** Auto-Fristen, die anzulegen sind (idempotent über `legalBasis`-Match). */
  fristen: AutoFrist[];
};

export function todayIso(now: Date = new Date()): string {
  return iso(now);
}

export function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function shiftIsoDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

/**
 * Gewährleistungs-Ende: BGB-Werkvertrag und Verbraucherbauvertrag 5 Jahre
 * (§ 634a BGB), VOB-Vertrag 4 Jahre (§ 13 Abs. 4 VOB/B). Default 5 Jahre,
 * wenn kein Vertragstyp gesetzt — konservativ zugunsten des AG.
 */
export function computeWarrantyEnd(
  abnahmeIso: string,
  contractType: ContractType | null
): string {
  const years = contractType === "vob_vertrag" ? 4 : 5;
  const d = new Date(`${abnahmeIso}T00:00:00Z`);
  d.setUTCFullYear(d.getUTCFullYear() + years);
  return iso(d);
}

/**
 * Berechnet alle Automatik-Werte beim Wechsel zu „Abnahme":
 *   - abnahmeDate (heute, falls leer)
 *   - warrantyEnd (BGB 5 J / VOB 4 J, falls leer)
 *   - Frist „Schlussrechnung erwarten" — § 16 Abs. 3 VOB/B, +30 d
 *   - Frist „Gewährleistung läuft ab" — −60 d vor warrantyEnd
 *
 * `now` wird für Tests injiziert. Wenn das Projekt bereits ein abnahmeDate
 * hat, wird das beibehalten (idempotenz).
 */
export function computeAbnahmeAutomations(opts: {
  currentAbnahmeDate: string | null;
  currentWarrantyEnd: string | null;
  contractType: ContractType | null;
  now?: Date;
}): AbnahmeAutomations {
  const abnahme =
    opts.currentAbnahmeDate ?? todayIso(opts.now ?? new Date());
  const warrantyEnd =
    opts.currentWarrantyEnd ?? computeWarrantyEnd(abnahme, opts.contractType);

  const fristen: AutoFrist[] = [
    {
      task: "Schlussrechnung erwarten — Prüf-/Zahlungsfrist anstoßen",
      deadline: shiftIsoDays(abnahme, 30),
      legalBasis: "§ 16 Abs. 3 VOB/B",
    },
    {
      task: "Gewährleistung läuft ab — letzte Mängel jetzt geltend machen",
      deadline: shiftIsoDays(warrantyEnd, -60),
      legalBasis:
        opts.contractType === "vob_vertrag"
          ? "§ 13 Abs. 4 VOB/B"
          : "§ 634a BGB",
    },
  ];

  return {
    abnahmeDate: opts.currentAbnahmeDate ? null : abnahme,
    warrantyEnd: opts.currentWarrantyEnd ? null : warrantyEnd,
    fristen,
  };
}

export function isValidStatus(s: string): s is ProjectStatus {
  return (PROJECT_STATUSES as readonly string[]).includes(s);
}
