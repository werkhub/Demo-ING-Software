/**
 * Queries auf workspace-übergreifende Inhalte: Gesetzes-Chunks und
 * BGH-/OLG-Entscheidungen. Diese Daten sind für alle Workspaces gleich.
 */
import "server-only";
import { and, asc, desc, eq, like, or } from "drizzle-orm";
import { db, schema } from "@/db";
import type { LegalSource } from "@/db/schema";

export async function getLegalSourceCounts() {
  const all = await db.select().from(schema.legalChunks);
  return {
    bgb: all.filter((c) => c.source === "bgb").length,
    hoai: all.filter((c) => c.source === "hoai").length,
    vob_a: all.filter((c) => c.source === "vob_a").length,
    vob_b: all.filter((c) => c.source === "vob_b").length,
    vob_c: all.filter((c) => c.source === "vob_c").length,
    total: all.length,
  };
}

export async function getLegalChunksBySource(source: LegalSource) {
  return db
    .select()
    .from(schema.legalChunks)
    .where(eq(schema.legalChunks.source, source))
    .orderBy(asc(schema.legalChunks.orderIdx));
}

export async function getLegalChunk(source: LegalSource, slug: string) {
  const [row] = await db
    .select()
    .from(schema.legalChunks)
    .where(
      and(eq(schema.legalChunks.source, source), eq(schema.legalChunks.slug, slug))
    )
    .limit(1);
  return row;
}

export async function searchLegal(query: string) {
  const q = query.trim();
  if (!q || q.length < 2) return [];
  const pattern = `%${q}%`;
  return db
    .select()
    .from(schema.legalChunks)
    .where(
      or(
        like(schema.legalChunks.ref, pattern),
        like(schema.legalChunks.title, pattern),
        like(schema.legalChunks.summary, pattern),
        like(schema.legalChunks.content, pattern)
      )
    )
    .orderBy(asc(schema.legalChunks.source), asc(schema.legalChunks.orderIdx))
    .limit(50);
}

/* ============== CASE DECISIONS ============== */

export async function getCaseDecisions(opts?: {
  court?: string;
  yearBucket?: "all" | "current" | "recent" | "older";
  search?: string;
  limit?: number;
}) {
  const conditions = [];
  if (opts?.court && opts.court !== "all") {
    if (opts.court === "BGH") {
      conditions.push(eq(schema.caseDecisions.courtKind, "BGH"));
    } else if (opts.court === "OLG") {
      conditions.push(eq(schema.caseDecisions.courtKind, "OLG"));
    }
  }

  if (opts?.search && opts.search.trim().length >= 2) {
    const p = `%${opts.search.trim()}%`;
    conditions.push(
      or(
        like(schema.caseDecisions.az, p),
        like(schema.caseDecisions.title, p),
        like(schema.caseDecisions.ecli, p),
        like(schema.caseDecisions.court, p)
      )!
    );
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(schema.caseDecisions)
    .where(where)
    .orderBy(desc(schema.caseDecisions.date))
    .limit(opts?.limit ?? 200);

  if (!opts?.yearBucket || opts.yearBucket === "all") return rows;

  const thisYear = new Date().getFullYear();
  return rows.filter((r) => {
    const y = parseInt(r.date.slice(0, 4), 10);
    if (opts.yearBucket === "current") return y === thisYear;
    if (opts.yearBucket === "recent") return y >= thisYear - 5 && y < thisYear;
    if (opts.yearBucket === "older") return y < thisYear - 5;
    return true;
  });
}

export async function getCaseDecisionById(id: string) {
  const [row] = await db
    .select()
    .from(schema.caseDecisions)
    .where(eq(schema.caseDecisions.id, id))
    .limit(1);
  return row;
}

export async function getCaseStats() {
  const all = await db
    .select({
      court: schema.caseDecisions.courtKind,
      senate: schema.caseDecisions.senate,
      date: schema.caseDecisions.date,
    })
    .from(schema.caseDecisions);

  const courts = new Map<string, number>();
  const senates = new Map<string, number>();
  let mostRecent: string | null = null;

  for (const r of all) {
    courts.set(r.court, (courts.get(r.court) ?? 0) + 1);
    if (r.senate) senates.set(r.senate, (senates.get(r.senate) ?? 0) + 1);
    if (!mostRecent || r.date > mostRecent) mostRecent = r.date;
  }

  return {
    total: all.length,
    courts: Object.fromEntries(courts),
    senates: Object.fromEntries(senates),
    mostRecent,
  };
}
