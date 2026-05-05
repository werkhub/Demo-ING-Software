/**
 * Rollen-Modell: Wer benutzt LexBau?
 *
 * Drei Workspace-Typen (konsolidiert ab Migration 0047):
 *   bauunternehmer  — VOB/B-Welt (Bauunternehmer, GU, NU, Handwerk)
 *   bauherr         — AG-Sicht (Bauherr, Investor, öffentlicher AG)
 *   ingenieurbuero  — HOAI-Welt (Architekt, Bauingenieur, Tragwerk, TGA,
 *                     Bauleitung, Projektsteuerung)
 *
 * Sub-Aspekte wie „Bauleitung LP8" oder „Projektsteuerung" werden über
 * users.memberRole abgebildet, nicht über den Workspace-Typ.
 *
 * Der Typ bestimmt UI-Fokus, Modul-Reihenfolge, Vorlagen-Auswahl und die
 * Perspektive des Recht-Assistenten.
 */

import type { NavItem, NavSection } from "./data";
import { MODULE_BY_ID, type ModuleId } from "./modules";
import type { ClientFocus, Discipline, WorkspaceRole } from "@/db/schema";

export type RoleMeta = {
  id: WorkspaceRole;
  shortLabel: string;
  label: string;
  fullLabel: string;
  /** 1-Zeilen-Beschreibung für die Settings-Seite */
  tagline: string;
  /** Längere Beschreibung mit rechtlicher Stellung */
  description: string;
  /** Hauptfokus-Bullets */
  focus: string[];
  /** Perspektivischer Hinweis für den Recht-Assistenten */
  assistantPerspective: string;
};

export const ROLE_META: Record<WorkspaceRole, RoleMeta> = {
  bauunternehmer: {
    id: "bauunternehmer",
    shortLabel: "BAU",
    label: "Bauunternehmer",
    fullLabel: "Bauunternehmer / Bauunternehmen",
    tagline: "VOB/B-Werkvertrag — schuldet das gebaute Werk",
    description:
      "Bauunternehmer, Generalunternehmer, Nachunternehmer, Handwerksbetrieb. Vergütung über Pauschal-/Einheitspreis-Vertrag mit LV und Aufmaß. VOB/B als Standard. Bauleistung im Sinne § 13b UStG / § 48 EStG.",
    focus: [
      "Nachträge nach § 2 Abs. 5/6 VOB/B durchsetzen",
      "Bedenken (§ 4 III) und Behinderungen (§ 6 I) anzeigen",
      "Bautagebuch beweissicher führen (§ 4 V VOB/B)",
      "Sicherheiten + Vertragsstrafe + Reverse-Charge",
      "Schlussrechnung, Sicherheiten einlösen",
    ],
    assistantPerspective:
      "Du bist Auftragnehmer (Bauunternehmer). Antworten zielen darauf ab, Ansprüche zu sichern, Risiken zu minimieren und Nachträge formal durchzusetzen.",
  },
  bauherr: {
    id: "bauherr",
    shortLabel: "AG",
    label: "Bauherr",
    fullLabel: "Bauherr / Investor / öffentlicher AG",
    tagline: "Besteller — schuldet Vergütung und Mitwirkung",
    description:
      "Privater oder öffentlicher Auftraggeber, Bauträger, Investor. Beauftragt Planung und Bauleistung, nimmt das Werk ab und sichert es gegen Risiken aus Auftragnehmer-Verhalten.",
    focus: [
      "Mängel formal rügen mit Frist (§ 13, § 4 Nr. 7 VOB/B)",
      "Anordnungen rechtswirksam erteilen (§ 1 III, § 4 I)",
      "Vertragsstrafe geltend machen — Vorbehalt bei Abnahme (§ 11 IV)",
      "Abnahme durchführen, Sicherheiten verwalten (§ 12, § 17)",
      "Vergabe rechtssicher führen (VOB/A — Vergabestelle-Sicht)",
    ],
    assistantPerspective:
      "Du bist Auftraggeber. Antworten zielen darauf ab, Mängel rechtssicher zu rügen, Anordnungen wirksam zu erteilen und das Werk gegen Risiken aus dem AN-Verhalten abzusichern.",
  },
  ingenieurbuero: {
    id: "ingenieurbuero",
    shortLabel: "ING",
    label: "Ingenieurbüro",
    fullLabel: "Ingenieurbüro / Architekt / Fachplaner",
    tagline: "HOAI-Werkvertrag — schuldet Planungsleistung",
    description:
      'Architekt, Bauingenieur, Tragwerksplaner, Fachplaner TGA, Tiefbauplaner, Projektsteuerung. Vergütung über HOAI-Honorar (anrechenbare Kosten × Honorarzone × LP-Anteile). Keine Bauleistung im Sinne § 13b UStG / § 48 EStG. Sub-Aspekte wie „Bauleitung LP8" oder „Projektsteuerung" werden über die User-Rolle abgebildet.',
    focus: [
      "HOAI-Honorar berechnen (§ 35/47/51/56)",
      "Leistungsphasen-Tracking LP1-9 (Soll-Ist)",
      "Plan-Index-System mit Versand-Doku",
      "Stundenerfassung pro LP × Projekt — Beweis bei Honorarstreit",
      "HOAI-Schlussrechnung mit LP-Aufsplitt",
    ],
    assistantPerspective:
      "Du bist Ingenieurbüro mit HOAI-Werkvertrag. Antworten beleuchten Honorar-Sicherung, Mitwirkungspflichten des AG, Abnahme der Planungsleistung und — bei Bauleitung — rechtssichere Anordnungen und Mängeldokumentation.",
  },
};

