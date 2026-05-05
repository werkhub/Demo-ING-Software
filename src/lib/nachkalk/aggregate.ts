/**
 * Nachkalkulation — Live-Aggregation pro LV-Position für ein Projekt.
 *
 * Quellen:
 *   SOLL:        lv_items (über lv → projects)
 *   IST_LOHN:    stunden.lvPositionId (Modul 3.2)
 *   IST_MATERIAL: bestellungen_positionen.lvPositionId (Modul 3.4)
 *   IST_NU:      nu_eingangsrechnungen × nu_auftraege_lv.lvPositionId (Modul 3.6)
 *
 * Frühwarnung:
 *   - IST > SOLL                                 → Vorgang
 *   - IST > 0.85 × SOLL bei Fertigstellung < 0.7  → Warnung
 */
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export type NachkalkPositionRow = {
  lvItemId: string;
  oz: string | null;
  shortText: string;
  quantity: number | null;
  unitPrice: number | null;
  unit: string | null;
  sollNettoCents: number;
  istLohnCents: number;
  istMaterialCents: number;
  istNuCents: number;
  istGesamtCents: number;
  deckungsbeitragCents: number;
  abweichungPct: number;
  warning: "ok" | "kostenueberschreitung" | "fruehwarn";
};

export type NachkalkAggregate = {
  positionen: NachkalkPositionRow[];
  total: {
    sollNettoCents: number;
    istLohnCents: number;
    istMaterialCents: number;
    istNuCents: number;
    istGesamtCents: number;
    deckungsbeitragCents: number;
  };
  fertigstellungsgradPct: number;
};

const FRUEHWARN_PCT = 0.85;
const FERTIGSTELLUNG_GRENZE = 0.7;

/**
 * Aggregiert Nachkalkulation für ein Projekt. Workspace-scoped — alle Sub-
 * Queries filtern auf workspaceId.
 */
