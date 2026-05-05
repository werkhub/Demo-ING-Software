/**
 * Statische Daten — Navigation und vordefinierte KI-Szenarien.
 * Modul-IDs und Routen leben in src/lib/modules.ts (Single Source of Truth);
 * hier nur die Sidebar-Sektionen und die Demo-Szenarien des Recht-Assistenten.
 */

import {
  MODULES,
  SECTION_LABEL,
  SECTION_ORDER,
  type ModuleDefinition,
  type ModuleSection,
} from "./modules";

export type NavIcon =
  | "home"
  | "message-circle"
  | "shield"
  | "search"
  | "mail"
  | "building"
  | "clipboard-list"
  | "link2"
  | "camera"
  | "file-text"
  | "calendar"
  | "book-open"
  | "scale"
  | "users"
  | "key"
  | "inbox"
  | "receipt"
  | "alert-triangle"
  | "shield-alert";

export type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: NavIcon;
  badge?: { text: string; color: "indigo" | "violet" | "amber" | "emerald" | "red" };
  count?: number;
  /**
   * Pfad-Präfixe, die dieses Item zusätzlich zu `href` als „aktiv" markieren —
   * Hub-Items (Finanzen, Analysen) bündeln mehrere versteckte Sub-Routen.
   */
  activePathPrefixes?: readonly string[];
};

export type NavSection = {
  /** Übersetzungs-Schlüssel — entspricht ModuleSection ("uebersicht" | "tagesgeschaeft" | …). */
  slug: ModuleSection;
  /** DE-Fallback-Label (genutzt, wenn keine Übersetzung greift). */
  title: string;
  items: NavItem[];
};

function moduleToNavItem(m: ModuleDefinition): NavItem {
  return {
    id: m.id,
    href: m.href,
    label: m.label,
    icon: m.icon,
    badge: m.badge,
    activePathPrefixes: m.activePathPrefixes,
  };
}

function buildSection(section: ModuleSection): NavSection {
  const items = MODULES.filter((m) => {
    if (m.section !== section) return false;
    if ("hideFromSidebar" in m && m.hideFromSidebar) return false;
    return true;
  }).map(moduleToNavItem);
  return { slug: section, title: SECTION_LABEL[section], items };
}

/**
 * Vier Sektionen seit Sprint 6:
 *   Arbeit       — Tagesgeschäft (Vorgänge, Projekte, Bautagebuch, Fristen, Rechnungen).
 *   Quick-Actions — Standalone-Werkzeuge, die i. d. R. aus einem Vorgang heraus genutzt werden.
 *   Bibliothek   — Referenz-/Vorlagen-Inhalte ohne Workflow-Zustand.
 *   Verwaltung   — Workspace, Lizenz, NU-Pass-Through.
 *
 * Wird automatisch aus src/lib/modules.ts abgeleitet.
 */
export const NAV: NavSection[] = SECTION_ORDER.map(buildSection);

export type Scenario = {
  q: string;
  norm: string;
  pros: string[];
  cons: string[];
  actions: string[];
  sources: { type: string; label: string; meta: string }[];
};

export const SCENARIOS: Scenario[] = [
  {
    q: "AG hat Werk vor 4 Wochen abgenommen, jetzt sind Risse im Putz. Er fordert Nachbesserung mit Frist von 5 Tagen — was tun?",
    norm: "§ 13 Abs. 5 VOB/B · § 634 Nr. 1 BGB",
    pros: [
      "Frist von 5 Tagen ist nicht „angemessen“ → kann formell gerügt werden",
      "Beweislast nach Abnahme liegt beim AG",
      "Risse können auch Folge mangelhafter Vorleistung des AG sein",
    ],
    cons: [
      "Putz-Risse innerhalb 4 Wochen sind klassisches Indiz für Ausführungsmangel",
      "Verweigerung der Nacharbeit ohne Begründung → Ersatzvornahme zu Ihren Lasten",
      "Bei eindeutigem Mangel droht Minderung (§ 13 Abs. 6 VOB/B)",
    ],
    actions: [
      "Vorlage Mangelrüge-Antwort nutzen — angemessene Frist (14 WT) anbieten",
      "VOR Beseitigung: Beweissicherung Foto + SV-Termin",
      "Untergrund-Vorleistung im Bautagebuch nachweisen",
      "Nacharbeit unter Vorbehalt der Kostentragung anbieten",
    ],
    sources: [
      { type: "📜", label: "VOB/B § 13 Abs. 5", meta: "Mangelbeseitigung" },
      { type: "📕", label: "BGB § 634a", meta: "Verjährung 5 J." },
      { type: "⚖️", label: "BGH VII ZR 13/16", meta: "Angemessene Frist" },
    ],
  },
  {
    q: "TGA-Pläne fehlen seit 2 Wochen, Bauablauf gestört. Wie reagiere ich rechtssicher?",
    norm: "§ 6 Abs. 1 + 6 VOB/B",
    pros: [
      "AG-Pflichtverletzung → klarer Anspruch auf Bauzeitverlängerung",
      "Bei dokumentierter BHA: Schadensersatz nach § 6 Abs. 6 VOB/B",
      "Nach 3 Monaten Stillstand: Recht zur Kündigung (§ 6 Abs. 7)",
    ],
    cons: [
      "Ohne schriftliche BHA: kein Anspruch auf Verlängerung",
      "„Offensichtlichkeit“ schützt nur ausnahmsweise",
      "Mitwirkungspflicht: Pläne aktiv anfordern",
    ],
    actions: [
      "HEUTE BHA versenden",
      "E-Mail an AG + Architekt mit Lesebestätigung",
      "Plananforderungen der letzten 14 Tage als Anlage",
      "Bauablaufstörung tagesgenau im Bautagebuch",
    ],
    sources: [
      { type: "📜", label: "VOB/B § 6 Abs. 1", meta: "Behinderungsanzeige" },
      { type: "⚖️", label: "BGH VII ZR 11/08", meta: "Form BHA" },
    ],
  },
];
