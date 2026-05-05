/**
 * Liefert die generierte XRechnung-XML als Download aus.
 * GET /api/ausgangsrechnungen/[id]/xrechnung
 */
import { NextResponse } from "next/server";
import { getAusgangsrechnung } from "@/db/queries";
import { readUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ar = await getAusgangsrechnung(id);
  if (!ar) {
    return new NextResponse("Rechnung nicht gefunden.", { status: 404 });
  }
  if (!ar.xrechnungXmlPath) {
    return new NextResponse("XRechnung wurde noch nicht generiert.", {
      status: 404,
    });
  }
  let buffer: Buffer;
  try {
    buffer = await readUpload(ar.xrechnungXmlPath);
  } catch {
    return new NextResponse("XRechnung-Datei nicht lesbar.", { status: 500 });
  }
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="xrechnung_${ar.number}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}
