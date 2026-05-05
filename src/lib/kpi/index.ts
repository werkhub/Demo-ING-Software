/**
 * GF-KPI-Modul — operative KPIs aus existierenden Domain-Tabellen,
 * ohne neues Schema. Zentrale Konsumentenschnittstelle: getAllGfKpis().
 */
import { getAuftragsbestand, type AuftragsbestandResult } from "./auftragsbestand";
import { getAuslastung, type AuslastungResult } from "./auslastung";
import {
  getForderungslaufzeit,
  type ForderungslaufzeitResult,
} from "./forderungslaufzeit";
import { getMaengelquote, type MaengelquoteResult } from "./maengelquote";
import {
  getSicherheitenVolumen,
  type SicherheitenVolumenResult,
} from "./sicherheiten-volumen";
import {
  getWorkingCapital,
  type WorkingCapitalResult,
} from "./working-capital";

export * from "./cache";
export * from "./format";
export * from "./period";
export * from "./auftragsbestand";
export * from "./working-capital";
export * from "./sicherheiten-volumen";
export * from "./forderungslaufzeit";
export * from "./maengelquote";
export * from "./auslastung";

export type GfKpis = {
  auftragsbestand: AuftragsbestandResult;
  workingCapital: WorkingCapitalResult;
  sicherheitenVolumen: SicherheitenVolumenResult;
  forderungslaufzeit: ForderungslaufzeitResult;
  maengelquote: MaengelquoteResult;
  auslastung: AuslastungResult;
};

export async function getAllGfKpis(workspaceId: string): Promise<GfKpis> {
  const [
    auftragsbestand,
    workingCapital,
    sicherheitenVolumen,
    forderungslaufzeit,
    maengelquote,
    auslastung,
  ] = await Promise.all([
    getAuftragsbestand(workspaceId),
    getWorkingCapital(workspaceId),
    getSicherheitenVolumen(workspaceId),
    getForderungslaufzeit(workspaceId),
    getMaengelquote(workspaceId),
    getAuslastung(workspaceId),
  ]);
  return {
    auftragsbestand,
    workingCapital,
    sicherheitenVolumen,
    forderungslaufzeit,
    maengelquote,
    auslastung,
  };
}
