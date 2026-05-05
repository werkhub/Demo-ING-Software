/**
 * HOAI-Honorarrechner.
 *
 * Algorithmus:
 *   1. Tafel auswählen (gebaeude/ingenieurbau/tragwerk/tga)
 *   2. Stützstellen-Paar finden (untere + obere Schwelle für anrechenbare Kosten)
 *   3. Honorar je Schwelle für Zone × Satz (min/mittel/max) auslesen
 *   4. Linear interpolieren zwischen den beiden Stützstellen
 *   5. Mit Σ(LP-Anteile beauftragter LPs) multiplizieren = Grundhonorar
 *   6. Umbau-Zuschlag aufschlagen (optional)
 *   7. Nebenkosten-Pauschale aufschlagen (optional)
 *
 * Genauigkeit: zwischen Stützstellen lineare Interpolation. Gegenüber der
 * vollen HOAI-Tabelle (~30 Schwellen) Abweichung typisch < 1.5% — für
 * Projekt-Kalkulation ausreichend, nicht für gerichtliche Honorar-
 * berechnung gedacht (dafür HOAI-Volltext zu Rate ziehen).
 */
import { HONORARTAFELN } from "./honorartafeln";
import { LP_ANTEILE, isLpValid } from "./leistungsphasen";
import type {
  HoaiError,
  HoaiInput,
  HoaiResult,
  Honorartafel,
  Honorarsatz,
  Honorarzone,
  Leistungsphase,
  Stuetzstelle,
} from "./types";

/**
 * Liefert min/max-Wert einer Stützstelle für eine bestimmte Zone.
 */
function zoneAt(s: Stuetzstelle, zone: Honorarzone): {
  minCents: number;
  maxCents: number;
} {
  switch (zone) {
    case "I":
      return s.zoneI;
    case "II":
      return s.zoneII;
    case "III":
      return s.zoneIII;
    case "IV":
      return s.zoneIV;
    case "V":
      return s.zoneV;
  }
}

/**
 * Wendet Honorarsatz (min/mittel/max) auf min/max-Werte einer Zone an.
 */
function satzAnwenden(
  zone: { minCents: number; maxCents: number },
  satz: Honorarsatz
): number {
  switch (satz) {
    case "min":
      return zone.minCents;
    case "max":
      return zone.maxCents;
    case "mittel":
      return Math.round((zone.minCents + zone.maxCents) / 2);
  }
}

/**
 * Findet die untere und obere Stützstelle für anrechenbare Kosten.
 * Bei genauer Übereinstimmung mit einer Stützstelle: untere = obere.
 */
function findeStuetzstellen(
  tafel: Honorartafel,
  kostenCents: number
): { untere: Stuetzstelle; obere: Stuetzstelle } | null {
  const stellen = tafel.stuetzstellen;
  if (stellen.length === 0) return null;

  // Vor dem ersten oder nach dem letzten Stützpunkt? -> kein Interpolations-Paar
  if (kostenCents < stellen[0].kostenCents) return null;
  if (kostenCents > stellen[stellen.length - 1].kostenCents) return null;

  for (let i = 0; i < stellen.length - 1; i++) {
    const a = stellen[i];
    const b = stellen[i + 1];
    if (kostenCents >= a.kostenCents && kostenCents <= b.kostenCents) {
      return { untere: a, obere: b };
    }
  }
  return null;
}

/**
 * Validiert die Eingabe und liefert ggf. einen strukturierten Fehler.
 */
export function validate(
  input: HoaiInput
): { ok: true } | { ok: false; error: HoaiError } {
  const tafel = HONORARTAFELN[input.leistungsbild];

  if (input.anrechenbareKostenCents < tafel.kostenBereichMinCents) {
    return {
      ok: false,
      error: {
        kind: "kosten_unter_min",
        minCents: tafel.kostenBereichMinCents,
        gotCents: input.anrechenbareKostenCents,
      },
    };
  }
  if (input.anrechenbareKostenCents > tafel.kostenBereichMaxCents) {
    return {
      ok: false,
      error: {
        kind: "kosten_ueber_max",
        maxCents: tafel.kostenBereichMaxCents,
        gotCents: input.anrechenbareKostenCents,
      },
    };
  }
  if (input.beauftragteLps.length === 0) {
    return { ok: false, error: { kind: "keine_lps_beauftragt" } };
  }
  for (const lp of input.beauftragteLps) {
    if (!isLpValid(input.leistungsbild, lp)) {
      return {
        ok: false,
        error: {
          kind: "ungueltige_lp",
          lp,
          leistungsbild: input.leistungsbild,
        },
      };
    }
  }
  return { ok: true };
}

