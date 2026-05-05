/**
 * DIN 1076 Bauwerksprüfung — Helper-Functions.
 *
 * Quelle: DIN 1076:1999-11 + RI-EBW-PRÜF (2017).
 *
 * Prüfintervalle (§ 3 DIN 1076):
 *   - Hauptprüfung    alle 6 Jahre
 *   - Einfache Prüfung alle 3 Jahre (zwischen den Hauptprüfungen)
 *   - Besichtigung    jährlich (visuell)
 *   - Sonderprüfung   anlassbezogen, kein Folge-Intervall
 *
 * Zustandsnoten (RI-EBW-PRÜF):
 *   1.0–1.4   sehr guter Bauwerkszustand
 *   1.5–1.9   guter Bauwerkszustand
 *   2.0–2.4   befriedigender Bauwerkszustand
 *   2.5–2.9   ausreichender Bauwerkszustand
 *   3.0–3.4   nicht ausreichender Bauwerkszustand
 *   3.5–4.0   ungenügender Bauwerkszustand (Standsicherheit gefährdet)
 */

export type PruefungArt =
  | "hauptpruefung"
  | "einfache_pruefung"
  | "besichtigung"
  | "sonderpruefung";

export const PRUEFUNG_ART_LABEL: Record<PruefungArt, string> = {
  hauptpruefung: "Hauptprüfung (H)",
  einfache_pruefung: "Einfache Prüfung (E)",
  besichtigung: "Besichtigung (B)",
  sonderpruefung: "Sonderprüfung (S)",
};

/**
 * Folgeintervall in Jahren — Sonderprüfung hat kein automatisches Intervall.
 */
export const PRUEFUNG_INTERVALL_JAHRE: Record<PruefungArt, number | null> = {
  hauptpruefung: 6,
  einfache_pruefung: 3,
  besichtigung: 1,
  sonderpruefung: null,
};

/**
 * Berechnet das Datum der nächsten Prüfung dieser Art.
 * Liefert null bei Sonderprüfung oder ungültigem Eingabedatum.
 *
 * Format: ISO-String "YYYY-MM-DD"
 */
export function nextPruefungDate(
  art: PruefungArt,
  letztePruefungAm: string | null | undefined
): string | null {
  if (!letztePruefungAm) return null;
  const intervall = PRUEFUNG_INTERVALL_JAHRE[art];
  if (intervall === null) return null;

  // Datums-Arithmetik defensiv: erst ISO parsen, dann Year addieren.
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(letztePruefungAm);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) return null;

  const next = new Date(Date.UTC(y + intervall, mo - 1, d));
  if (Number.isNaN(next.getTime())) return null;
  return next.toISOString().slice(0, 10);
}

export type ZustandsKlasse =
  | "sehr_gut"
  | "gut"
  | "befriedigend"
  | "ausreichend"
  | "nicht_ausreichend"
  | "ungenuegend";

export const ZUSTANDS_KLASSE_LABEL: Record<ZustandsKlasse, string> = {
  sehr_gut: "sehr gut",
  gut: "gut",
  befriedigend: "befriedigend",
  ausreichend: "ausreichend",
  nicht_ausreichend: "nicht ausreichend",
  ungenuegend: "ungenügend (Standsicherheit gefährdet)",
};

/**
 * Klassifiziert eine Zustandsnote nach RI-EBW-PRÜF-Skala.
 *
 * Werte außerhalb [1.0, 4.0] werden auf den nächstgelegenen gültigen
 * Wert geclampt — defensives Verhalten für UI-Eingabefehler.
 */
export function zustandsKlasse(note: number): ZustandsKlasse {
  const n = Math.max(1.0, Math.min(4.0, note));
  if (n < 1.5) return "sehr_gut";
  if (n < 2.0) return "gut";
  if (n < 2.5) return "befriedigend";
  if (n < 3.0) return "ausreichend";
  if (n < 3.5) return "nicht_ausreichend";
  return "ungenuegend";
}

/**
 * Liefert true wenn eine Prüfung als überfällig gilt (Heute > geplant).
 */
export function istUeberfaellig(
  geplantAm: string | null | undefined,
  heuteIso: string = new Date().toISOString().slice(0, 10)
): boolean {
  if (!geplantAm) return false;
  return geplantAm < heuteIso;
}

/**
 * Liefert die Anzahl Tage bis zur geplanten Prüfung (negativ = überfällig).
 */
export function tageBisPruefung(
  geplantAm: string | null | undefined,
  heuteIso: string = new Date().toISOString().slice(0, 10)
): number | null {
  if (!geplantAm) return null;
  const a = Date.UTC(
    parseInt(geplantAm.slice(0, 4), 10),
    parseInt(geplantAm.slice(5, 7), 10) - 1,
    parseInt(geplantAm.slice(8, 10), 10)
  );
  const b = Date.UTC(
    parseInt(heuteIso.slice(0, 4), 10),
    parseInt(heuteIso.slice(5, 7), 10) - 1,
    parseInt(heuteIso.slice(8, 10), 10)
  );
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((a - b) / (24 * 60 * 60 * 1000));
}
