"use server";

import { and, eq, like, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";

export type GlobalSearchHit = {
  kind:
    | "projekt"
    | "vorgang"
    | "vertrag"
    | "bautagebuch"
    | "frist"
    | "rechnung"
    | "gesetz"
    | "urteil";
  id: string;
  title: string;
  subtitle?: string;
  href: string;
};

export type GlobalSearchResult = {
  query: string;
  hits: GlobalSearchHit[];
  truncated: boolean;
};

const PER_KIND_LIMIT = 5;

/**
 * FTS-light: LIKE-basierte Suche über die wichtigsten Workspace-Entitäten plus
 * öffentliche Gesetze/Urteile. POC — Migration auf SQLite-FTS5 ist eine
 * spätere Optimierung (siehe REFACTOR_PROMPT.md G).
 */
export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  const q = query.trim();
  if (q.length < 2) return { query, hits: [], truncated: false };
  const pattern = `%${q}%`;
  const workspaceId = await getCurrentWorkspaceId();

  const [
    projects,
    vorgaenge,
    contracts,
    bautagebuch,
    fristen,
    rechnungen,
    legalChunks,
    cases,
  ] = await Promise.all([
    db
      .select({
        id: schema.projects.id,
        identifier: schema.projects.identifier,
        name: schema.projects.name,
      })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.workspaceId, workspaceId),
          or(
            like(schema.projects.name, pattern),
            like(schema.projects.identifier, pattern),
            like(schema.projects.ag, pattern)
          )
        )
      )
      .limit(PER_KIND_LIMIT),
    db
      .select({
        id: schema.vorgaenge.id,
        title: schema.vorgaenge.title,
        category: schema.vorgaenge.category,
      })
      .from(schema.vorgaenge)
      .where(
        and(
          eq(schema.vorgaenge.workspaceId, workspaceId),
          like(schema.vorgaenge.title, pattern)
        )
      )
      .limit(PER_KIND_LIMIT),
    db
      .select({
        id: schema.contracts.id,
        title: schema.contracts.title,
        kind: schema.contracts.kind,
      })
      .from(schema.contracts)
      .where(
        and(
          eq(schema.contracts.workspaceId, workspaceId),
          or(
            like(schema.contracts.title, pattern),
            like(schema.contracts.contractText, pattern)
          )
        )
      )
      .limit(PER_KIND_LIMIT),
    db
      .select({
        id: schema.bautagebuchEntries.id,
        text: schema.bautagebuchEntries.text,
        entryDate: schema.bautagebuchEntries.entryDate,
      })
      .from(schema.bautagebuchEntries)
      .where(
        and(
          eq(schema.bautagebuchEntries.workspaceId, workspaceId),
          like(schema.bautagebuchEntries.text, pattern)
        )
      )
      .limit(PER_KIND_LIMIT),
    db
      .select({
        id: schema.fristen.id,
        task: schema.fristen.task,
        deadline: schema.fristen.deadline,
      })
      .from(schema.fristen)
      .where(
        and(
          eq(schema.fristen.workspaceId, workspaceId),
          like(schema.fristen.task, pattern)
        )
      )
      .limit(PER_KIND_LIMIT),
    db
      .select({
        id: schema.rechnungen.id,
        supplierName: schema.rechnungen.supplierName,
        invoiceDate: schema.rechnungen.invoiceDate,
      })
      .from(schema.rechnungen)
      .where(
        and(
          eq(schema.rechnungen.workspaceId, workspaceId),
          like(schema.rechnungen.supplierName, pattern)
        )
      )
      .limit(PER_KIND_LIMIT),
    db
      .select({
        id: schema.legalChunks.id,
        source: schema.legalChunks.source,
        slug: schema.legalChunks.slug,
        ref: schema.legalChunks.ref,
        title: schema.legalChunks.title,
      })
      .from(schema.legalChunks)
      .where(
        or(
          like(schema.legalChunks.ref, pattern),
          like(schema.legalChunks.title, pattern),
          like(schema.legalChunks.summary, pattern),
          like(schema.legalChunks.content, pattern)
        )
      )
      .limit(PER_KIND_LIMIT),
    db
      .select({
        id: schema.caseDecisions.id,
        court: schema.caseDecisions.court,
        az: schema.caseDecisions.az,
        title: schema.caseDecisions.title,
      })
      .from(schema.caseDecisions)
      .where(
        or(
          like(schema.caseDecisions.az, pattern),
          like(schema.caseDecisions.title, pattern),
          like(schema.caseDecisions.ecli, pattern)
        )
      )
      .limit(PER_KIND_LIMIT),
  ]);

  const hits: GlobalSearchHit[] = [];

  for (const p of projects) {
    hits.push({
      kind: "projekt",
      id: p.id,
      title: p.name,
      subtitle: p.identifier,
      href: `/projekte/${p.id}`,
    });
  }
  for (const v of vorgaenge) {
    hits.push({
      kind: "vorgang",
      id: v.id,
      title: v.title,
      subtitle: v.category,
      href: `/vorgaenge/${v.id}`,
    });
  }
  for (const c of contracts) {
    hits.push({
      kind: "vertrag",
      id: c.id,
      title: c.title,
      subtitle: c.kind,
      href: `/vertrag`,
    });
  }
  for (const b of bautagebuch) {
    hits.push({
      kind: "bautagebuch",
      id: b.id,
      title: b.text.slice(0, 80),
      subtitle: b.entryDate,
      href: `/bautagebuch`,
    });
  }
  for (const f of fristen) {
    hits.push({
      kind: "frist",
      id: f.id,
      title: f.task,
      subtitle: f.deadline,
      href: `/fristen`,
    });
  }
  for (const r of rechnungen) {
    hits.push({
      kind: "rechnung",
      id: r.id,
      title: r.supplierName,
      subtitle: r.invoiceDate ?? undefined,
      href: `/rechnungen/${r.id}`,
    });
  }
  for (const c of legalChunks) {
    hits.push({
      kind: "gesetz",
      id: c.id,
      title: `${c.ref} · ${c.title}`,
      subtitle: c.source.toUpperCase(),
      href: `/gesetze/${c.source}#${c.slug}`,
    });
  }
  for (const u of cases) {
    hits.push({
      kind: "urteil",
      id: u.id,
      title: u.title,
      subtitle: `${u.court} · ${u.az}`,
      href: `/urteile?q=${encodeURIComponent(u.az)}`,
    });
  }

  return {
    query: q,
    hits,
    truncated:
      hits.length === 0
        ? false
        : projects.length === PER_KIND_LIMIT ||
          vorgaenge.length === PER_KIND_LIMIT ||
          contracts.length === PER_KIND_LIMIT ||
          bautagebuch.length === PER_KIND_LIMIT ||
          fristen.length === PER_KIND_LIMIT ||
          rechnungen.length === PER_KIND_LIMIT ||
          legalChunks.length === PER_KIND_LIMIT ||
          cases.length === PER_KIND_LIMIT,
  };
}
