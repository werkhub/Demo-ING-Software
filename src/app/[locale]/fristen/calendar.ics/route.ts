/**
 * iCal-Export aller offenen Fristen + bevorstehender Meilensteine des
 * aktuellen Workspaces. Für Outlook/Apple Calendar/Google Calendar Import.
 *
 * Hinweis: Subscription-URL (.ics als Live-Feed) erfordert Token-Auth — hier
 * nur Session-basiert. Nutzer kann die Datei runterladen und ihrem Kalender
 * hinzufügen; periodisches Re-Import liegt in Verantwortung des Nutzers.
 */
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";

export const dynamic = "force-dynamic";

function ymd(iso: string): string {
  return iso.replace(/-/g, "");
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function nowStamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

function fold(line: string): string {
  // RFC 5545: 75 Oktett Zeilen-Limit, fortgesetzt mit "\r\n " (CRLF + Space)
  const max = 73;
  if (line.length <= max) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i === 0 ? max : i + max - 1);
    out.push(i === 0 ? chunk : " " + chunk);
    i += chunk.length;
  }
  return out.join("\r\n");
}

export async function GET() {
  const workspaceId = await getCurrentWorkspaceId();

  const [fristen, meilensteine] = await Promise.all([
    db
      .select()
      .from(schema.fristen)
      .where(
        and(
          eq(schema.fristen.workspaceId, workspaceId),
          eq(schema.fristen.completed, false)
        )
      ),
    db
      .select()
      .from(schema.meilensteine)
      .where(
        and(
          eq(schema.meilensteine.workspaceId, workspaceId),
          inArray(schema.meilensteine.status, [
            "geplant",
            "laufend",
            "verzoegert",
          ])
        )
      ),
  ]);

  // Projekt-Identifier zur Anreicherung
  const projectIds = new Set<string>();
  for (const f of fristen) if (f.projectId) projectIds.add(f.projectId);
  for (const m of meilensteine) projectIds.add(m.projectId);
  const projects =
    projectIds.size > 0
      ? await db
          .select({
            id: schema.projects.id,
            identifier: schema.projects.identifier,
            name: schema.projects.name,
          })
          .from(schema.projects)
          .where(
            and(
              eq(schema.projects.workspaceId, workspaceId),
              inArray(schema.projects.id, Array.from(projectIds))
            )
          )
      : [];
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//LexBau//Fristen+Termine//DE");
  lines.push("CALSCALE:GREGORIAN");
  lines.push("METHOD:PUBLISH");
  lines.push("X-WR-CALNAME:LexBau · Fristen + Termine");
  lines.push("X-WR-TIMEZONE:Europe/Berlin");

  const stamp = nowStamp();

  for (const f of fristen) {
    const project = f.projectId ? projectMap.get(f.projectId) : null;
    const summary = project
      ? `${project.identifier} · ${f.task}`
      : f.task;
    const desc = [
      f.legalBasis ? `Rechtsgrundlage: ${f.legalBasis}` : null,
      project ? `Projekt: ${project.name}` : null,
    ]
      .filter(Boolean)
      .join("\\n");
    lines.push("BEGIN:VEVENT");
    lines.push(fold(`UID:frist-${f.id}@lexbau`));
    lines.push(fold(`DTSTAMP:${stamp}`));
    lines.push(fold(`DTSTART;VALUE=DATE:${ymd(f.deadline)}`));
    lines.push(fold(`SUMMARY:${escapeIcs(summary)}`));
    if (desc) lines.push(fold(`DESCRIPTION:${escapeIcs(desc)}`));
    lines.push(fold("CATEGORIES:Frist"));
    lines.push("END:VEVENT");
  }

  for (const m of meilensteine) {
    const project = projectMap.get(m.projectId);
    const summary = project
      ? `${project.identifier} · Meilenstein: ${m.bezeichnung}`
      : `Meilenstein: ${m.bezeichnung}`;
    const desc = [
      m.beschreibung ?? null,
      m.status === "verzoegert" && m.verzoegerungGrund
        ? `Verzögerung: ${m.verzoegerungGrund}`
        : null,
      project ? `Projekt: ${project.name}` : null,
    ]
      .filter(Boolean)
      .join("\\n");
    lines.push("BEGIN:VEVENT");
    lines.push(fold(`UID:meilenstein-${m.id}@lexbau`));
    lines.push(fold(`DTSTAMP:${stamp}`));
    lines.push(fold(`DTSTART;VALUE=DATE:${ymd(m.sollDatum)}`));
    lines.push(fold(`SUMMARY:${escapeIcs(summary)}`));
    if (desc) lines.push(fold(`DESCRIPTION:${escapeIcs(desc)}`));
    lines.push(fold(`CATEGORIES:Meilenstein,${m.status}`));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  const body = lines.join("\r\n") + "\r\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="lexbau-fristen.ics"',
      "Cache-Control": "private, no-store",
    },
  });
}