export const ALL_ROLES: WorkspaceRole[] = [
  "bauunternehmer",
  "bauherr",
  "ingenieurbuero",
];

/**
 * Mapping: Welche Sidebar-Items haben für welche Rolle Priorität (oben),
 * sind Standard, oder werden ausgeblendet?
 *
 * Modul-IDs müssen den NavItem.id-Werten in src/lib/data.ts entsprechen.
 */
type ModuleVisibility = "primary" | "standard" | "hidden";

const MODULE_PRIORITY: Record<
  WorkspaceRole,
  Partial<Record<ModuleId, ModuleVisibility>>
> = {
  bauunternehmer: {
    // Tagesgeschäft: Vorgänge, Bautagebuch, Finanzen, Anzeigen, Anordnungen,
    // Stunden, NU-Pass-Through.
    dashboard: "primary",
    vorgaenge: "primary",
    bautagebuch: "primary",
    anzeigen: "primary",
    finanzen: "primary",
    stunden: "primary",
    analysen: "primary",
    nu: "primary",
    projekte: "standard",
    fristen: "standard",
    beweis: "standard",
    vorlagen: "standard",
    "recht-assistent": "standard",
    gesetze: "standard",
    urteile: "standard",
    "hoai-rechner": "hidden",
  },
  bauherr: {
    // AG-Fokus: Vorgänge mit Schwerpunkt Rüge / Vertrag / Anordnung.
    dashboard: "primary",
    vorgaenge: "primary",
    analysen: "primary",
    projekte: "standard",
    fristen: "standard",
    bautagebuch: "standard",
    finanzen: "standard",
    beweis: "standard",
    "recht-assistent": "standard",
    gesetze: "standard",
    urteile: "standard",
    vorlagen: "standard",
    nu: "hidden",
    "hoai-rechner": "hidden",
  },
  ingenieurbuero: {
    // HOAI-Welt: Projekte + Stunden + Pläne + HOAI-Rechner + Vorgänge
    // im Vordergrund. Bautagebuch wichtig für Bauleitung (LP8).
    // NU-Pass-Through ausgeblendet (Bauunternehmer-spezifisch).
    dashboard: "primary",
    projekte: "primary",
    stunden: "primary",
    vorgaenge: "primary",
    "hoai-rechner": "primary",
    bautagebuch: "primary",
    fristen: "primary",
    finanzen: "primary",
    anzeigen: "standard",
    analysen: "standard",
    "recht-assistent": "standard",
    gesetze: "standard",
    urteile: "standard",
    beweis: "standard",
    vorlagen: "standard",
    nu: "hidden",
  },
};

/** Liefert Sichtbarkeit eines Moduls für eine Rolle (Default: standard). */
export function moduleVisibility(
  role: WorkspaceRole,
  moduleId: string
): ModuleVisibility {
  return MODULE_PRIORITY[role][moduleId as ModuleId] ?? "standard";
}

/**
 * Filtert + sortiert eine Nav-Section nach Rolle.
 * Reihenfolge innerhalb einer Section: primary → standard.
 * "hidden" wird entfernt.
 */
