/**
 * Helper rund um die Workspace-Fachdisziplinen.
 *
 * Disziplinen werden im Workspace als JSON-Array (`disciplinesJson`) gespeichert,
 * damit kein Join für eine selten-geänderte Konfiguration nötig ist. Diese Modul-
 * ebene kapselt das Lesen + Schreiben so, dass alle Konsumenten mit `Discipline[]`
 * arbeiten und nicht mit Roh-JSON.
 */
import {
  DISCIPLINES,
  DISCIPLINE_SUBPROFILES,
  type Discipline,
  type DisciplineSubprofile,
  type ClientFocus,
} from "@/db/schema/types";

/** Sicheres Parsen — toleriert NULL/Garbage und liefert nur gültige Werte. */
export function parseDisciplines(json: string | null | undefined): Discipline[] {
  if (!json) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const valid = new Set<Discipline>(DISCIPLINES);
  return parsed.filter((d): d is Discipline =>
    typeof d === "string" && valid.has(d as Discipline)
  );
}

/** Serialisierung mit Dedup, damit JSON-Roundtrips stabil bleiben. */
export function serializeDisciplines(values: readonly Discipline[]): string {
  return JSON.stringify(Array.from(new Set(values)));
}

/** Default-Sets für die Onboarding-Presets. */
export type SubprofileDefaults = {
  disciplines: Discipline[];
  clientFocus: ClientFocus;
};

export const SUBPROFILE_DEFAULTS: Record<DisciplineSubprofile, SubprofileDefaults> = {
  hochbau_klassisch: {
    disciplines: [
      "hochbau_objektplanung",
      "tragwerksplanung",
      "bauphysik",
      "sigeko_projektsteuerung",
    ],
    clientFocus: "gemischt",
  },
  tiefbau_infrastruktur: {
    disciplines: [
      "verkehrsanlagen",
      "ingenieurbauwerke",
      "freianlagen",
      "vermessung",
    ],
    clientFocus: "oeffentlich",
  },
  tga_spezialist: {
    disciplines: ["tga"],
    clientFocus: "gemischt",
  },
  tragwerk_spezialist: {
    disciplines: ["tragwerksplanung"],
    clientFocus: "gemischt",
  },
  generalplanung: {
    disciplines: [
      "hochbau_objektplanung",
      "tragwerksplanung",
      "tga",
      "bauphysik",
      "sigeko_projektsteuerung",
    ],
    clientFocus: "gemischt",
  },
  pruefingenieur: {
    disciplines: ["bauwerkspruefung", "tragwerksplanung"],
    clientFocus: "oeffentlich",
  },
  custom: {
    disciplines: [],
    clientFocus: "gemischt",
  },
};

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  hochbau_objektplanung: "Hochbau / Objektplanung Gebäude",
  tragwerksplanung: "Tragwerksplanung",
  tga: "Technische Ausrüstung (TGA)",
  bauphysik: "Bauphysik (Brand/Wärme/Schall)",
  verkehrsanlagen: "Verkehrsanlagen (Straßen, Plätze, Bahn)",
  ingenieurbauwerke: "Ingenieurbauwerke (Wasser, Brücken, Stützmauern, Tunnel)",
  freianlagen: "Freianlagen / Landschaftsplanung",
  vermessung: "Vermessung",
  bauwerkspruefung: "Bauwerksprüfung DIN 1076",
  sigeko_projektsteuerung: "SiGeKo / Projektsteuerung",
};

export const SUBPROFILE_LABEL: Record<DisciplineSubprofile, string> = {
  hochbau_klassisch: "Hochbau klassisch",
  tiefbau_infrastruktur: "Tiefbau / Infrastruktur",
  tga_spezialist: "TGA-Spezialist",
  tragwerk_spezialist: "Tragwerks-Spezialist",
  generalplanung: "Generalplanung",
  pruefingenieur: "Bauwerksprüfung (DIN 1076)",
  custom: "Eigene Auswahl",
};

export const SUBPROFILE_DESCRIPTION: Record<DisciplineSubprofile, string> = {
  hochbau_klassisch:
    "Hochbau-Büro mit Tragwerk, Bauphysik und SiGeKo. Typisch für 5–25 MA.",
  tiefbau_infrastruktur:
    "Verkehrs-, Wasser- und Erschließungsplanung mit Vermessung. Hauptauftraggeber Kommunen und Wasserverbände.",
  tga_spezialist:
    "Reine TGA-Planung (Heizung, Lüftung, Sanitär, Elektro, MSR).",
  tragwerk_spezialist:
    "Reine Tragwerksplanung — Statik, Bewehrung, Standsicherheit.",
  generalplanung:
    "Vollständige Hochbau-Komplettleistung in einer Hand: Objekt + Tragwerk + TGA + Bauphysik + SiGeKo.",
  pruefingenieur:
    "Bauwerksprüfung nach DIN 1076 (Brücken, Stützbauwerke, Tunnel) plus Tragwerksbewertung.",
  custom:
    "Manuell zusammengestellte Disziplinen — z. B. nach Anpassung eines Presets.",
};

export const CLIENT_FOCUS_LABEL: Record<ClientFocus, string> = {
  privat: "überwiegend privat",
  gemischt: "gemischt",
  oeffentlich: "überwiegend öffentlich",
};

/**
 * Prüft, ob die aktuell gespeicherten Disziplinen exakt einem Subprofil
 * entsprechen. Dient der UI-Anzeige „Profil hat sich geändert → custom".
 */
export function detectSubprofile(
  disciplines: readonly Discipline[]
): DisciplineSubprofile {
  const set = new Set(disciplines);
  for (const sp of DISCIPLINE_SUBPROFILES) {
    if (sp === "custom") continue;
    const def = SUBPROFILE_DEFAULTS[sp];
    if (def.disciplines.length !== set.size) continue;
    if (def.disciplines.every((d) => set.has(d))) return sp;
  }
  return "custom";
}
