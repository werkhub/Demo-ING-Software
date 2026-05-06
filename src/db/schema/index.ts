/**
 * Aggregator: Re-exportiert alle Tabellen-Definitionen, Relations und Types,
 * sodass Konsumenten weiterhin `from "@/db/schema"` importieren können.
 *
 * Domain-Aufteilung (siehe einzelne Files für Details):
 *   core.ts          — workspaces, users
 *   projekte.ts      — projects, contracts, subcontractors, nachtraege, projectContacts
 *   fristen.ts       — fristen
 *   bautagebuch.ts   — bautagebuchEntries, beweisChecklists
 *   assistent.ts     — queries (Recht-Assistent-Anfragen)
 *   legal.ts         — legalChunks, licensedSources, licensedAccessLog, caseDecisions, LEGAL_SOURCE_META
 *   vorgaenge.ts     — vorgaenge + 6 Sub-Tabellen (UC1)
 *   rechnungen.ts    — rechnungen + 2 Sub-Tabellen (UC5)
 *   relations.ts     — alle relations() zentral
 *   types.ts         — alle inferred types und String-Literal-Unions
 */

export * from "./core";
export * from "./projekte";
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
export * from "./stunden";
export * from "./personal";
export * from "./geraete";
export * from "./nu-operations";
export * from "./material";
export * from "./datev";
export * from "./liquiditaet";
export * from "./nachkalk";
export * from "./plaene";
export * from "./bauwerkspruefung";
export * from "./subplaner";
export * from "./hinweise";
export * from "./hoai-kosten-versionen";
export * from "./bemusterung";
export * from "./sachverstaendige";
export * from "./meilensteine";
export * from "./permissions";
export * from "./cron";
export * from "./audit";
export * from "./vergabe-radar";
export * from "./relations";
export * from "./types";
