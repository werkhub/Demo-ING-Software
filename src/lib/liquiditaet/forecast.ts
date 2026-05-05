/**
 * Liquiditäts-Forecast — pure logic ohne DB-Zugriffe.
 *
 * Eingaben:
 *   - Liste der ARs (Einnahmen-Quelle) mit Brutto + Fälligkeit
 *   - Liste der NU-Eingangsrechnungen (Ausgaben-Quelle) mit Brutto + Fälligkeit
 *   - Liste der Lohn-Aggregate pro Monat (Stunden × Stundensatz)
 *   - Geräte-Mieten (optional, Modul 3.3)
 *   - Konfiguration: basisdatum, horizontTage, Annahme-Fristen
 *
 * Ausgabe: Tagesreihe mit Saldo + kumuliertem Kontostand.
 *
 * Datums-Arithmetik: alles in UTC, vermeidet DST-Drift.
 */

export type ForecastInputAr = {
  /** ISO-Date — Rechnungsdatum. */
  invoiceDate: string;
  /** ISO-Date oder null — Fälligkeit (dueDate). Wenn null: invoiceDate + annahmeFristTage. */
  dueDate: string | null;
  bruttoCents: number;
  status: string;
  paidAt: Date | null;
};

export type ForecastInputNuRechnung = {
  rechnungsdatum: string;
  zahlungsdatum: string | null;
  bruttoCents: number;
  ausgezahltCents: number;
  status: string;
};

export type ForecastInputLohnMonat = {
  /** YYYY-MM Monat-Schlüssel. Auszahlung am letzten Werktag des Monats. */
  ym: string;
  bruttoCents: number;
};

export type ForecastInputMiete = {
  monatlichCents: number;
  /** ISO-Date — Beginn (oder null = ab basisdatum). */
  vonDatum: string | null;
  /** ISO-Date — Ende (oder null = bis horizont-Ende). */
  bisDatum: string | null;
  bezeichnung: string;
};

export type ForecastConfig = {
  basisdatum: string;
  horizontTage: number;
  annahmeFristTageAn: number;
  annahmeFristTageNu: number;
  kontostandStartCents: number;
};

export type ForecastDayRow = {
  datum: string;
  einnahmenCents: number;
  ausgabenCents: number;
  saldoCents: number;
  kontostandCents: number;
  kommentar: string | null;
};

/* ---------- Datums-Helper (UTC) ---------- */

