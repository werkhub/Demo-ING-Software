/**
 * Liefert die generierte ZUGFeRD-PDF/A-3 als Download aus.
 * GET /api/ausgangsrechnungen/[id]/zugferd
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
  if (!ar.zugferdPdfPath) {
    return new NextResponse("ZUGFeRD-PDF wurde noch nicht generiert.", {
      status: 404,
    });
  }
  let buffer: Buffer;
  try {
    buffer = await readUpload(ar.zugferdPdfPath);
  } catch {
    return new NextResponse("ZUGFeRD-PDF nicht lesbar.", { status: 500 });
  }
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="zugferd_${ar.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
