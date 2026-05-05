/**
 * Plan-Index-Konvention.
 *
 * In Ingenieurbüros werden Plan-Versionen üblicherweise mit Index-Labels
 * versehen:
 *   - Buchstaben (A, B, C, …) = Vorab/Entwurf-Versionen
 *   - Zahlen   (0, 1, 2, …)  = freigegebene Stände
 *
 * Beispiel-Verlauf eines Plans:
 *   A → B → C   (interne Entwurfsstände)
 *   → 0         (erste Freigabe)
 *   → 1, 2, 3   (Korrekturen nach Freigabe)
 *
 * Diese Lib liefert pure Helper:
 *   - nextIndexLabel(existing, kategorie) — Vorschlag für nächsten Index
 *   - parseIndexLabel(label)              — kanonische Sortier-Schlüssel
 *   - sortIndexLabels(labels)             — chronologisch sortieren
 *
 * Keine DB-Zugriffe; vollständig testbar.
 */
import type { PlanIndexKategorie } from "@/db/schema";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Erkennt die Kategorie eines Labels:
 *   - "A", "B", "AA" → entwurf
 *   - "0", "1", "12" → freigegeben
 *   - leer / unbekannt → freigegeben (Default)
 */
export function categorizeLabel(label: string): PlanIndexKategorie {
  const trimmed = label.trim();
  if (trimmed.length === 0) return "freigegeben";
  if (/^[A-Z]+$/i.test(trimmed)) return "entwurf";
  if (/^\d+$/.test(trimmed)) return "freigegeben";
  return "freigegeben";
}

/**
 * Inkrementiert ein Buchstaben-Label: "A" → "B", "Z" → "AA", "AZ" → "BA".
 * Klassische Excel-Spalten-Logik, Großbuchstaben.
 */
export function incrementAlphabetic(label: string): string {
  const upper = label.toUpperCase();
  if (!/^[A-Z]+$/.test(upper)) return "A";
  let result = "";
  let carry = 1;
  for (let i = upper.length - 1; i >= 0; i--) {
    const code = upper.charCodeAt(i) - 65 + carry;
    if (code >= 26) {
      result = ALPHABET[code % 26] + result;
      carry = Math.floor(code / 26);
    } else {
      result = ALPHABET[code] + result;
      carry = 0;
    }
  }
  if (carry > 0) {
    result = "A" + result;
  }
  return result;
}

/**
 * Inkrementiert ein numerisches Label: "0" → "1", "9" → "10".
 */
export function incrementNumeric(label: string): string {
  const n = parseInt(label, 10);
  if (Number.isNaN(n)) return "0";
  return String(n + 1);
}

/**
 * Schlägt das nächste Index-Label vor.
 *
 * Logik:
 *   - Wenn kategorie="entwurf": nimm das letzte alphabetische Label,
 *     inkrementiere es. Wenn keine alphabetischen Labels existieren: "A".
 *   - Wenn kategorie="freigegeben": nimm das letzte numerische Label,
 *     inkrementiere es. Wenn keine numerischen Labels existieren: "0".
 */
export function nextIndexLabel(
  existingLabels: ReadonlyArray<string>,
  kategorie: PlanIndexKategorie
): string {
  const filtered = existingLabels
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .filter((l) => categorizeLabel(l) === kategorie);

  if (filtered.length === 0) {
    return kategorie === "entwurf" ? "A" : "0";
  }

  if (kategorie === "entwurf") {
    // Sortiere alphabetisch (Länge zuerst, dann lexikografisch)
    const sorted = [...filtered].sort((a, b) => {
      const A = a.toUpperCase();
      const B = b.toUpperCase();
      if (A.length !== B.length) return A.length - B.length;
      return A < B ? -1 : A > B ? 1 : 0;
    });
    return incrementAlphabetic(sorted[sorted.length - 1]);
  }

  // freigegeben: numerisch
  const max = filtered.reduce((acc, l) => {
    const n = parseInt(l, 10);
    return Number.isNaN(n) ? acc : Math.max(acc, n);
  }, -1);
  return String(max + 1);
}

/**
 * Liefert einen Sortier-Schlüssel: Entwurf-Labels < freigegebene Labels,
 * innerhalb der Kategorie korrekt aufsteigend.
 */
export function indexSortKey(label: string): [number, number, string] {
  const trimmed = label.trim();
  const kat = categorizeLabel(trimmed);
  // Tier 0 = entwurf (kommt zuerst), Tier 1 = freigegeben
  const tier = kat === "entwurf" ? 0 : 1;
  if (kat === "entwurf") {
    // Length-major sort: A < Z < AA < AZ < BA
    return [tier, trimmed.length, trimmed.toUpperCase()];
  }
  const n = parseInt(trimmed, 10);
  return [tier, Number.isNaN(n) ? 0 : n, ""];
}

/**
 * Sortiert eine Liste von Index-Labels chronologisch (älteste zuerst).
 */
export function sortIndexLabels(labels: ReadonlyArray<string>): string[] {
  return [...labels].sort((a, b) => {
    const ka = indexSortKey(a);
    const kb = indexSortKey(b);
    if (ka[0] !== kb[0]) return ka[0] - kb[0];
    if (ka[1] !== kb[1]) return ka[1] - kb[1];
    return ka[2] < kb[2] ? -1 : ka[2] > kb[2] ? 1 : 0;
  });
}

/**
 * Validiert ein Index-Label: nicht leer, max 8 Zeichen, nur A-Z oder Zahlen.
 */
export function isValidIndexLabel(label: string): boolean {
  const trimmed = label.trim();
  if (trimmed.length === 0 || trimmed.length > 8) return false;
  return /^([A-Za-z]+|\d+)$/.test(trimmed);
}
