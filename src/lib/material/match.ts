/**
 * Modul 3.4 — 3-Way-Match: Bestellung × Lieferschein(e) × Eingangsrechnung.
 *
 * Pure Funktionen ohne DB-Zugriff. Eingaben sind die Roh-Tabellen-Zeilen aus
 * Drizzle bzw. minimale strukturelle Subsets davon.
 *
 * Zwei Stufen:
 *   1. matchBestellungMitLieferscheinen — gelieferte vs. bestellte Menge
 *   2. matchBestellungMitRechnung      — fakturierte Menge/Beträge vs. Bestellung
 *      (unter Berücksichtigung der tatsächlich gelieferten Mengen)
 *
 * Toleranz: Mengen prozentual, Beträge in Cent. Beide werden je Position
 * angewandt. Außerhalb → Eintrag in `abweichungen[]`. Eine einzige Abweichung
 * macht aus dem Gesamt-Status `abweichung`.
 */

import {
  DEFAULT_TOLERANZ_CENTS,
  DEFAULT_TOLERANZ_PCT_MENGE,
  type MaterialMatchStatus,
} from "./index";

export type BestellpositionLike = {
  id: string;
  posNr: string;
  bezeichnung: string;
  menge: number;
  einzelpreisCents: number;
  gesamtpreisCents: number;
};

export type LieferscheinpositionLike = {
  /** Verknüpfung zur Bestell-Position. null = nicht zuordenbar. */
  bestellposId: string | null;
  bezeichnung: string;
  menge: number;
};