export function filterNavSection(
  section: NavSection,
  role: WorkspaceRole
): NavSection | null {
  const items = section.items
    .filter((item) => moduleVisibility(role, item.id) !== "hidden")
    .sort((a, b) => {
      const va = moduleVisibility(role, a.id);
      const vb = moduleVisibility(role, b.id);
      if (va === vb) return 0;
      if (va === "primary") return -1;
      if (vb === "primary") return 1;
      return 0;
    });
  if (items.length === 0) return null;
  return { ...section, items };
}

/**
 * Rollen-spezifische Label-Anpassungen für Module, deren Sinn sich
 * je nach Perspektive umkehrt.
 */
const MODULE_LABEL_OVERRIDES: Record<
  WorkspaceRole,
  Partial<Record<ModuleId, string>>
> = {
  bauunternehmer: {
    "ruege-analyse": "Rüge abwehren",
    anordnung: "Anordnung prüfen",
  },
  bauherr: {
    "ruege-analyse": "Mängel rügen",
    anordnung: "Anordnung erteilen",
    bautagebuch: "Bauüberwachung",
  },
  ingenieurbuero: {
    "ruege-analyse": "Mängel-Rüge prüfen",
    anordnung: "Anordnung dokumentieren",
    bautagebuch: "Bautagebuch (LP8)",
  },
};

export function moduleLabel(role: WorkspaceRole, item: NavItem): string {
  return MODULE_LABEL_OVERRIDES[role][item.id as ModuleId] ?? item.label;
}

/**
 * Optionen für sekundäre Filter, die NICHT von der Workspace-Rolle abhängen:
 *   isAdmin              — schaltet adminOnly-Module frei
 *   workspaceFlags       — Workspace-Schalter (z. B. hinschgEnabled)
 *   disciplines          — Workspace-Fachdisziplinen (mehrfach)
 *   clientFocus          — Auftraggeber-Schwerpunkt
 *   companySize          — Mitarbeiterzahl (NULL = unbekannt)
 */
export type NavFilterOpts = {
  isAdmin?: boolean;
  workspaceFlags?: { hinschgEnabled?: boolean };
  disciplines?: readonly Discipline[];
  clientFocus?: ClientFocus;
  companySize?: number | null;
};

function passesAdminAndFlagFilter(
  itemId: string,
  role: WorkspaceRole,
  opts: NavFilterOpts
): boolean {
  const def = MODULE_BY_ID[itemId as ModuleId];
  if (!def) return true; // unbekannt → durchlassen (defensive)
  if (def.adminOnly && !opts.isAdmin) return false;
  if (def.requiresWorkspaceFlag) {
    const enabled =
      opts.workspaceFlags?.[def.requiresWorkspaceFlag] === true;
    if (!enabled) return false;
  }
  if (def.requiresWorkspaceType) {
    if (def.requiresWorkspaceType !== role) return false;
  }
  if (def.requiresAnyDiscipline && def.requiresAnyDiscipline.length > 0) {
    const have = new Set<Discipline>(opts.disciplines ?? []);
    const hit = def.requiresAnyDiscipline.some((d) => have.has(d));
    if (!hit) return false;
  }
  if (def.requiresAnyClientFocus && def.requiresAnyClientFocus.length > 0) {
    // Wenn ClientFocus nicht gesetzt → wir lassen das Modul zu (kein
    // heimliches Verstecken bei fehlender Konfiguration). Sobald ein
    // ClientFocus gesetzt ist, muss er in der erlaubten Liste stehen.
    if (opts.clientFocus !== undefined) {
      if (!def.requiresAnyClientFocus.includes(opts.clientFocus)) return false;
    }
  }
  if (def.requiresCompanySizeMin !== undefined) {
    // NULL (= unbekannt) lassen wir durch — kein heimliches Verstecken.
    const size = opts.companySize ?? null;
    if (size !== null && size < def.requiresCompanySizeMin) return false;
  }
  return true;
}

/** Komplette rollenspezifische Navigation. */
export function buildNavForRole(
  nav: NavSection[],
  role: WorkspaceRole,
  filters: NavFilterOpts = {}
): NavSection[] {
  return nav
    .map((section) => {
      const sec = filterNavSection(section, role);
      if (!sec) return null;
      const items = sec.items.filter((item) =>
        passesAdminAndFlagFilter(item.id, role, filters)
      );
      if (items.length === 0) return null;
      return { ...sec, items };
    })
    .filter((section): section is NavSection => section !== null)
    .map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        label: moduleLabel(role, item),
      })),
    }));
}