export async function aggregateNachkalk(
  workspaceId: string,
  projektId: string
): Promise<NachkalkAggregate> {
  // Projekt für progress-Default
  const [project] = await db
    .select({
      progress: schema.projects.progress,
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projektId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  const fertigstellungsgrad = project?.progress ?? 0;

  // LVs des Projekts
  const lvs = await db
    .select({ id: schema.lv.id })
    .from(schema.lv)
    .where(
      and(
        eq(schema.lv.workspaceId, workspaceId),
        eq(schema.lv.projectId, projektId)
      )
    );
  const lvIds = lvs.map((l) => l.id);

  if (lvIds.length === 0) {
    return {
      positionen: [],
      total: {
        sollNettoCents: 0,
        istLohnCents: 0,
        istMaterialCents: 0,
        istNuCents: 0,
        istGesamtCents: 0,
        deckungsbeitragCents: 0,
      },
      fertigstellungsgradPct: fertigstellungsgrad,
    };
  }

  // LV-Positionen (kind = position) als Soll-Basis
  const items = await db
    .select({
      id: schema.lvItems.id,
      oz: schema.lvItems.oz,
      shortText: schema.lvItems.shortText,
      quantity: schema.lvItems.quantity,
      unitPrice: schema.lvItems.unitPrice,
      totalPrice: schema.lvItems.totalPrice,
      unit: schema.lvItems.unit,
      kind: schema.lvItems.kind,
    })
    .from(schema.lvItems)
    .where(
      and(
        eq(schema.lvItems.workspaceId, workspaceId),
        sql`${schema.lvItems.lvId} IN (${sql.join(
          lvIds.map((i) => sql`${i}`),
          sql.raw(",")
        )})`
      )
    );

  const positionItems = items.filter((i) => i.kind === "position");

  // IST_LOHN: Map<lvPositionId, sumCents>
  const lohn = await db
    .select({
      lvPositionId: schema.stunden.lvPositionId,
      stunden: schema.stunden.stunden,
      satz: schema.stunden.stundensatzCents,
    })
    .from(schema.stunden)
    .where(
      and(
        eq(schema.stunden.workspaceId, workspaceId),
        eq(schema.stunden.projektId, projektId),
        sql`${schema.stunden.lvPositionId} IS NOT NULL`
      )
    );
  const lohnMap = new Map<string, number>();
  for (const r of lohn) {
    if (!r.lvPositionId) continue;
    lohnMap.set(
      r.lvPositionId,
      (lohnMap.get(r.lvPositionId) ?? 0) +
        Math.round(r.stunden * r.satz)
    );
  }

  // IST_MATERIAL: bestellungen_positionen × bestellungen.projektId
  const materialRows = await db
    .select({
      lvPositionId: schema.bestellungenPositionen.lvPositionId,
      gesamtCents: schema.bestellungenPositionen.gesamtpreisCents,
      bestellungProjektId: schema.bestellungen.projektId,
    })
    .from(schema.bestellungenPositionen)
    .innerJoin(
      schema.bestellungen,
      eq(schema.bestellungen.id, schema.bestellungenPositionen.bestellungId)
    )
    .where(
      and(
        eq(schema.bestellungenPositionen.workspaceId, workspaceId),
        eq(schema.bestellungen.projektId, projektId),
        sql`${schema.bestellungenPositionen.lvPositionId} IS NOT NULL`
      )
    );
  const materialMap = new Map<string, number>();
  for (const r of materialRows) {
    if (!r.lvPositionId) continue;
    materialMap.set(
      r.lvPositionId,
      (materialMap.get(r.lvPositionId) ?? 0) + r.gesamtCents
    );
  }

  // IST_NU: nu_eingangsrechnungen × nu_auftraege.projektId × nu_auftraege_lv
  const nuAuftraege = await db
    .select({
      id: schema.nuAuftraege.id,
    })
    .from(schema.nuAuftraege)
    .where(
      and(
        eq(schema.nuAuftraege.workspaceId, workspaceId),
        eq(schema.nuAuftraege.projektId, projektId)
      )
    );
  const nuAuftragIds = nuAuftraege.map((a) => a.id);
  const nuMap = new Map<string, number>();
  if (nuAuftragIds.length > 0) {
    // Welche LV-Positionen sind je Auftrag verknüpft?
    const lvLinks = await db
      .select({
        nuAuftragId: schema.nuAuftraegeLv.nuAuftragId,
        lvPositionId: schema.nuAuftraegeLv.lvPositionId,
      })
      .from(schema.nuAuftraegeLv)
      .where(
        sql`${schema.nuAuftraegeLv.nuAuftragId} IN (${sql.join(
          nuAuftragIds.map((i) => sql`${i}`),
          sql.raw(",")
        )})`
      );
    const auftragLvMap = new Map<string, string[]>();
    for (const l of lvLinks) {
      if (!l.lvPositionId) continue;
      const arr = auftragLvMap.get(l.nuAuftragId) ?? [];
      arr.push(l.lvPositionId);
      auftragLvMap.set(l.nuAuftragId, arr);
    }

    // Rechnungen geprüft/gezahlt aggregieren
    const rechnungen = await db
      .select({
        nuAuftragId: schema.nuEingangsrechnungen.nuAuftragId,
        nettoCents: schema.nuEingangsrechnungen.nettoCents,
        status: schema.nuEingangsrechnungen.status,
      })
      .from(schema.nuEingangsrechnungen)
      .where(
        and(
          eq(schema.nuEingangsrechnungen.workspaceId, workspaceId),
          sql`${schema.nuEingangsrechnungen.nuAuftragId} IN (${sql.join(
            nuAuftragIds.map((i) => sql`${i}`),
            sql.raw(",")
          )})`
        )
      );
    for (const r of rechnungen) {
      if (r.status !== "gezahlt" && r.status !== "geprueft") continue;
      const lvIds = auftragLvMap.get(r.nuAuftragId);
      if (!lvIds || lvIds.length === 0) continue;
      const split = Math.round(r.nettoCents / lvIds.length);
      for (const lvId of lvIds) {
        nuMap.set(lvId, (nuMap.get(lvId) ?? 0) + split);
      }
    }
  }

  // Pro LV-Position aggregieren
  const positionen: NachkalkPositionRow[] = positionItems.map((it) => {
    const sollEur = it.totalPrice ?? (it.quantity ?? 0) * (it.unitPrice ?? 0);
    const sollCents = Math.round(sollEur * 100);
    const lohnCents = lohnMap.get(it.id) ?? 0;
    const materialCents = materialMap.get(it.id) ?? 0;
    const nuCents = nuMap.get(it.id) ?? 0;
    const istGesamt = lohnCents + materialCents + nuCents;
    const db = sollCents - istGesamt;
    const abweichungPct = sollCents > 0 ? (istGesamt - sollCents) / sollCents : 0;

    let warning: "ok" | "kostenueberschreitung" | "fruehwarn" = "ok";
    if (sollCents > 0) {
      if (istGesamt > sollCents) {
        warning = "kostenueberschreitung";
      } else if (
        istGesamt > sollCents * FRUEHWARN_PCT &&
        fertigstellungsgrad < FERTIGSTELLUNG_GRENZE
      ) {
        warning = "fruehwarn";
      }
    }

    return {
      lvItemId: it.id,
      oz: it.oz,
      shortText: it.shortText,
      quantity: it.quantity,
      unitPrice: it.unitPrice,
      unit: it.unit,
      sollNettoCents: sollCents,
      istLohnCents: lohnCents,
      istMaterialCents: materialCents,
      istNuCents: nuCents,
      istGesamtCents: istGesamt,
      deckungsbeitragCents: db,
      abweichungPct,
      warning,
    };
  });

  // Total
  const total = positionen.reduce(
    (acc, p) => ({
      sollNettoCents: acc.sollNettoCents + p.sollNettoCents,
      istLohnCents: acc.istLohnCents + p.istLohnCents,
      istMaterialCents: acc.istMaterialCents + p.istMaterialCents,
      istNuCents: acc.istNuCents + p.istNuCents,
      istGesamtCents: acc.istGesamtCents + p.istGesamtCents,
      deckungsbeitragCents: acc.deckungsbeitragCents + p.deckungsbeitragCents,
    }),
    {
      sollNettoCents: 0,
      istLohnCents: 0,
      istMaterialCents: 0,
      istNuCents: 0,
      istGesamtCents: 0,
      deckungsbeitragCents: 0,
    }
  );

  return {
    positionen,
    total,
    fertigstellungsgradPct: fertigstellungsgrad,
  };
}

export const NACHKALK_WARN_LABEL: Record<
  NachkalkPositionRow["warning"],
  string
> = {
  ok: "OK",
  kostenueberschreitung: "Kostenüberschreitung",
  fruehwarn: "Frühwarnung",
};
