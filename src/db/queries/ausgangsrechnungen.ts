import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import type {
  Ausgangsrechnung,
  AusgangsrechnungPosition,
} from "@/db/schema";

export async function getAusgangsrechnungen(): Promise<Ausgangsrechnung[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.ausgangsrechnungen)
    .where(eq(schema.ausgangsrechnungen.workspaceId, workspaceId))
    .orderBy(desc(schema.ausgangsrechnungen.invoiceDate));
}

export async function getAusgangsrechnungenByProject(
  projectId: string
): Promise<Ausgangsrechnung[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.ausgangsrechnungen)
    .where(
      and(
        eq(schema.ausgangsrechnungen.workspaceId, workspaceId),
        eq(schema.ausgangsrechnungen.projectId, projectId)
      )
    )
    .orderBy(desc(schema.ausgangsrechnungen.invoiceDate));
}

export async function getAusgangsrechnung(
  id: string
): Promise<Ausgangsrechnung | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.ausgangsrechnungen)
    .where(
      and(
        eq(schema.ausgangsrechnungen.id, id),
        eq(schema.ausgangsrechnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getArPositionen(
  ausgangsrechnungId: string
): Promise<AusgangsrechnungPosition[]> {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.ausgangsrechnungPositionen)
    .where(
      and(
        eq(schema.ausgangsrechnungPositionen.workspaceId, workspaceId),
        eq(
          schema.ausgangsrechnungPositionen.ausgangsrechnungId,
          ausgangsrechnungId
        )
      )
    )
    .orderBy(
      asc(schema.ausgangsrechnungPositionen.sortIndex),
      asc(schema.ausgangsrechnungPositionen.createdAt)
    );
}

export async function getArMahnungen(arId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  return db
    .select()
    .from(schema.ausgangsrechnungMahnungen)
    .where(
      and(
        eq(schema.ausgangsrechnungMahnungen.workspaceId, workspaceId),
        eq(schema.ausgangsrechnungMahnungen.ausgangsrechnungId, arId)
      )
    )
    .orderBy(asc(schema.ausgangsrechnungMahnungen.level));
}

export async function getArMahnung(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.ausgangsrechnungMahnungen)
    .where(
      and(
        eq(schema.ausgangsrechnungMahnungen.id, id),
        eq(schema.ausgangsrechnungMahnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

export async function getArPosition(
  id: string
): Promise<AusgangsrechnungPosition | null> {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.ausgangsrechnungPositionen)
    .where(
      and(
        eq(schema.ausgangsrechnungPositionen.id, id),
        eq(schema.ausgangsrechnungPositionen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

/** Aggregat für Top-Level-Liste. */
export async function getArStats(): Promise<{
  total: number;
  entwuerfe: number;
  offen: number;
  bezahlt: number;
  mahnung: number;
  totalOffenGross: number;
}> {
  const all = await getAusgangsrechnungen();
  const offen = all.filter(
    (r) =>
      r.status === "versendet" ||
      r.status === "teilweise_bezahlt" ||
      r.status === "mahnung_1" ||
      r.status === "mahnung_2" ||
      r.status === "mahnung_3" ||
      r.status === "gerichtlich"
  );
  return {
    total: all.length,
    entwuerfe: all.filter((r) => r.status === "entwurf").length,
    offen: offen.length,
    bezahlt: all.filter((r) => r.status === "bezahlt").length,
    mahnung: all.filter(
      (r) =>
        r.status === "mahnung_1" ||
        r.status === "mahnung_2" ||
        r.status === "mahnung_3" ||
        r.status === "gerichtlich"
    ).length,
    totalOffenGross: Math.round(
      offen.reduce(
        (s, r) => s + (r.payoutGross ?? 0) - (r.paidAmount ?? 0),
        0
      ) * 100
    ) / 100,
  };
}
