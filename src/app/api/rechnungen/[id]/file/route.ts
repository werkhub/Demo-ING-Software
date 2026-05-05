import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { readUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workspaceId = await getCurrentWorkspaceId();
  const [rechnung] = await db
    .select()
    .from(schema.rechnungen)
    .where(
      and(
        eq(schema.rechnungen.id, id),
        eq(schema.rechnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!rechnung || !rechnung.sourceFilePath) {
    return new NextResponse("Datei nicht gefunden", { status: 404 });
  }
  try {
    const buf = await readUpload(rechnung.sourceFilePath);
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength
    ) as ArrayBuffer;
    const fileName = rechnung.sourceFilePath.split("/").pop() ?? "rechnung";
    const ext = fileName.split(".").pop()?.toLowerCase();
    const mime =
      ext === "pdf"
        ? "application/pdf"
        : ext === "xml"
          ? "application/xml"
          : ext === "png"
            ? "image/png"
            : ext === "jpg" || ext === "jpeg"
              ? "image/jpeg"
              : "application/octet-stream";
    return new NextResponse(ab, {
      status: 200,
      headers: {
        "Content-Type": mime,
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return new NextResponse("Datei konnte nicht geladen werden", { status: 500 });
  }
}
