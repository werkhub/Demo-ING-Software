/**
 * State-Machine für Mängel-Status. Bewusst eng — verhindert zufällige
 * Übergänge wie „behoben → offen", die juristisch problematisch sind
 * (Beweissicherung). Wenn ein behobener Mangel doch wieder auftritt,
 * legt man einen NEUEN Mangel mit Verweis im notes-Feld an.
 *
 * Erlaubte Übergänge:
 *   offen           → in_bearbeitung, behoben, abgelehnt, strittig
 *   in_bearbeitung  → behoben, abgelehnt, strittig
 *   strittig        → behoben, abgelehnt, in_bearbeitung
 *   behoben         → (terminal)
 *   abgelehnt       → (terminal)
 *
 * `behoben` und `abgelehnt` sind absichtlich terminal — Re-Open wäre
 * forensisch verwirrend und sollte als neuer Mangel modelliert werden.
 */
import type { MangelStatus } from "@/db/schema";

const TRANSITIONS: Record<MangelStatus, ReadonlyArray<MangelStatus>> = {
  offen: ["in_bearbeitung", "behoben", "abgelehnt", "strittig"],
  in_bearbeitung: ["behoben", "abgelehnt", "strittig"],
  strittig: ["behoben", "abgelehnt", "in_bearbeitung"],
  behoben: [],
  abgelehnt: [],
};

export function isAllowedTransition(
  from: MangelStatus,
  to: MangelStatus
): boolean {
  if (from === to) return true; // Idempotenz: gleicher Status ist trivial ok
  return TRANSITIONS[from].includes(to);
}

export function allowedNextStates(from: MangelStatus): MangelStatus[] {
  return [...TRANSITIONS[from]];
}

export function isTerminal(status: MangelStatus): boolean {
  return TRANSITIONS[status].length === 0;
}