export type RechnungspositionLike = {
  /** Frei-Text-Verknüpfung zur LV/Bestell-Position. null = nicht zuordenbar. */
  lvPosition: string | null;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

export type LieferscheinDeltaArt =
  | "menge_zu_wenig"
  | "menge_zu_viel"
  | "rechnung_menge"
  | "rechnung_betrag"
  | "ohne_zuordnung";

export type Abweichung = {
  posNr: string;
  bezeichnung: string;
  art: LieferscheinDeltaArt;
  expected: number;
  actual: number;
  /** Prozent-Abweichung (positiv = actual > expected). null bei Cent-Abweichungen. */
  deltaPct: number | null;
  /** Absolute Differenz in derselben Einheit wie expected/actual. */
  deltaAbs: number;
};

export type LieferscheinAbgleich = {
  /** True, wenn alle Bestellpositionen vollständig (innerhalb Toleranz) geliefert. */
  complete: boolean;
  missingMengen: Abweichung[];
  surplusMengen: Abweichung[];
};

export type MatchResult = {
  status: MaterialMatchStatus;
  abweichungen: Abweichung[];
  /** Aggregierte gelieferte Menge je Bestellposition (nach bestellposId). */
  gelieferteMengeJeBestellpos: Record<string, number>;
};

function pct(actual: number, expected: number): number {
  if (expected === 0) return actual === 0 ? 0 : 100;
  return ((actual - expected) / expected) * 100;
}

/**
 * Vergleicht je Bestellposition die bestellte Menge gegen die Summe der
 * gelieferten Mengen (über alle Lieferscheine zur selben Bestellung).
 * Toleranz wird auf die Mengen-Prozent angewandt.
 */
export function matchBestellungMitLieferscheinen(
  bestellPositionen: BestellpositionLike[],
  lieferscheinPositionen: LieferscheinpositionLike[],
  toleranzPctMenge: number = DEFAULT_TOLERANZ_PCT_MENGE
): LieferscheinAbgleich {
  const geliefert = new Map<string, number>();
  for (const lp of lieferscheinPositionen) {
    if (!lp.bestellposId) continue;
    geliefert.set(lp.bestellposId, (geliefert.get(lp.bestellposId) ?? 0) + lp.menge);
  }

  const missing: Abweichung[] = [];
  const surplus: Abweichung[] = [];
  let complete = true;

  for (const bp of bestellPositionen) {
    const ist = geliefert.get(bp.id) ?? 0;
    const delta = ist - bp.menge;
    const dPct = pct(ist, bp.menge);
    const innerhalbToleranz = Math.abs(dPct) <= toleranzPctMenge;
    if (innerhalbToleranz) continue;
    complete = false;
    const entry: Abweichung = {
      posNr: bp.posNr,
      bezeichnung: bp.bezeichnung,
      art: delta < 0 ? "menge_zu_wenig" : "menge_zu_viel",
      expected: bp.menge,
      actual: ist,
      deltaPct: dPct,
      deltaAbs: delta,
    };
    if (delta < 0) missing.push(entry);
    else surplus.push(entry);
  }

  return { complete, missingMengen: missing, surplusMengen: surplus };
}

/**
 * Vergleicht eine Eingangsrechnung gegen Bestellung + tatsächlich gelieferte
 * Mengen. Vereinfachte Heuristik: Rechnungspositionen werden über
 * `rechnung.lvPosition` mit `bestellpos.posNr` verknüpft.
 *
 * Wenn keine Zuordnung möglich (lvPosition null oder nicht in Bestellung):
 * Eintrag in `abweichungen` mit Art `ohne_zuordnung`. Status wird dann
 * `unklar`, sofern es sonst keine harten Beträge-Abweichungen gibt.
 */
export function matchBestellungMitRechnung(opts: {
  bestellPositionen: BestellpositionLike[];
  lieferscheinPositionen: LieferscheinpositionLike[];
  rechnungPositionen: RechnungspositionLike[];
  toleranzPctMenge?: number;
  toleranzCents?: number;
}): MatchResult {
  const tolPct = opts.toleranzPctMenge ?? DEFAULT_TOLERANZ_PCT_MENGE;
  const tolCents = opts.toleranzCents ?? DEFAULT_TOLERANZ_CENTS;

  const bestellByPosNr = new Map<string, BestellpositionLike>();
  for (const bp of opts.bestellPositionen) {
    bestellByPosNr.set(bp.posNr, bp);
  }

  const geliefertJeBestellpos: Record<string, number> = {};
  for (const lp of opts.lieferscheinPositionen) {
    if (!lp.bestellposId) continue;
    geliefertJeBestellpos[lp.bestellposId] =
      (geliefertJeBestellpos[lp.bestellposId] ?? 0) + lp.menge;
  }

  const abweichungen: Abweichung[] = [];
  let hatBetragAbweichung = false;
  let hatOhneZuordnung = false;

  for (const rp of opts.rechnungPositionen) {
    const bp = rp.lvPosition ? bestellByPosNr.get(rp.lvPosition) : undefined;
    if (!bp) {
      hatOhneZuordnung = true;
      abweichungen.push({
        posNr: rp.lvPosition ?? "?",
        bezeichnung: rp.description,
        art: "ohne_zuordnung",
        expected: 0,
        actual: rp.quantity,
        deltaPct: null,
        deltaAbs: rp.quantity,
      });
      continue;
    }

    // Mengen-Vergleich: Rechnungsmenge vs. tatsächlich gelieferte Menge
    // (nicht vs. bestellte — der Lieferant kann nur abrechnen, was geliefert
    // wurde). Falls keine LS-Zuordnung existiert, fällt auf bestellte Menge
    // zurück.
    const ref = geliefertJeBestellpos[bp.id] ?? bp.menge;
    const dPctMenge = pct(rp.quantity, ref);
    if (Math.abs(dPctMenge) > tolPct) {
      abweichungen.push({
        posNr: bp.posNr,
        bezeichnung: bp.bezeichnung,
        art: "rechnung_menge",
        expected: ref,
        actual: rp.quantity,
        deltaPct: dPctMenge,
        deltaAbs: rp.quantity - ref,
      });
    }

    // Betrags-Vergleich: Rechnungs-Gesamtpreis vs. (gelieferte Menge × EP der
    // Bestellung). Toleranz in Cent.
    const expectedCents = Math.round(ref * bp.einzelpreisCents);
    const actualCents = Math.round(rp.totalPrice * 100);
    const deltaCents = actualCents - expectedCents;
    if (Math.abs(deltaCents) > tolCents) {
      hatBetragAbweichung = true;
      abweichungen.push({
        posNr: bp.posNr,
        bezeichnung: bp.bezeichnung,
        art: "rechnung_betrag",
        expected: expectedCents,
        actual: actualCents,
        deltaPct: pct(actualCents, expectedCents),
        deltaAbs: deltaCents,
      });
    }
  }

  let status: MaterialMatchStatus;
  if (abweichungen.length === 0) {
    status = "ok";
  } else if (hatBetragAbweichung || abweichungen.some((a) => a.art === "rechnung_menge")) {
    status = "abweichung";
  } else if (hatOhneZuordnung) {
    status = "unklar";
  } else {
    status = "abweichung";
  }

  return {
    status,
    abweichungen,
    gelieferteMengeJeBestellpos: geliefertJeBestellpos,
  };
}
