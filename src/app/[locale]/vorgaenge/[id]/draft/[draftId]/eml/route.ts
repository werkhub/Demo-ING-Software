/**
 * .eml-Export einer Vorgangs-E-Mail-Draft.
 *
 * Liefert eine RFC-822-kompatible Datei, die der User in Outlook/Thunderbird/
 * Apple Mail öffnen und manuell versenden kann. Das ist der „sauber"-Weg
 * zum E-Mail-Versand, solange LexBau keine eigene SMTP-Infrastruktur hat —
 * der User behält die Kontrolle und der Audit-Trail bleibt intakt
 * (Draft-Inhalt + manueller `markDraftAlsVersendet`-Schritt).
 */
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";

export const dynamic = "force-dynamic";

function escapeHeader(s: string): string {
  // Sehr konservativ — Multi-Line-Subjects wären RFC-2047-Encoded; hier
  // strippen wir CR/LF und verlassen uns auf UTF-8 8bit Body.
  return s.replace(/[\r\n]+/g, " ").trim();
}

function nowRfc2822(): string {
  return new Date().toUTCString().replace(/GMT$/, "+0000");
}

function safeFilename(s: string): string {
  return (
    s
      .replace(/[^a-zA-Z0-9-_]+/g, "_")
      .slice(0, 60)
      .replace(/^_+|_+$/g, "") || "draft"
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; draftId: string }> }
) {
  const { id: vorgangId, draftId } = await params;
  const workspaceId = await getCurrentWorkspaceId();

  // Workspace-Check über Vorgang
  const [vorgang] = await db
    .select({ id: schema.vorgaenge.id })
    .from(schema.vorgaenge)
    .where(
      and(
        eq(schema.vorgaenge.id, vorgangId),
        eq(schema.vorgaenge.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!vorgang) {
    return NextResponse.json({ error: "vorgang_not_found" }, { status: 404 });
  }

  const [draft] = await db
    .select()
    .from(schema.vorgangDrafts)
    .where(
      and(
        eq(schema.vorgangDrafts.id, draftId),
        eq(schema.vorgangDrafts.vorgangId, vorgangId)
      )
    )
    .limit(1);
  if (!draft) {
    return NextResponse.json({ error: "draft_not_found" }, { status: 404 });
  }

  const recipient = draft.recipientEmail?.trim() ?? "";
  const subject = escapeHeader(draft.subject);
  const date = nowRfc2822();

  const headers: string[] = [
    `Date: ${date}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    `Content-Transfer-Encoding: 8bit`,
    `X-LexBau-Vorgang: ${vorgangId}`,
    `X-LexBau-Draft: ${draftId}`,
  ];
  if (recipient) headers.push(`To: ${escapeHeader(recipient)}`);
  if (subject) headers.push(`Subject: ${subject}`);

  const eml = headers.join("\r\n") + "\r\n\r\n" + draft.bodyMarkdown + "\r\n";
  const filename = `${safeFilename(draft.subject || "draft")}.eml`;

  return new NextResponse(eml, {
    status: 200,
    headers: {
      "Content-Type": "message/rfc822",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
