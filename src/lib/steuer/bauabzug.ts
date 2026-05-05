/**
 * Bauabzugsteuer (§ 48 ff. EStG).
 *
 *   § 48  EStG    — 15 % Steuerabzug von der Gegenleistung für Bauleistungen
 *   § 48b EStG    — Freistellungsbescheinigung als Befreiungstatbestand
 *   § 48a EStG    — Anmeldung + Abführung an das Finanzamt bis zum 10. des
 *                   Folgemonats
 *
 * Reine Berechnungs-/Prüf-Logik. Caller liefert Snapshot-Daten und ruft die
 * `registerAbfuehrung`-Server-Action getrennt auf.
 */
import type { Subcontractor } from "@/db/schema";

/** Abzugssatz nach § 48 I S. 1 EStG. */
export const BAUABZUG_PERCENT = 15;

/** Bagatellgrenze pro Auftrag (§ 48 II EStG): 5.000 €, bei Vermietung 15.000 €. */
export const BAUABZUG_BAGATELLGRENZE_CENTS = 5_000_00;

/** Subset NU-Felder für die `needsAbzug`-Prüfung. */
export type BauabzugNuInput = Pick<
  Subcontractor,
  "freistellungsbescheinigungNr" | "freistellungsbescheinigungGueltigBis"
>;

/**
 * Prüft, ob für eine NU-Eingangsrechnung Bauabzug einzubehalten ist.
 *
 * Bauabzug GREIFT, wenn:
 *   - Workspace ist abzugspflichtig (Caller stellt sicher)
 *   - NU hat KEINE gültige Freistellungsbescheinigung am `referenceDate`
 *   - (Bagatell-Prüfung erfolgt separat in `computeAbzug`, da abhängig vom Brutto)
 *
 * `referenceDate` ist üblicherweise das Rechnungsdatum (invoiceDate).
 * Format YYYY-MM-DD.
 */
export function needsAbzug(
  nu: BauabzugNuInput,
  referenceDateIso: string
): boolean {
  const nr = nu.freistellungsbescheinigungNr?.trim();
  const validUntil = nu.freistellungsbescheinigungGueltigBis?.trim();
  if (!nr || !validUntil) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validUntil)) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDateIso)) return true;
  // Lexikographischer Vergleich auf YYYY-MM-DD: validUntil >= reference => gültig
  return validUntil < referenceDateIso;
}

export type BauabzugComputation = {
  /** Soll Bauabzug greifen? false bei Bagatelle oder Freistellung. */
  applies: boolean;
  /** Einbehalts-Betrag in Cent (gerundet). 0 wenn applies=false. */
  einbehaltCents: number;
  /** Auszuzahlender Restbetrag in Cent. */
  auszahlungCents: number;
  /** Begründung für UI/Audit. */
  reason: string;
};

/**
 * Berechnet den 15 %-Einbehalt aus dem Bruttobetrag, mit Bagatellgrenzen-
 * Prüfung. Rundung kaufmännisch auf volle Cent (Math.round).
 *
 * `needs` kommt typischerweise aus `needsAbzug`. Die Trennung erlaubt
 * Override-Szenarien (z. B. NU mit gültiger Bescheinigung, aber Workspace
 * blockiert manuell).
 */
export function computeAbzug(opts: {
  bruttoCents: number;
  needs: boolean;
}): BauabzugComputation {
  if (!opts.needs) {
    return {
      applies: false,
      einbehaltCents: 0,
      auszahlungCents: opts.bruttoCents,
      reason: "Gültige Freistellungsbescheinigung — kein Bauabzug",
    };
  }
  if (opts.bruttoCents < BAUABZUG_BAGATELLGRENZE_CENTS) {
    return {
      applies: false,
      einbehaltCents: 0,
      auszahlungCents: opts.bruttoCents,
      reason: `Bagatelle — Brutto unter ${BAUABZUG_BAGATELLGRENZE_CENTS / 100} € (§ 48 II EStG)`,
    };
  }
  const einbehaltCents = Math.round(
    (opts.bruttoCents * BAUABZUG_PERCENT) / 100
  );
  return {
    applies: true,
    einbehaltCents,
    auszahlungCents: opts.bruttoCents - einbehaltCents,
    reason: `${BAUABZUG_PERCENT} % Bauabzug nach § 48 EStG`,
  };
}

/**
 * Berechnet die Anmelde-Frist für einen Einbehalts-Monat. Anmeldung muss bis
 * zum 10. des Folgemonats beim Finanzamt eingehen (§ 48a I EStG).
 *
 * `monthIso` = "YYYY-MM" des Einbehaltungs-Monats.
 * Rückgabe: ISO YYYY-MM-DD.
 */
export function anmeldungDeadline(monthIso: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(monthIso);
  if (!m) throw new Error(`Ungültiger Monat: ${monthIso}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  // Folgemonat, 10. Tag
  const next = new Date(Date.UTC(year, month, 10));
  return next.toISOString().slice(0, 10);
}

/** Liefert "YYYY-MM" des Vormonats (für Sammel-Anmeldung am 5. des Monats). */
export function previousMonthIso(today: Date = new Date()): string {
  const d = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 1, 1)
  );
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Liefert das ISO-Datum des ersten und letzten Tags eines "YYYY-MM"-Monats. */
export function monthRange(monthIso: string): { from: string; to: string } {
  const m = /^(\d{4})-(\d{2})$/.exec(monthIso);
  if (!m) throw new Error(`Ungültiger Monat: ${monthIso}`);
  const year = Number(m[1]);
  const month = Number(m[2]);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const last = new Date(Date.UTC(year, month, 0));
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
}