/**
 * Hauptfunktion. Berechnet das HOAI-Honorar gemäß Eingabe.
 *
 * Wirft NICHT — bei ungültiger Eingabe wird ein HoaiError zurückgegeben.
 */
export function calculate(
  input: HoaiInput
): { ok: true; result: HoaiResult } | { ok: false; error: HoaiError } {
  const validation = validate(input);
  if (!validation.ok) {
    return validation;
  }

  const tafel = HONORARTAFELN[input.leistungsbild];
  const paar = findeStuetzstellen(tafel, input.anrechenbareKostenCents);
  if (!paar) {
    // Sollte nach validate() nicht passieren, aber defensiv:
    return {
      ok: false,
      error: {
        kind: "kosten_ueber_max",
        maxCents: tafel.kostenBereichMaxCents,
        gotCents: input.anrechenbareKostenCents,
      },
    };
  }

  const { untere, obere } = paar;

  // Honorarwerte an den beiden Stützstellen unter Berücksichtigung des Satzes
  const honorarUntereSchwelleCents = satzAnwenden(
    zoneAt(untere, input.zone),
    input.satz
  );
  const honorarObereSchwelleCents = satzAnwenden(
    zoneAt(obere, input.zone),
    input.satz
  );

  // Linearer Interpolationsfaktor 0..1
  const range = obere.kostenCents - untere.kostenCents;
  const factor =
    range === 0
      ? 0
      : (input.anrechenbareKostenCents - untere.kostenCents) / range;

  const vollhonorarCents = Math.round(
    honorarUntereSchwelleCents +
      factor * (honorarObereSchwelleCents - honorarUntereSchwelleCents)
  );

  // LP-Anteile aggregieren
  const anteile = LP_ANTEILE[input.leistungsbild];
  const beauftragterLpAnteil = input.beauftragteLps.reduce(
    (sum, lp) => sum + (anteile[lp] ?? 0),
    0
  );

  // Grundhonorar = Vollhonorar × Σ(beauftragte LPs)
  const grundhonorarCents = Math.round(vollhonorarCents * beauftragterLpAnteil);

  // LP-Aufsplitt (vom Grundhonorar)
  const lpAufsplittCents: Partial<Record<Leistungsphase, number>> = {};
  if (beauftragterLpAnteil > 0) {
    let summe = 0;
    const lps = [...input.beauftragteLps].sort((a, b) => a - b);
    for (let i = 0; i < lps.length; i++) {
      const lp = lps[i];
      const lpAnt = anteile[lp] ?? 0;
      // Last LP bekommt den Rounding-Rest, damit Summe == grundhonorarCents
      if (i === lps.length - 1) {
        lpAufsplittCents[lp] = grundhonorarCents - summe;
      } else {
        const ant = Math.round(
          (lpAnt / beauftragterLpAnteil) * grundhonorarCents
        );
        lpAufsplittCents[lp] = ant;
        summe += ant;
      }
    }
  }

  // Umbau-Zuschlag
  const umbauPct = Math.max(0, Math.min(80, input.umbauZuschlagPct ?? 0));
  const umbauZuschlagCents = Math.round(grundhonorarCents * (umbauPct / 100));

  // Nebenkosten
  const nebenkostenPct = Math.max(0, Math.min(50, input.nebenkostenPauschalePct ?? 0));
  const nebenkostenCents = Math.round(
    (grundhonorarCents + umbauZuschlagCents) * (nebenkostenPct / 100)
  );

  const honorarsummeNettoCents =
    grundhonorarCents + umbauZuschlagCents + nebenkostenCents;

  return {
    ok: true,
    result: {
      vollhonorarCents,
      grundhonorarCents,
      umbauZuschlagCents,
      nebenkostenCents,
      honorarsummeNettoCents,
      lpAufsplittCents,
      beauftragterLpAnteil,
      debug: {
        untereSchwelleCents: untere.kostenCents,
        obereSchwelleCents: obere.kostenCents,
        interpolationsfaktor: factor,
      },
    },
  };
}

/**
 * Convenience-Wrapper: liefert nur das Ergebnis und wirft bei Fehler.
 * Für Stellen, an denen wir die Eingabe schon validiert haben.
 */
export function calculateOrThrow(input: HoaiInput): HoaiResult {
  const r = calculate(input);
  if (!r.ok) {
    throw new Error(`HOAI-Berechnung fehlgeschlagen: ${r.error.kind}`);
  }
  return r.result;
}

/**
 * Formatiert Cents als deutsche Währung.
 */
export function formatEur(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
