import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getAnzeige } from "@/db/queries";
import {
  ANZEIGE_KIND_LABEL,
  RECIPIENT_ROLE_LABEL,
} from "@/lib/anzeigen";
import { formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnzeigePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAnzeige(id);
  if (!a) notFound();

  const workspaceId = await getCurrentWorkspaceId();
  const [project] = await db
    .select({
      identifier: schema.projects.identifier,
      name: schema.projects.name,
      ag: schema.projects.ag,
      siteAddress: schema.projects.siteAddress,
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, a.projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);

  const [workspace] = await db
    .select({
      name: schema.workspaces.name,
    })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);

  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white text-black p-12 print:p-0">
      <div className="max-w-[800px] mx-auto print:max-w-none">
        {/* Briefkopf */}
        <div className="flex justify-between items-start mb-12 pb-4 border-b border-black/20">
          <div className="text-sm">
            {workspace?.name ? (
              <p className="font-semibold">{workspace.name}</p>
            ) : (
              <p className="font-semibold text-gray-400">[Ihre Firma]</p>
            )}
          </div>
          <div className="text-right text-sm">
            <p>{today}</p>
          </div>
        </div>

        {/* Empfänger */}
        <div className="mb-12 text-sm">
          {a.recipientName ? <p>{a.recipientName}</p> : null}
          {a.recipientRole ? (
            <p className="text-gray-600">
              {RECIPIENT_ROLE_LABEL[a.recipientRole]}
            </p>
          ) : null}
          {project?.ag ? <p className="mt-2">{project.ag}</p> : null}
          {project?.siteAddress ? (
            <p className="text-gray-600">{project.siteAddress}</p>
          ) : null}
        </div>

        {/* Betreff */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-wider text-gray-500">
            Bauvorhaben
          </p>
          <p className="text-sm font-semibold mt-0.5">
            {project ? `${project.identifier} — ${project.name}` : "—"}
          </p>
        </div>

        <div className="mb-8">
          <h1 className="text-xl font-bold">
            {ANZEIGE_KIND_LABEL[a.kind]} nach {a.legalBasis}
          </h1>
          <p className="text-sm text-gray-600 mt-1">{a.title}</p>
        </div>

        {/* Volltext */}
        <article className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed">
          {a.bodyMarkdown}
        </article>

        {/* Footer */}
        <div className="mt-16 pt-4 border-t border-black/20 text-[10px] text-gray-500 flex justify-between">
          <span>
            {ANZEIGE_KIND_LABEL[a.kind]} · {a.legalBasis}
          </span>
          <span>
            Anzeige-ID: {a.id}
            {a.sentAt ? ` · Versand: ${formatDateShort(a.sentAt)}` : ""}
          </span>
        </div>

        {/* Auto-Print */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if (typeof window !== "undefined") { setTimeout(() => window.print(), 200); }`,
          }}
        />
      </div>
    </div>
  );
}
