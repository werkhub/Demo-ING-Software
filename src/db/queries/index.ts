/**
 * Aggregator: Re-exportiert alle Domain-Queries.
 *
 * Domain-Aufteilung:
 *   projekte.ts       — Projekte selbst (incl. getProjectsWithStats)
 *   projekt-extras.ts — Nachträge, Kontakte, Beweis-Checklisten am Projekt
 *   fristen.ts        — Fristen mit abgeleiteten Feldern
 *   bautagebuch.ts    — Bautagebuch-Einträge
 *   assistent.ts      — Recht-Assistent-Anfragen-Historie
 *   legal.ts          — Gesetze und Urteile (workspace-übergreifend)
 *   vorgaenge.ts      — Vorgang-Domain
 *   rechnungen.ts     — Rechnungs-Domain
 *   cockpit.ts        — Cross-Domain-Aggregationen (Dashboard, Risk-Matrix, Activity-Feed)
 */

export * from "./projekte";
export * from "./projekt-extras";
export * from "./fristen";
export * from "./bautagebuch";
export * from "./assistent";
export * from "./legal";
export * from "./vorgaenge";
export * from "./rechnungen";
export * from "./anzeigen";
export * from "./abnahme";
export * from "./maengel";
export * from "./hinschg";
export * from "./lv";
export * from "./aufmass";
export * from "./aufmass-pruefer";
export * from "./ausgangsrechnungen";
export * from "./plaene";
export * from "./cockpit";
