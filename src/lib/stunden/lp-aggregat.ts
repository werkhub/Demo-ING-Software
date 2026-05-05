/**
 * Aggregations-Helper für HOAI-Soll-Ist-Vergleich.
 *
 * Sammelt geleistete Stunden + Lohnkosten pro Leistungsphase eines Projekts
 * und vergleicht gegen das HOAI-Soll-Honorar. Wird in Projekt-Detail
 * + Nachkalkulations-View verwendet.
 */
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { calculate } from "@/lib/hoai/calculator";
import type {
  HoaiHonorarzone,
  HoaiLeistungsbild,
  HoaiSatz,
  Project,
} from "@/db/schema";
import type { Leistungsphase } from "@/lib/hoai/types";

export type LpIstStunden = {
  lp: Leistungsphase;
  stundenSumme: number;
  lohnIstCents: number;
};

export type LpSollIst = {
  lp: Leistungsphase;
  sollHonorarCents: number;
  istLohnCents: number;
  istStunden: number;
  abweichungPct: number;
  warnung: "ok" | "ueber_soll" | "fruehwarn";
};

/**
 * Sammelt die Ist-Stunden pro Leistungsphase für ein Projekt.
 */
export async function getIstStundenPerLp(
  workspaceId: string,
  projektId: string
): Promise<Map<Leistungsphase, LpIstStunden>> {
  const rows = await db
    .select({
      lp: schema.stunden.leistungsphase,
      stunden: schema.stunden.stunden,
      satz: schema.stunden.stundensatzCents,
    })
    .from(schema.stunden)
    .where(
      and(
        eq(schema.stunden.workspaceId, workspaceId),
        eq(schema.stunden.projektId, projektId),
        sql`${schema.stunden.leistungsphase} IS NOT NULL`
      )
    );

  const map = new Map<Leistungsphase, LpIstStunden>();
  for (const r of rows) {
    if (r.lp === null) continue;
    const lp = r.lp as Leistungsphase;
    const lohn = Math.round(r.stunden * r.satz);
    const cur = map.get(lp);
    if (cur) {
      cur.stundenSumme += r.stunden;
      cur.lohnIstCents += lohn;
    } else {
      map.set(lp, {
        lp,
        stundenSumme: r.stunden,
        lohnIstCents: lohn,
      });
    }
  }
  return map;
}

/**
 * Vergleicht Soll (HOAI-Honorar je LP) gegen Ist (Lohn aus Stunden) für ein
 * Projekt. Liefert pro beauftragter LP eine Zeile mit Abweichung.
 *
 * Nur sinnvoll, wenn project.hoaiLeistungsbild + .hoaiHonorarzone +
 * .hoaiAnrechenbareKostenCents + .hoaiBeauftragteLpsJson gesetzt sind.
 */
export async function getLpSollIst(
  workspaceId: string,
  project: Project
): Promise<LpSollIst[]> {
  if (
    !project.hoaiLeistungsbild ||
    !project.hoaiHonorarzone ||
    !project.hoaiAnrechenbareKostenCents ||
    !project.hoaiBeauftragteLpsJson
  ) {
    return [];
  }

  let beauftragteLps: Leistungsphase[];
  try {
    const parsed = JSON.parse(project.hoaiBeauftragteLpsJson);
    if (!Array.isArray(parsed)) return [];
    beauftragteLps = parsed.filter(
      (n) => typeof n === "number" && n >= 1 && n <= 9
    ) as Leistungsphase[];
  } catch {
    return [];
  }
  if (beauftragteLps.length === 0) return [];

  const calc = calculate({
    leistungsbild: project.hoaiLeistungsbild as HoaiLeistungsbild,
    zone: project.hoaiHonorarzone as HoaiHonorarzone,
    satz: (project.hoaiSatz ?? "mittel") as HoaiSatz,
    anrechenbareKostenCents: project.hoaiAnrechenbareKostenCents,
    beauftragteLps,
    umbauZuschlagPct: project.hoaiUmbauZuschlagPct ?? 0,
    nebenkostenPauschalePct: project.hoaiNebenkostenPct ?? 0,
  });
  if (!calc.ok) return [];

  const istMap = await getIstStundenPerLp(workspaceId, project.id);

  return beauftragteLps.map((lp) => {
    const sollCents = calc.result.lpAufsplittCents[lp] ?? 0;
    const ist = istMap.get(lp);
    const istCents = ist?.lohnIstCents ?? 0;
    const istStunden = ist?.stundenSumme ?? 0;
    const abweichungPct = sollCents > 0 ? (istCents - sollCents) / sollCents : 0;
    let warnung: LpSollIst["warnung"] = "ok";
    if (sollCents > 0 && istCents > sollCents) warnung = "ueber_soll";
    else if (sollCents > 0 && istCents > sollCents * 0.85) warnung = "fruehwarn";
    return {
      lp,
      sollHonorarCents: sollCents,
      istLohnCents: istCents,
      istStunden,
      abweichungPct,
      warnung,
    };
  });
}
