import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { VorgangListTable } from "@/components/vorgang/VorgangListTable";
import { VorgaengeFilterBar } from "./vorgaenge-filter-bar";
import { getProjects, getVorgaenge, getVorgangStats } from "@/db/queries";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentWorkspaceId } from "@/lib/session";

export async function generateMetadata() {
  const t = await getTranslations("modules.vorgaenge");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

function asString(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

export default async function VorgaengeListPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const projectId = asString(sp.projectId);
  const status = asString(sp.status);
  const category = asString(sp.category);
  const q = asString(sp.q)?.trim().toLowerCase() ?? "";
  const risk = asString(sp.risk);

  const [vorgaengeAll, projects, stats, workspaceUsers, t] = await Promise.all([
    getVorgaenge({ projectId, status, category, limit: 500 }),
    getProjects(),
    getVorgangStats(),
    (async () => {
      const wsId = await getCurrentWorkspaceId();
      return db
        .select({ id: schema.users.id, name: schema.users.name })
        .from(schema.users)
        .where(eq(schema.users.workspaceId, wsId));
    })(),
    getTranslations("modules.vorgaenge"),
  ]);

  let rows = vorgaengeAll;
  if (q) rows = rows.filter((v) => v.title.toLowerCase().includes(q));
  if (risk === "high") rows = rows.filter((v) => v.riskScore >= 60);

  return (
    <Container>
      <section className="pt-14 pb-8">
        <div className="flex items-start justify-between gap-6 flex-wrap mb-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
              {t("kicker", { count: stats.total })}
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
              {t("headline")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-fg-muted)]">
              {t("summary", { open: stats.open, highRisk: stats.highRisk })}
            </p>
          </div>
          <Link
            href="/vorgaenge/new"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            {t("newCaseCta")} <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      <section className="pb-12">
        <VorgaengeFilterBar
          projects={projects.map((p) => ({
            id: p.id,
            identifier: p.identifier,
            name: p.name,
          }))}
        />
        <VorgangListTable
          rows={rows}
          projects={projects.map((p) => ({
            id: p.id,
            identifier: p.identifier,
            name: p.name,
          }))}
          users={workspaceUsers}
        />
      </section>
    </Container>
  );
}
