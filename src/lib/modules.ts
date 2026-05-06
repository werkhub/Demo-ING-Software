/**
 * Single-Source-of-Truth für alle LexBau-Module.
 *
 * Wenn du ein neues Modul hinzufügst, ist dies der einzige Ort. Alles andere
 * (Sidebar-NAV, MODULE_PRIORITY, Quick-Access-Tiles auf dem Dashboard) leitet
 * sich daraus ab. Tippfehler in Modul-IDs scheitern beim Compile, nicht zur
 * Render-Zeit — `ModuleId` ist als String-Literal-Union exportiert.
 */
import type { ClientFocus, Discipline } from "@/db/schema/types";
import type { NavIcon } from "./data";

/**
 * Workflow-orientierte Sektionen — Reihenfolge folgt dem realen Tagesablauf
 * eines Bauleiters/Projektleiters: Übersicht → Tagesgeschäft → Projekte →
 * Finanzen → Dokumentation → Werkzeuge → Wissen → Verwaltung.
 */
export type ModuleSection =
  | "uebersicht"
  | "tagesgeschaeft"
  | "projekte"
  | "vergabe"
  | "finanzen"
  | "personal"
  | "dokumentation"
  | "werkzeuge"
  | "wissen"
  | "verwaltung";

export type ModuleBadge = { text: string; color: "indigo" | "violet" | "amber" | "emerald" | "red" };

export type ModuleDefinition = {
  id: string;
  href: string;
  label: string;
  icon: NavIcon;
  section: ModuleSection;
  badge?: ModuleBadge;
  /** Nur für User mit role=admin sichtbar. */
  adminOnly?: boolean;
  /** Nur sichtbar, wenn das Workspace-Flag aktiv ist (z. B. hinschgEnabled). */
  requiresWorkspaceFlag?: "hinschgEnabled";
  /**
   * Workspace-Typ-Filter — Modul nur sichtbar, wenn workspaces.workspaceRole
   * diesen Wert hat. Fehlt das Feld → für alle Workspace-Typen sichtbar.
   */
  requiresWorkspaceType?: "bauunternehmer" | "bauherr" | "ingenieurbuero";
  /**
   * Disziplin-Filter — Modul nur sichtbar, wenn der Workspace mindestens
   * eine dieser Disziplinen aktiviert hat. Fehlt das Feld → keine
   * Disziplin-Einschränkung.
   *
   * Beispiel: Bauwerksprüfung-Modul nur für `["bauwerkspruefung"]`.
   */
  requiresAnyDiscipline?: readonly Discipline[];
  /**
   * Auftraggeber-Schwerpunkt-Filter — Modul nur sichtbar, wenn der
   * Workspace einen dieser ClientFocus-Werte hat. Fehlt das Feld → für
   * alle ClientFocus-Werte sichtbar.
   *
   * Beispiel: Vergabe-Modul nur bei `["gemischt", "oeffentlich"]`.
   */
  requiresAnyClientFocus?: readonly ClientFocus[];
  /**
   * Bürogrößen-Filter — Modul nur sichtbar, wenn `companySize` ≥ Mindestwert.
   * NULL `companySize` (unbekannt) wird zugelassen → kein heimliches
   * Verstecken bei fehlender Konfiguration.
   */
  requiresCompanySizeMin?: number;
  /**
   * Modul existiert (Route ist erreichbar, Quick-Access-Tile referenziert es),
   * wird aber nicht als eigener Sidebar-Eintrag gezeigt — i. d. R. weil ein
   * Hub-Modul (z. B. „Finanzen", „Analysen") es zusammen mit Geschwistern
   * vertritt. Direkter URL-Aufruf bleibt funktional.
   */
  hideFromSidebar?: boolean;
  /**
   * Zusätzliche Pfad-Präfixe, bei denen dieses Modul als „aktiv" markiert
   * werden soll. Wird von Hub-Modulen genutzt, um auch unter den
   * versteckten Sub-Routen highlighted zu werden.
   */
  activePathPrefixes?: readonly string[];
};

/**
 * Modul-Reihenfolge folgt der Sidebar-Reihenfolge — Sektion oben → unten,
 * innerhalb einer Sektion nach Nutzungs-Häufigkeit (mehrmals täglich → selten).
 */
