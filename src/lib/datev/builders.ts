/**
 * Builder, die aus LexBau-Domain-Objekten DATEV-Buchungssätze erzeugen.
 *
 * Drei Arten:
 *   buildVerkaufBuchungen — aus versendeten/bezahlten ARs
 *   buildLohnBuchungen    — aus Stunden monatlich aggregiert
 *   buildEinkaufNuBuchungen — aus NU-Eingangsrechnungen (kommt mit Modul 3.6)
 *
 * Beträge werden EUR (Float, 2 Nachkommastellen) erwartet — DB-Felder mit Cents
 * werden vor dem Aufruf zu EUR umgerechnet.
 */
import type {
  Ausgangsrechnung,
  DatevKontenrahmen,
  StundenEintrag,
  Mitarbeiter,
} from "@/db/schema";
import type { Buchungssatz } from "./extf";
import { resolveKonto, type DatevKontoKey } from "./konten";

type KontoResolver = (key: DatevKontoKey) => number;

function mkResolver(
  rahmen: DatevKontenrahmen,
  mappingJson: string | null
): KontoResolver {
  return (key) => resolveKonto(rahmen, key, mappingJson);
}

/**
 * Verkauf — pro AR ein Buchungssatz "Brutto S/Kunde — H/Erlös".
 * USt wird automatisch durch DATEV anhand des Erlös-Kontos berechnet.
 *
 * Filter: nur status IN (versendet, teilweise_bezahlt, bezahlt, mahnung_*).
 *         Entwürfe + gerichtlich werden ausgelassen.
 *
 * Zeitraum: invoiceDate liegt im [von, bis].
 */
export function buildVerkaufBuchungen(opts: {
  ars: Ausgangsrechnung[];
  rahmen: DatevKontenrahmen;
  mappingJson: string | null;
  zeitraumVon: string;
  zeitraumBis: string;
}): Buchungssatz[] {
  const r = mkResolver(opts.rahmen, opts.mappingJson);
  const out: Buchungssatz[] = [];
  const exportable = new Set([
    "versendet",
    "teilweise_bezahlt",
    "bezahlt",
    "mahnung_1",
    "mahnung_2",
    "mahnung_3",
  ]);
  for (const ar of opts.ars) {
    if (!exportable.has(ar.status)) continue;
    if (ar.invoiceDate < opts.zeitraumVon || ar.invoiceDate > opts.zeitraumBis) {
      continue;
    }
    const brutto = Number(ar.payoutGross);
    if (!Number.isFinite(brutto) || brutto <= 0) continue;

    // §13b-Heuristik: vatPercent = 0 + buyerReference gesetzt = i.d.R. RC.
    // Ein vollständiges §13b-Flag kommt mit Modul 4.5; bis dahin: vatPercent==0
    const isReverseCharge = Number(ar.vatPercent) === 0;
    const erloesKey: DatevKontoKey = isReverseCharge
      ? "erloese_rc_13b"
      : "erloese_19";

    const [y, m, d] = ar.invoiceDate.split("-").map(Number);
    const datum = new Date(y, (m ?? 1) - 1, d ?? 1);

    const kundeText = (ar.partyAg ?? "").slice(0, 30);
    out.push({
      umsatzEur: Math.round(brutto * 100) / 100,
      sollHaben: "S",
      konto: r("forderungen_kunde"),
      gegenkonto: r(erloesKey),
      belegdatum: datum,
      belegfeld1: ar.number,
      buchungstext: `${kundeText}${kundeText ? " · " : ""}${ar.subjectLine ?? ""}`.slice(
        0,
        60
      ),
    });
  }
  return out;
}

/**
 * Lohn — Stunden werden pro Monat × MA aggregiert. Aufwand auf 4100/6010,
 * Verbindlichkeit auf 1740/3740 (Lohn-Verrechnung).
 *
 * Eine Buchung pro Monat × MA. Mehrere MAs in einem Monat → mehrere Zeilen.
 */
export function buildLohnBuchungen(opts: {
  stunden: StundenEintrag[];
  mitarbeiter: Map<string, Mitarbeiter>;
  rahmen: DatevKontenrahmen;
  mappingJson: string | null;
  zeitraumVon: string;
  zeitraumBis: string;
}): Buchungssatz[] {
  const r = mkResolver(opts.rahmen, opts.mappingJson);
  const out: Buchungssatz[] = [];

  // Aggregation Map<"YYYY-MM:maId", { lohnCents, lastDate }>
  const agg = new Map<
    string,
    { lohnCents: number; lastDate: string; maId: string; ym: string }
  >();
  for (const s of opts.stunden) {
    if (s.datum < opts.zeitraumVon || s.datum > opts.zeitraumBis) continue;
    const ym = s.datum.slice(0, 7); // YYYY-MM
    const key = `${ym}:${s.mitarbeiterId}`;
    const lohn = Math.round(s.stunden * s.stundensatzCents);
    const cur = agg.get(key);
    if (cur) {
      cur.lohnCents += lohn;
      if (s.datum > cur.lastDate) cur.lastDate = s.datum;
    } else {
      agg.set(key, {
        lohnCents: lohn,
        lastDate: s.datum,
        maId: s.mitarbeiterId,
        ym,
      });
    }
  }

  for (const { lohnCents, lastDate, maId, ym } of agg.values()) {
    if (lohnCents <= 0) continue;
    const ma = opts.mitarbeiter.get(maId);
    const maName = ma?.name ?? "Unbekannt";
    const persNr = ma?.personalnummer ?? "";
    const [y, m, d] = lastDate.split("-").map(Number);
    const datum = new Date(y, (m ?? 1) - 1, d ?? 1);
    out.push({
      umsatzEur: Math.round(lohnCents) / 100,
      sollHaben: "S",
      konto: r("aufwand_lohn"),
      gegenkonto: r("verbindlichkeit_lohn"),
      belegdatum: datum,
      belegfeld1: persNr || `MA-${maId.slice(-6)}`,
      belegfeld2: ym.replace("-", ""), // YYYYMM
      buchungstext: `Lohn ${ym} · ${maName}`,
    });
  }
  return out;
}
