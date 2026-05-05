/**
 * Abnahme-Logik (rein, ohne DB-Zugriffe).
 *
 *   § 12 VOB/B    — Abnahme-Arten
 *   § 640 BGB     — BGB-Abnahme
 *   § 11 IV VOB/B — Vertragsstrafe-Vorbehalt-Pflicht
 *   § 13 IV VOB/B — Mängelverjährung 4 J. VOB / 5 J. BGB
 *
 * Hinweis: Mängel-spezifische Logik liegt seit Migration 0029 in
 * `src/lib/maengel/`. Hier verbleiben nur Abnahme-spezifische Helfer
 * (Vertragsstrafe-Risiko, Attendees-JSON, Gewährleistungs-Berechnung).
 */
import { computeGewaehrleistungEnd } from "@/lib/maengel";
import type {
  AbnahmeAttendee,
  AbnahmeBeurteilung,
  AbnahmeKind,
  ContractType,
} from "@/db/schema";

export const ABNAHME_KIND_LABEL: Record<AbnahmeKind, string> = {
  foermlich: "Förmliche Abnahme",
  fiktiv: "Fiktive Abnahme",
  konkludent: "Konkludente Abnahme",
  teilabnahme: "Teilabnahme",
  verweigert: "Abnahme verweigert",
};

export const ABNAHME_KIND_LEGAL_BASIS: Record<AbnahmeKind, string> = {
  foermlich: "§ 12 Abs. 4 VOB/B · § 640 BGB",
  fiktiv: "§ 12 Abs. 5 VOB/B",
  konkludent: "§ 640 Abs. 2 BGB",
  teilabnahme: "§ 12 Abs. 2 VOB/B",
  verweigert: "§ 12 Abs. 3 VOB/B (wesentliche Mängel)",
};

export const ABNAHME_BEURTEILUNG_LABEL: Record<AbnahmeBeurteilung, string> = {
  mangelfrei: "Mangelfrei",
  mit_unwesentlichen_maengeln: "Mit unwesentlichen Mängeln",
  mit_wesentlichen_maengeln: "Mit wesentlichen Mängeln",
  verweigert: "Abnahme verweigert",
};

/**
 * Backwards-kompatibler Wrapper auf die zentrale Berechnung in `lib/maengel`.
 * Der Name `computeWarrantyEnd` bleibt erhalten, weil diverse Routen ihn
 * bereits importieren.
 */
export function computeWarrantyEnd(
  abnahmeDateIso: string,
  contractType: ContractType | null
): string | null {
  return computeGewaehrleistungEnd(abnahmeDateIso, contractType);
}

/**
 * Bewertet das Vertragsstrafe-Risiko. Kritisch: agreed=true UND reserved=false
 * — § 11 Abs. 4 VOB/B → die Vertragsstrafe verfällt mit der Abnahme, wenn nicht
 * spätestens DORT vorbehalten. Verweigerte Abnahmen verbrauchen den Vorbehalt
 * nicht (es gab keine Abnahme), daher dort kein Risiko.
 */
export function vertragsstrafeAtRisk(opts: {
  kind: AbnahmeKind;
  vertragsstrafeAgreed: boolean;
  vertragsstrafeReserved: boolean;
}): boolean {
  if (opts.kind === "verweigert") return false;
  return opts.vertragsstrafeAgreed && !opts.vertragsstrafeReserved;
}

/**
 * Parser für das attendees-JSON-Feld. Tolerant gegen leere/ungültige Werte.
 */
export function parseAttendees(raw: string | null): AbnahmeAttendee[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item: unknown) => {
      if (
        typeof item !== "object" ||
        item === null ||
        typeof (item as { name?: unknown }).name !== "string"
      ) {
        return [];
      }
      const obj = item as Record<string, unknown>;
      return [
        {
          name: String(obj.name),
          role: typeof obj.role === "string" ? obj.role : "",
          signed: obj.signed === true,
        },
      ];
    });
  } catch {
    return [];
  }
}

/**
 * Wandelt einen newline-separierten Freitext in attendees-JSON um.
 * Ein Eintrag pro Zeile, optional mit "· Rolle" am Ende.
 *   Beispiel:  "Max Mustermann · Bauleiter AN"
 */
export function attendeesFromFreetext(text: string | null): string | null {
  if (!text) return null;
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return null;
  const items: AbnahmeAttendee[] = lines.map((line) => {
    const sepIdx = line.indexOf("·");
    if (sepIdx >= 0) {
      return {
        name: line.slice(0, sepIdx).trim(),
        role: line.slice(sepIdx + 1).trim(),
        signed: false,
      };
    }
    return { name: line, role: "", signed: false };
  });
  return JSON.stringify(items);
}

export function attendeesToFreetext(raw: string | null): string {
  const items = parseAttendees(raw);
  if (items.length === 0) return "";
  return items
    .map((i) => (i.role ? `${i.name} · ${i.role}` : i.name))
    .join("\n");
}
