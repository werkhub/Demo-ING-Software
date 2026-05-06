/**
 * Rollenspezifische Quick-Access-Tiles fürs Dashboard.
 * Spezial-IDs (mit Präfix `_`) referenzieren Routen, die nicht selbst Module sind:
 *   _vorgang-new = /vorgaenge/new
 *   _rechnung-new = /rechnungen/new
 *   _ask         = /recht-assistent
 */
import type { WorkspaceRole } from "@/db/schema";
import type { ModuleId } from "./modules";

export type QuickActionId = ModuleId | "_vorgang-new" | "_rechnung-new" | "_ask";

export type QuickTile = {
  id: QuickActionId;
  title: string;
  desc: string;
  href: string;
};

const QUICK_ACCESS_ALL: Record<QuickActionId, QuickTile> = {
  "_vorgang-new": {
    id: "_vorgang-new",
    title: "Neuer Vorgang",
    desc: "Dokument hochladen",
    href: "/vorgaenge/new",
  },
  "_ask": {
    id: "_ask",
    title: "Neue Frage",
    desc: "Recht-Assistent fragen",
    href: "/recht-assistent",
  },
  "_rechnung-new": {
    id: "_rechnung-new",
    title: "Rechnung hochladen",
    desc: "Anomalie-Check starten",
    href: "/rechnungen/new",
  },
  vertrag: {
    id: "vertrag",
    title: "Vertrag prüfen",
    desc: "Risiko-Scan vor Unterschrift",
    href: "/vertrag",
  },
  "ruege-analyse": {
    id: "ruege-analyse",
    title: "Rüge analysieren",
    desc: "Eingehende Mangelrüge",
    href: "/ruege-analyse",
  },
  anordnung: {
    id: "anordnung",
    title: "Anordnung prüfen",
    desc: "WhatsApp / E-Mail",
    href: "/anordnung",
  },
  bautagebuch: {
    id: "bautagebuch",
    title: "Bautagebuch",
    desc: "Tageseintrag erfassen",
    href: "/bautagebuch",
  },
  gesetze: {
    id: "gesetze",
    title: "§-Volltext",
    desc: "VOB/A/B/C, BGB, HOAI",
    href: "/gesetze",
  },
  // Restliche Module-IDs sind formal verfügbar, aber nicht in den Default-Listen.
  // Pro forma als Tile-Eintrag, falls eine Rolle eines davon als Quick-Action nutzt.
  dashboard: { id: "dashboard", title: "Dashboard", desc: "Cockpit", href: "/dashboard" },
  vorgaenge: { id: "vorgaenge", title: "Vorgänge", desc: "Liste", href: "/vorgaenge" },
  projekte: { id: "projekte", title: "Projekte", desc: "Liste", href: "/projekte" },
  fristen: { id: "fristen", title: "Fristen", desc: "Liste", href: "/fristen" },
  rechnungen: { id: "rechnungen", title: "Eingangsrechnungen", desc: "Liste", href: "/rechnungen" },
  ausgangsrechnungen: {
    id: "ausgangsrechnungen",
    title: "Ausgangsrechnungen",
    desc: "Abschlag + Schluss",
    href: "/ausgangsrechnungen",
  },
  stunden: {
    id: "stunden",
    title: "Stunden",
    desc: "Personal-Stunden je Tag",
    href: "/stunden",
  },
  datev: {
    id: "datev",
    title: "DATEV-Export",
    desc: "Buchungsstapel CSV",
    href: "/finanzen/datev",
  },
  liquiditaet: {
    id: "liquiditaet",
    title: "Liquidität",
    desc: "Cashflow-Forecast",
    href: "/finanzen/liquiditaet",
  },
  "erechnung-import": {
    id: "erechnung-import",
    title: "E-Rechnung importieren",
    desc: "XRechnung / ZUGFeRD",
    href: "/eingangsrechnungen/upload",
  },
  "hoai-rechner": {
    id: "hoai-rechner",
    title: "HOAI-Rechner",
    desc: "Honorar nach HOAI 2021",
    href: "/hoai-rechner",
  },
  anzeigen: { id: "anzeigen", title: "Anzeigen", desc: "BHA / Bedenken", href: "/anzeigen" },
  hinschg: { id: "hinschg", title: "Hinweise", desc: "HinSchG-Meldungen", href: "/hinschg" },
  "recht-assistent": {
    id: "recht-assistent",
    title: "Recht-Assistent",
    desc: "Q&A-Sandbox",
    href: "/recht-assistent",
  },
  urteile: { id: "urteile", title: "Urteile", desc: "BGH/OLG", href: "/urteile" },
  vorlagen: { id: "vorlagen", title: "Vorlagen", desc: "Bibliothek", href: "/vorlagen" },
  beweis: { id: "beweis", title: "Beweissicherung", desc: "Checklisten", href: "/beweis" },
  workspace: { id: "workspace", title: "Workspace", desc: "Verwaltung", href: "/workspace" },
  nu: { id: "nu", title: "NU-Pass-Through", desc: "Verwaltung", href: "/nu" },
  lizenz: { id: "lizenz", title: "Lizenz-Center", desc: "Verwaltung", href: "/lizenz" },
  finanzen: {
    id: "finanzen",
    title: "Finanzen",
    desc: "Rechnungen, DATEV, Liquidität",
    href: "/finanzen",
  },
  analysen: {
    id: "analysen",
    title: "Analysen",
    desc: "Vertrag · Rüge · Anordnung",
    href: "/analysen",
  },
  personal: {
    id: "personal",
    title: "Personal",
    desc: "Mitarbeiter und Stunden",
    href: "/personal",
  },
  "personal-zuordnung": {
    id: "personal-zuordnung",
    title: "Personal-Zuordnung",
    desc: "Mitarbeiter den Projekten zuordnen",
    href: "/personal/zuordnung",
  },
  "ausschreibungs-analyse": {
    id: "ausschreibungs-analyse",
    title: "Ausschreibung scannen",
    desc: "Vergabeunterlagen einordnen",
    href: "/vergabe",
  },
  "ausschreibungs-radar": {
    id: "ausschreibungs-radar",
    title: "Ausschreibungs-Radar",
    desc: "Treffer aus Vergabe-Plattformen",
    href: "/vergabe/radar",
  },
  abschlagspruefung: {
    id: "abschlagspruefung",
    title: "Abschlag prüfen",
    desc: "LV/Aufmaß/§ 16 VOB/B",
    href: "/abschlagspruefung",
  },
  "rgb-wissen": {
    id: "rgb-wissen",
    title: "RGB-Wissen",
    desc: "Wissensdatenbank",
    href: "/rgb-wissen",
  },
};

