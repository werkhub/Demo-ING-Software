/**
 * Ausgangsrechnungen-Logik (rein, ohne DB-Zugriffe).
 *
 * Berechnungs-Formeln:
 *   Positionen-Summe (netto)         = Σ position.totalPrice
 *   - vorherige Abschläge (netto)    = previousAbschlaegeNet
 *   - Sicherheitseinbehalt (netto)   = positionen-summe × securityRetentionPercent / 100
 *   = Auszahlbar (netto)             = payoutNet
 *   + USt                            = payoutNet × vatPercent / 100
 *   = Auszahlbar (brutto)            = payoutGross
 */
import type {
  AusgangsrechnungKind,
  AusgangsrechnungPosition,
  AusgangsrechnungStatus,
} from "@/db/schema";

export const AR_KIND_LABEL: Record<AusgangsrechnungKind, string> = {
  abschlag: "Abschlagsrechnung",
  schluss: "Schlussrechnung",
};

export const AR_STATUS_LABEL: Record<AusgangsrechnungStatus, string> = {
  entwurf: "Entwurf",
  versendet: "Versendet",
  teilweise_bezahlt: "Teilweise bezahlt",
  bezahlt: "Bezahlt",
  mahnung_1: "1. Mahnung",
  mahnung_2: "2. Mahnung",
  mahnung_3: "3. Mahnung",
  gerichtlich: "Gerichtliches Verfahren",
};

/**
 * Generiert die nächste Rechnungsnummer im Format AR-YYYY-NNNN.
 * Caller hat einen DB-Counter, der transactional inkrementiert wird.
 */
export function formatInvoiceNumber(year: number, n: number): string {
  return `AR-${year}-${String(n).padStart(4, "0")}`;
}

export type ArTotals = {
  totalPositionsNet: number;
  securityRetentionAmount: number;
  payoutNet: number;
  payoutVat: number;
  payoutGross: number;
};

export function computeArTotals(opts: {
  positionen: AusgangsrechnungPosition[];
  previousAbschlaegeNet: number;
  securityRetentionPercent: number | null;
  vatPercent: number;
}): ArTotals {
  const totalPositionsNet = opts.positionen.reduce(
    (sum, p) => sum + (p.totalPrice ?? 0),
    0
  );
  const securityRetentionAmount =
    opts.securityRetentionPercent !== null
      ? Math.round(
          (totalPositionsNet * opts.securityRetentionPercent) / 100 * 100
        ) / 100
      : 0;
  const payoutNet =
    Math.round(
      (totalPositionsNet - opts.previousAbschlaegeNet - securityRetentionAmount) *
        100
    ) / 100;
  const payoutVat =
    Math.round((payoutNet * opts.vatPercent) / 100 * 100) / 100;
  const payoutGross = Math.round((payoutNet + payoutVat) * 100) / 100;
  return {
    totalPositionsNet: Math.round(totalPositionsNet * 100) / 100,
    securityRetentionAmount,
    payoutNet,
    payoutVat,
    payoutGross,
  };
}

/** Status-Transitionen — analog zu Aufmaß. */
export function nextAllowedArStatuses(
  status: AusgangsrechnungStatus
): AusgangsrechnungStatus[] {
  switch (status) {
    case "entwurf":
      return ["versendet"];
    case "versendet":
      return ["teilweise_bezahlt", "bezahlt", "mahnung_1", "entwurf"];
    case "teilweise_bezahlt":
      return ["bezahlt", "mahnung_1"];
    case "mahnung_1":
      return ["bezahlt", "teilweise_bezahlt", "mahnung_2"];
    case "mahnung_2":
      return ["bezahlt", "teilweise_bezahlt", "mahnung_3"];
    case "mahnung_3":
      return ["bezahlt", "teilweise_bezahlt", "gerichtlich"];
    case "gerichtlich":
      return ["bezahlt"];
    case "bezahlt":
      return [];
  }
}

/** Edits sind nur im Entwurf erlaubt — Steuerrecht (Beleg-Stabilität). */
export function isArEditable(status: AusgangsrechnungStatus): boolean {
  return status === "entwurf";
}

/**
 * Schätzt das Standard-Zahlungsziel — Default: invoiceDate + 30 Tage
 * (§ 16 III VOB/B + § 286 III BGB).
 */
export function defaultDueDate(invoiceDateIso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(invoiceDateIso);
  if (!m) return invoiceDateIso;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}
