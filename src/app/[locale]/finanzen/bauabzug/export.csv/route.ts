/**
 * CSV-Export der Bauabzug-Daten eines Quartals — als Vorlage für die
 * ELSTER-Anmeldung im Mein-ELSTER-Portal.
 *
 * Encoding: CP1252, Trenner Semikolon — analog DATEV-Export.
 */
import { NextResponse } from "next/server";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { toCp1252 } from "@/lib/datev/encoding";

export const dynamic = "force-dynamic";

function csvField(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  const v = String(s);
  if (v.includes(";") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function fmtEur(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

function fmtEurFloat(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const jahr = Number(url.searchParams.get("jahr") ?? "");
  const q = Number(url.searchParams.get("q") ?? "");
  if (!Number.isFinite(jahr) || ![1, 2, 3, 4].includes(q)) {
    return NextResponse.json({ error: "invalid_quarter" }, { status: 400 });
  }

  const workspaceId = await getCurrentWorkspaceId();
  const startMonth = (q - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const startIso = `${jahr}-${String(startMonth).padStart(2, "0")}-01`;
  const endIso = `${jahr}-${String(endMonth).padStart(2, "0")}-31`;

  const rechnungen = await db
    .select({
      id: schema.rechnungen.id,
      supplierName: schema.rechnungen.supplierName,
      invoiceDate: schema.rechnungen.invoiceDate,
      totalGross: schema.rechnungen.totalGross,
      totalNet: schema.rechnungen.totalNet,
      bauabzugEinbehaltCents: schema.rechnungen.bauabzugEinbehaltCents,
      bauabzugAnFinanzamtAbgefuehrtAm:
        schema.rechnungen.bauabzugAnFinanzamtAbgefuehrtAm,
    })
    .from(schema.rechnungen)
    .where(
      and(
        eq(schema.rechnungen.workspaceId, workspaceId),
        isNotNull(schema.rechnungen.bauabzugEinbehaltCents)
      )
    )
    .orderBy(asc(schema.rechnungen.invoiceDate));

  const filtered = rechnungen.filter((r) => {
    const cents = r.bauabzugEinbehaltCents ?? 0;
    if (cents <= 0) return false;
    const d = r.invoiceDate ?? "";
    return d >= startIso && d <= endIso;
  });

  const lines: string[] = [];
  lines.push(
    [
      "Rechnungs-ID",
      "Rechnungsdatum",
      "NU/Lieferant",
      "Nettosumme_EUR",
      "Bruttosumme_EUR",
      "Bauabzug_15pct_EUR",
      "Abgefuehrt_am",
      "Status",
    ]
      .map(csvField)
      .join(";")
  );

  let summeCents = 0;
  for (const r of filtered) {
    const cents = r.bauabzugEinbehaltCents ?? 0;
    summeCents += cents;
    lines.push(
      [
        r.id,
        r.invoiceDate ?? "",
        r.supplierName ?? "",
        r.totalNet !== null ? fmtEurFloat(r.totalNet) : "",
        r.totalGross !== null ? fmtEurFloat(r.totalGross) : "",
        fmtEur(cents),
        r.bauabzugAnFinanzamtAbgefuehrtAm ?? "",
        r.bauabzugAnFinanzamtAbgefuehrtAm ? "abgefuehrt" : "offen",
      ]
        .map(csvField)
        .join(";")
    );
  }

  // Summenzeile
  lines.push("");
  lines.push(
    [
      "",
      `Q${q} ${jahr}`,
      `SUMME ${filtered.length} Rg`,
      "",
      "",
      fmtEur(summeCents),
      "",
      "",
    ]
      .map(csvField)
      .join(";")
  );

  const csv = lines.join("\r\n") + "\r\n";
  const buffer = toCp1252(csv);
  const filename = `bauabzug_${jahr}_Q${q}.csv`;

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
