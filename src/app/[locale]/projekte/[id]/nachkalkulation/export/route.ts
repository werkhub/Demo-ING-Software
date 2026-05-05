import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  aggregateNachkalk,
  NACHKALK_WARN_LABEL,
} from "@/lib/nachkalk/aggregate";
import { toCp1252 } from "@/lib/datev/encoding";

/**
 * CSV-Export für Nachkalkulation pro LV-Position. CP1252-encoded für Excel-DE.
 *
 * Header (Semikolon-Trenner):
 *   OZ;Bezeichnung;Menge;Einheit;EP;SOLL_Netto_EUR;IST_Lohn_EUR;
 *   IST_Material_EUR;IST_NU_EUR;IST_Gesamt_EUR;Deckungsbeitrag_EUR;
 *   Abweichung_Pct;Status
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projektId } = await params;
  const workspaceId = await getCurrentWorkspaceId();

  const [project] = await db
    .select({
      id: schema.projects.id,
      identifier: schema.projects.identifier,
      name: schema.projects.name,
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projektId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const agg = await aggregateNachkalk(workspaceId, projektId);

  const fmtCents = (c: number): string =>
    (c / 100).toFixed(2).replace(".", ",");
  const fmtPct = (n: number): string =>
    (n * 100).toFixed(1).replace(".", ",");
  const csvField = (s: string | null | undefined): string => {
    if (s === null || s === undefined) return "";
    const v = String(s);
    if (v.includes(";") || v.includes('"') || v.includes("\n")) {
      return `"${v.replace(/"/g, '""')}"`;
    }
    return v;
  };

  const lines: string[] = [];
  lines.push(
    [
      "OZ",
      "Bezeichnung",
      "Menge",
      "Einheit",
      "EP",
      "SOLL_Netto_EUR",
      "IST_Lohn_EUR",
      "IST_Material_EUR",
      "IST_NU_EUR",
      "IST_Gesamt_EUR",
      "Deckungsbeitrag_EUR",
      "Abweichung_Pct",
      "Status",
    ].join(";")
  );

  for (const p of agg.positionen) {
    lines.push(
      [
        csvField(p.oz),
        csvField(p.shortText),
        p.quantity ?? "",
        csvField(p.unit),
        p.unitPrice !== null ? p.unitPrice.toFixed(2).replace(".", ",") : "",
        fmtCents(p.sollNettoCents),
        fmtCents(p.istLohnCents),
        fmtCents(p.istMaterialCents),
        fmtCents(p.istNuCents),
        fmtCents(p.istGesamtCents),
        fmtCents(p.deckungsbeitragCents),
        fmtPct(p.abweichungPct),
        NACHKALK_WARN_LABEL[p.warning],
      ].join(";")
    );
  }

  // Summenzeile
  lines.push(
    [
      "",
      "GESAMT",
      "",
      "",
      "",
      fmtCents(agg.total.sollNettoCents),
      fmtCents(agg.total.istLohnCents),
      fmtCents(agg.total.istMaterialCents),
      fmtCents(agg.total.istNuCents),
      fmtCents(agg.total.istGesamtCents),
      fmtCents(agg.total.deckungsbeitragCents),
      "",
      "",
    ].join(";")
  );

  const csv = lines.join("\r\n") + "\r\n";
  const buffer = toCp1252(csv);
  const stichtag = new Date().toISOString().slice(0, 10);
  const filename = `nachkalkulation_${project.identifier}_${stichtag}.csv`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=windows-1252",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
