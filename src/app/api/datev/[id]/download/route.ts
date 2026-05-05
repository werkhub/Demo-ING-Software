import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";

/**
 * Liefert das DATEV-EXTF-CSV als Download. Workspace-Auth erforderlich.
 *
 * Content-Type: text/csv; charset=windows-1252
 * Content-Disposition: attachment mit Datev-typischem Filename.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const workspaceId = await getCurrentWorkspaceId();

  const [row] = await db
    .select()
    .from(schema.datevExports)
    .where(
      and(
        eq(schema.datevExports.id, id),
        eq(schema.datevExports.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let buffer: Buffer;
  try {
    buffer = await fs.readFile(row.filePath);
  } catch {
    return NextResponse.json({ error: "file_missing" }, { status: 404 });
  }

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=windows-1252",
      "Content-Disposition": `attachment; filename="${row.filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
