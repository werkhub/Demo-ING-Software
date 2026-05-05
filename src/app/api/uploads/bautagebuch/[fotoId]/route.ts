import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { readUpload } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Liefert ein Bautagebuch-Foto. Workspace-Check über Foto-ID statt Pfad —
 * verhindert Path-Traversal und Cross-Workspace-Zugriff.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fotoId: string }> }
) {
  const { fotoId } = await params;
  const workspaceId = await getCurrentWorkspaceId();
  const [foto] = await db
    .select()
    .from(schema.bautagebuchFotos)
    .where(
      and(
        eq(schema.bautagebuchFotos.id, fotoId),
        eq(schema.bautagebuchFotos.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!foto) {
    return new NextResponse("Foto nicht gefunden", { status: 404 });
  }
  try {
    const buf = await readUpload(foto.storagePath);
    const ab = buf.buffer.slice(
      buf.byteOffset,
      buf.byteOffset + buf.byteLength
    ) as ArrayBuffer;
    return new NextResponse(ab, {
      status: 200,
      headers: {
        "Content-Type": foto.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${foto.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return new NextResponse("Foto konnte nicht geladen werden", { status: 500 });
  }
}