function parseUtc(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

function addDaysUtc(iso: string, days: number): string {
  const d = parseUtc(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function diffDays(a: string, b: string): number {
  return Math.round(
    (parseUtc(a).getTime() - parseUtc(b).getTime()) / (1000 * 60 * 60 * 24)
  );
}

function lastDayOfMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  // Letzter Tag des Monats: 0. des Folgemonats
  const d = new Date(Date.UTC(y, m, 0));
  return d.toISOString().slice(0, 10);
}

/* ---------- Buckets ---------- */

type DayBucket = {
  einnahmen: number;
  ausgaben: number;
  kommentare: string[];
};

function ensureBucket(
  buckets: Map<string, DayBucket>,
  datum: string
): DayBucket {
  let b = buckets.get(datum);
  if (!b) {
    b = { einnahmen: 0, ausgaben: 0, kommentare: [] };
    buckets.set(datum, b);
  }
  return b;
}

function inHorizon(
  datum: string,
  basisdatum: string,
  endDatum: string
): boolean {
  return datum >= basisdatum && datum <= endDatum;
}

/* ---------- Hauptfunktion ---------- */

export function buildForecast(input: {
  config: ForecastConfig;
  ars: ForecastInputAr[];
  nuRechnungen: ForecastInputNuRechnung[];
  lohnMonate: ForecastInputLohnMonat[];
  mieten: ForecastInputMiete[];
}): ForecastDayRow[] {
  const { config } = input;
  const endDatum = addDaysUtc(config.basisdatum, config.horizontTage);
  const buckets = new Map<string, DayBucket>();

  // ARs: Einnahmen am Fälligkeitstag (oder invoiceDate + Frist)
  for (const ar of input.ars) {
    if (ar.paidAt) continue; // bereits bezahlt — fließt nicht mehr in Forecast
    if (ar.status === "entwurf") continue;
    const datum = ar.dueDate
      ? ar.dueDate
      : addDaysUtc(ar.invoiceDate, config.annahmeFristTageAn);
    if (!inHorizon(datum, config.basisdatum, endDatum)) continue;
    const b = ensureBucket(buckets, datum);
    b.einnahmen += ar.bruttoCents;
    b.kommentare.push(`AR ${(ar.bruttoCents / 100).toFixed(2)}€`);
  }

  // NU-Eingangsrechnungen: Ausgaben am Zahlungsdatum (oder rechnungsdatum + Frist)
  for (const r of input.nuRechnungen) {
    if (r.status === "gezahlt") continue;
    if (r.status === "strittig") continue; // strittige raus, sonst Schein-Sicherheit
    const datum = r.zahlungsdatum
      ? r.zahlungsdatum
      : addDaysUtc(r.rechnungsdatum, config.annahmeFristTageNu);
    if (!inHorizon(datum, config.basisdatum, endDatum)) continue;
    const betrag = r.ausgezahltCents > 0 ? r.ausgezahltCents : r.bruttoCents;
    const b = ensureBucket(buckets, datum);
    b.ausgaben += betrag;
    b.kommentare.push(`NU-Rechnung ${(betrag / 100).toFixed(2)}€`);
  }

  // Lohn-Aggregate: am letzten Tag des Monats
  for (const lohn of input.lohnMonate) {
    const datum = lastDayOfMonth(lohn.ym);
    if (!inHorizon(datum, config.basisdatum, endDatum)) continue;
    const b = ensureBucket(buckets, datum);
    b.ausgaben += lohn.bruttoCents;
    b.kommentare.push(`Lohn ${lohn.ym}`);
  }

  // Geräte-Mieten: monatlich am 1.
  for (const miete of input.mieten) {
    const von = miete.vonDatum ?? config.basisdatum;
    const bis = miete.bisDatum ?? endDatum;
    if (von > endDatum || bis < config.basisdatum) continue;
    // Erste Buchung: 1. des Monats von max(von, basisdatum)
    let cursor = von > config.basisdatum ? von : config.basisdatum;
    // Auf 1. des Monats setzen (erster Buchung-Tag)
    const startDate = parseUtc(cursor);
    if (startDate.getUTCDate() !== 1) {
      startDate.setUTCMonth(startDate.getUTCMonth() + 1, 1);
      cursor = startDate.toISOString().slice(0, 10);
    }
    while (cursor <= endDatum && cursor <= bis) {
      if (cursor >= config.basisdatum) {
        const b = ensureBucket(buckets, cursor);
        b.ausgaben += miete.monatlichCents;
        b.kommentare.push(`Miete ${miete.bezeichnung}`);
      }
      const next = parseUtc(cursor);
      next.setUTCMonth(next.getUTCMonth() + 1);
      cursor = next.toISOString().slice(0, 10);
    }
  }

  // Tagesreihe füllen — vollständig vom basisdatum bis basisdatum + horizont
  const out: ForecastDayRow[] = [];
  let kontostand = config.kontostandStartCents;
  for (let i = 0; i <= config.horizontTage; i++) {
    const datum = addDaysUtc(config.basisdatum, i);
    const b = buckets.get(datum);
    const ein = b?.einnahmen ?? 0;
    const aus = b?.ausgaben ?? 0;
    const saldo = ein - aus;
    kontostand += saldo;
    out.push({
      datum,
      einnahmenCents: ein,
      ausgabenCents: aus,
      saldoCents: saldo,
      kontostandCents: kontostand,
      kommentar: b?.kommentare.length ? b.kommentare.join(" · ") : null,
    });
  }
  return out;
}

/* ---------- Frühwarn ---------- */

export type LiquiditaetWarning = {
  datum: string;
  kontostandCents: number;
  daysFromBasis: number;
};

export function findEngeLiquiditaet(
  rows: ForecastDayRow[],
  warnHorizonDays = 14
): LiquiditaetWarning | null {
  if (rows.length === 0) return null;
  const basis = rows[0].datum;
  for (const row of rows) {
    const offset = diffDays(row.datum, basis);
    if (offset > warnHorizonDays) break;
    if (row.kontostandCents <= 0) {
      return {
        datum: row.datum,
        kontostandCents: row.kontostandCents,
        daysFromBasis: offset,
      };
    }
  }
  return null;
}

/* ---------- Aggregate für UI ---------- */

export function summarize(rows: ForecastDayRow[]): {
  einnahmenSumme: number;
  ausgabenSumme: number;
  kontostandMin: number;
  kontostandMax: number;
  kontostandEnde: number;
} {
  let ein = 0;
  let aus = 0;
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;
  for (const r of rows) {
    ein += r.einnahmenCents;
    aus += r.ausgabenCents;
    if (r.kontostandCents < min) min = r.kontostandCents;
    if (r.kontostandCents > max) max = r.kontostandCents;
  }
  return {
    einnahmenSumme: ein,
    ausgabenSumme: aus,
    kontostandMin: min === Number.POSITIVE_INFINITY ? 0 : min,
    kontostandMax: max === Number.NEGATIVE_INFINITY ? 0 : max,
    kontostandEnde: rows[rows.length - 1]?.kontostandCents ?? 0,
  };
}

/* ---------- Lohn-Aggregation aus Stunden-Liste ---------- */

export function aggregateLohnByMonth<
  T extends { datum: string; stunden: number; stundensatzCents: number },
>(stunden: T[]): ForecastInputLohnMonat[] {
  const acc = new Map<string, number>();
  for (const s of stunden) {
    const ym = s.datum.slice(0, 7);
    acc.set(ym, (acc.get(ym) ?? 0) + Math.round(s.stunden * s.stundensatzCents));
  }
  return Array.from(acc.entries()).map(([ym, bruttoCents]) => ({ ym, bruttoCents }));
}
