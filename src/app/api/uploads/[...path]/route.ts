import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { readUpload, resolveUploadPath } from "@/lib/plaene/storage";

export const dynamic = "force-dynamic";

function inferMime(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "dwg":
      return "application/acad";
    case "dxf":
      return "image/vnd.dxf";
    case "ifc":
      return "application/x-step";
    case "doc":
      return "application/msword";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xls":
      return "application/vnd.ms-excel";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/octet-stream";
  }
}

/**
 * Liefert eine Datei aus ./data/uploads/<bucket>/... aus.
 *
 * Authorisierung in zwei Stufen:
 *   1. Workspace-ID im Pfad muss zum eingeloggten User passen.
 *   2. DB-Lookup auf Plan-Version bzw. Dokument bestätigt, dass die Entität
 *      tatsächlich zum Workspace gehört (verhindert manuelle Pfad-Konstruktion
 *      mit beliebigen IDs).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const segments = (path ?? []).filter((s) => s.length > 0);
  let resolved;
  try {
    resolved = resolveUploadPath(segments);
  } catch {
    return new NextResponse("Ungültiger Pfad.", { status: 400 });
  }

  const workspaceId = await getCurrentWorkspaceId();
  if (resolved.workspaceId !== workspaceId) {
    return new NextResponse("Forbidden.", { status: 403 });
  }

  // DB-Lookup zur Bestätigung, dass das Entity wirklich existiert + zum WS gehört.
  if (resolved.bucket === "plaene") {
    const [plan] = await db
      .select({ id: schema.plaene.id })
      .from(schema.plaene)
      .where(
        and(
          eq(schema.plaene.id, resolved.entityId),
          eq(schema.plaene.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!plan) return new NextResponse("Nicht gefunden.", { status: 404 });
  } else {
    const [dok] = await db
      .select({ id: schema.dokumente.id })
      .from(schema.dokumente)
      .where(
        and(
          eq(schema.dokumente.id, resolved.entityId),
          eq(schema.dokumente.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!dok) return new NextResponse("Nicht gefunden.", { status: 404 });
  }

  try {
    const buf = await readUpload(resolved.absolutePath);
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength
    ) as ArrayBuffer;
    return new NextResponse(ab, {
      status: 200,
      headers: {
        "Content-Type": inferMime(resolved.filename),
        "Content-Disposition": `inline; filename="${resolved.filename}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return new NextResponse("Datei konnte nicht geladen werden.", {
      status: 500,
    });
  }
}