const QUICK_ACCESS_ORDER: Record<WorkspaceRole, QuickActionId[]> = {
  bauunternehmer: [
    "_vorgang-new",
    "_ask",
    "anordnung",
    "bautagebuch",
    "_rechnung-new",
    "ruege-analyse",
    "vertrag",
    "gesetze",
  ],
  bauherr: [
    "_vorgang-new",
    "_ask",
    "ruege-analyse",
    "anordnung",
    "vertrag",
    "gesetze",
    "bautagebuch",
    "_rechnung-new",
  ],
  ingenieurbuero: [
    "_vorgang-new",
    "_ask",
    "hoai-rechner",
    "bautagebuch",
    "vertrag",
    "anordnung",
    "ruege-analyse",
    "vorlagen",
  ],
};

const QUICK_ACCESS_LABEL_OVERRIDES: Partial<
  Record<
    WorkspaceRole,
    Partial<Record<QuickActionId, { title?: string; desc?: string }>>
  >
> = {
  bauherr: {
    "ruege-analyse": {
      title: "Mängel rügen",
      desc: "Frist setzen, Vorlage erstellen",
    },
    anordnung: {
      title: "Anordnung erteilen",
      desc: "Beweissicher dokumentieren",
    },
    bautagebuch: { title: "Bauüberwachung", desc: "AG-Sicht auf Bauablauf" },
  },
  ingenieurbuero: {
    "ruege-analyse": {
      title: "Mängel-Rüge prüfen",
      desc: "Eingegangene Rüge bewerten",
    },
    anordnung: {
      title: "Anordnung dokumentieren",
      desc: "AG-Anordnung beweissicher erfassen",
    },
    bautagebuch: { title: "Bautagebuch (LP8)", desc: "Bauleitungs-Doku" },
    vertrag: { title: "Verträge prüfen", desc: "AG-/Sub-Planer-Verträge" },
  },
};

export function buildQuickAccess(role: WorkspaceRole): QuickTile[] {
  const order = QUICK_ACCESS_ORDER[role];
  const overrides = QUICK_ACCESS_LABEL_OVERRIDES[role] ?? {};
  const seen = new Set<QuickActionId>();
  const tiles: QuickTile[] = [];
  for (const id of order) {
    if (seen.has(id)) continue;
    seen.add(id);
    const base = QUICK_ACCESS_ALL[id];
    if (!base) continue;
    tiles.push({
      ...base,
      title: overrides[id]?.title ?? base.title,
      desc: overrides[id]?.desc ?? base.desc,
    });
  }
  return tiles;
}