export const MODULES = [
  // ===== Übersicht =====
  { id: "dashboard", href: "/dashboard", label: "Dashboard", icon: "home", section: "uebersicht" },

  // ===== Tagesgeschäft (mehrmals täglich, Reihenfolge = Morgenroutine) =====
  {
    id: "vorgaenge",
    href: "/vorgaenge",
    label: "Vorgänge",
    icon: "inbox",
    section: "tagesgeschaeft",
  },
  { id: "fristen", href: "/fristen", label: "Fristen", icon: "calendar", section: "tagesgeschaeft" },
  {
    id: "anzeigen",
    href: "/anzeigen",
    label: "Anzeigen",
    icon: "alert-triangle",
    section: "tagesgeschaeft",
  },
  { id: "bautagebuch", href: "/bautagebuch", label: "Bautagebuch", icon: "clipboard-list", section: "tagesgeschaeft" },

  // ===== Projekte (Sprungbrett) =====
  { id: "projekte", href: "/projekte", label: "Projekte", icon: "building", section: "projekte" },

  // ===== Vergabe (Pre-Sales: Ausschreibungen scannen, einordnen, in Vorgang
  // überführen). Sichtbar für alle Workspace-Typen — BU/IB nutzen es zur
  // Bid-Vorbereitung; Bauherrn können eigene Ausschreibungen gegenchecken.
  // Reihenfolge: Radar zuerst (Eingang neuer Treffer), dann Analyse. =====
  {
    id: "ausschreibungs-radar",
    href: "/vergabe/radar",
    label: "Ausschreibungs-Radar",
    icon: "search",
    section: "vergabe",
    badge: { text: "Demo", color: "violet" },
  },
  {
    id: "ausschreibungs-analyse",
    href: "/vergabe",
    label: "Ausschreibungs-Analyse",
    icon: "search",
    section: "vergabe",
    badge: { text: "Demo", color: "violet" },
  },

  // ===== Finanzen (Demo-Slim: Detail-Module verschwinden aus der Sidebar,
  // bleiben über Hub + Direkt-URL erreichbar) =====
  {
    id: "rechnungen",
    href: "/rechnungen",
    label: "Eingangsrechnungen",
    icon: "receipt",
    section: "finanzen",
  },
  {
    id: "ausgangsrechnungen",
    href: "/ausgangsrechnungen",
    label: "Ausgangsrechnungen",
    icon: "receipt",
    section: "finanzen",
  },
  {
    id: "datev",
    href: "/finanzen/datev",
    label: "DATEV-Export",
    icon: "file-text",
    section: "finanzen",
    hideFromSidebar: true,
  },
  {
    id: "liquiditaet",
    href: "/finanzen/liquiditaet",
    label: "Liquidität",
    icon: "calendar",
    section: "finanzen",
    hideFromSidebar: true,
  },
  {
    // Hub-Item bleibt erreichbar (Direkt-URL + activePathPrefixes für Highlight),
    // aber nicht in der Sidebar — die Sub-Module sind direkt sichtbar.
    id: "finanzen",
    href: "/finanzen",
    label: "Finanzen",
    icon: "receipt",
    section: "finanzen",
    hideFromSidebar: true,
    activePathPrefixes: [
      "/finanzen",
      "/rechnungen",
      "/ausgangsrechnungen",
      "/eingangsrechnungen",
    ],
  },
  {
    id: "erechnung-import",
    href: "/eingangsrechnungen/upload",
    label: "E-Rechnung-Import",
    icon: "inbox",
    section: "finanzen",
    hideFromSidebar: true,
  },

  // ===== Personal (Mitarbeiter-Tools — Stunden, Stamm, Zuordnung) =====
  {
    id: "personal",
    href: "/personal",
    label: "Personal",
    icon: "users",
    section: "personal",
    activePathPrefixes: ["/personal", "/stunden"],
  },
  {
    id: "stunden",
    href: "/stunden",
    label: "Stunden",
    icon: "clipboard-list",
    section: "personal",
  },
  {
    id: "personal-zuordnung",
    href: "/personal/zuordnung",
    label: "Projekt-Zuordnung",
    icon: "link2",
    section: "personal",
  },

  // ===== Dokumentation (operative Schriftstücke + Beweise) =====
  { id: "vorlagen", href: "/vorlagen", label: "Vorlagen", icon: "file-text", section: "dokumentation" },
  { id: "beweis", href: "/beweis", label: "Beweissicherung", icon: "camera", section: "dokumentation" },

  // ===== Werkzeuge (anlassbezogene Tools — KI / Heuristiken / Rechner) =====
  {
    id: "recht-assistent",
    href: "/recht-assistent",
    label: "Recht-Assistent",
    icon: "message-circle",
    section: "werkzeuge",
  },
  {
    id: "vertrag",
    href: "/vertrag",
    label: "Vertrags-Scan",
    icon: "shield",
    section: "werkzeuge",
  },
  {
    id: "ruege-analyse",
    href: "/ruege-analyse",
    label: "Rüge-Analyse",
    icon: "search",
    section: "werkzeuge",
  },
  {
    id: "anordnung",
    href: "/anordnung",
    label: "Anordnungs-Check",
    icon: "mail",
    section: "werkzeuge",
  },
  {
    id: "hoai-rechner",
    href: "/hoai-rechner",
    label: "HOAI-Rechner",
    icon: "scale",
    section: "werkzeuge",
    requiresWorkspaceType: "ingenieurbuero",
    // Nur sichtbar, wenn der Workspace mindestens eine HOAI-relevante
    // Planungsdisziplin aktiviert hat. Bauphysik/Vermessung/Bauwerksprüfung
    // haben keine HOAI-Tafel und triggern den Rechner nicht.
    requiresAnyDiscipline: [
      "hochbau_objektplanung",
      "tragwerksplanung",
      "tga",
      "verkehrsanlagen",
      "ingenieurbauwerke",
      "freianlagen",
    ],
  },
  {
    // Hub-Item /analysen bleibt als Übersicht erreichbar, ist aber kein
    // eigener Sidebar-Eintrag — die 3 Sub-Tools stehen direkt unter Werkzeuge.
    id: "analysen",
    href: "/analysen",
    label: "Analysen",
    icon: "search",
    section: "werkzeuge",
    hideFromSidebar: true,
    activePathPrefixes: [
      "/analysen",
      "/vertrag",
      "/ruege-analyse",
      "/anordnung",
    ],
  },

  // ===== Wissen (reine Referenz, kein Workflow) =====
  { id: "gesetze", href: "/gesetze", label: "Gesetzestexte", icon: "book-open", section: "wissen" },
  { id: "urteile", href: "/urteile", label: "Urteile", icon: "scale", section: "wissen" },

  // ===== Verwaltung (selten, daher unten) =====
  { id: "workspace", href: "/workspace", label: "Workspace", icon: "users", section: "verwaltung" },
  {
    id: "nu",
    href: "/nu",
    label: "NU-Pass-Through",
    icon: "link2",
    section: "verwaltung",
    requiresWorkspaceType: "bauunternehmer",
  },
  {
    id: "hinschg",
    href: "/hinschg",
    label: "Hinweise",
    icon: "shield-alert",
    section: "verwaltung",
    adminOnly: true,
    requiresWorkspaceFlag: "hinschgEnabled",
    // HinSchG ist Pflicht ab 50 MA (§ 12 HinSchG); kleinere Büros sehen das
    // Modul nicht in der Demo-Sidebar, selbst wenn die Flag manuell gesetzt ist.
    requiresCompanySizeMin: 50,
  },
  {
    id: "lizenz",
    href: "/lizenz",
    label: "Lizenz-Center",
    icon: "key",
    section: "verwaltung",
    // Demo-Slim: aus der Sidebar, Route bleibt aufrufbar.
    hideFromSidebar: true,
  },
] as const satisfies readonly ModuleDefinition[];

export type ModuleId = (typeof MODULES)[number]["id"];

export const MODULE_BY_ID: Readonly<Record<ModuleId, ModuleDefinition>> =
  Object.fromEntries(MODULES.map((m) => [m.id, m])) as Record<ModuleId, ModuleDefinition>;

/**
 * DE-Fallback-Labels. Sidebar nutzt locale-aware Übersetzung über
 * `nav.sections.<slug>` aus messages/{de,en}.json — diese Labels greifen nur,
 * wenn keine Übersetzung verfügbar ist.
 */
export const SECTION_LABEL: Record<ModuleSection, string> = {
  uebersicht: "Übersicht",
  tagesgeschaeft: "Tagesgeschäft",
  projekte: "Projekte",
  vergabe: "Vergabe",
  finanzen: "Finanzen",
  personal: "Personal",
  dokumentation: "Dokumentation",
  werkzeuge: "Werkzeuge",
  wissen: "Wissen",
  verwaltung: "Verwaltung",
};

export const SECTION_ORDER: ModuleSection[] = [
  "uebersicht",
  "tagesgeschaeft",
  "projekte",
  "vergabe",
  "finanzen",
  "personal",
  "dokumentation",
  "werkzeuge",
  "wissen",
  "verwaltung",
];
