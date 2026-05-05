import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { StatCard, StatGrid } from "@/components/stat-card";
import { getCaseDecisions, getCaseStats } from "@/db/queries";
import { CasesFilterBar } from "./filter-bar";
import { formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function UrteilePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; court?: string; year?: string }>;
}) {
  const sp = await searchParams;
  const [stats, cases, t, locale] = await Promise.all([
    getCaseStats(),
    getCaseDecisions({
      court: sp.court ?? "all",
      yearBucket:
        (sp.year as "all" | "current" | "recent" | "older" | undefined) ?? "all",
      search: sp.q ?? "",
    }),
    getTranslations("modules.urteile"),
    getLocale(),
  ]);

  const filterActive = !!(sp.q || sp.court || sp.year);
  const senateCounts = Object.entries(stats.senates).sort((a, b) => b[1] - a[1]);

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <div className="mt-4 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter">
              {t("title")}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
              {t("intro", { total: stats.total })}
              {stats.mostRecent ? (
                <>
                  {t("lastUpdate")}
                  <strong>{formatDateShort(stats.mostRecent, locale)}</strong>
                </>
              ) : null}
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <StatGrid>
          <StatCard
            label={t("stats.total")}
            value={stats.total}
            tone="accent"
          />
          <StatCard
            label={t("stats.viiZr")}
            caption={t("stats.viiZrCaption")}
            value={stats.senates["VII ZR"] ?? 0}
            tone="accent"
          />
          <StatCard
            label={t("stats.vZr")}
            caption={t("stats.vZrCaption")}
            value={stats.senates["V ZR"] ?? 0}
            tone="accent"
          />
        </StatGrid>
      </section>

      <section className="pb-6">
        <CasesFilterBar />
        {filterActive ? (
          <p className="mt-3 text-xs text-[color:var(--color-fg-muted)]">
            {t("filterMatches", { count: cases.length })}
          </p>
        ) : null}
      </section>

      <section className="pb-16">
        {cases.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-16 text-center">
            <h2 className="text-xl font-semibold tracking-tight">{t("noMatches")}</h2>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              {filterActive ? t("noMatchesAdjust") : t("noMatchesFill")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {cases.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/urteile/${c.id}`}
                  className="block py-5 group grid gap-3 md:grid-cols-12 hover:bg-[color:var(--color-bg-subtle)] -mx-2 px-2 rounded-md transition-colors"
                >
                  <div className="md:col-span-3">
                    <div className="font-mono text-xs font-medium text-[color:var(--color-accent)] uppercase tracking-[0.12em]">
                      {c.az}
                    </div>
                    <div className="mt-1 font-mono text-xs text-[color:var(--color-fg-muted)]">
                      {formatDateShort(c.date, locale)}
                    </div>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                        {c.court}
                      </span>
                      {c.decisionType ? (
                        <>
                          <span className="text-[color:var(--color-border)]">·</span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                            {c.decisionType}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="md:col-span-9">
                    <h3 className="text-base font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] tracking-tight transition-colors leading-snug">
                      {c.title}
                    </h3>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] truncate">
                      {c.ecli}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {senateCounts.length > 0 ? (
        <section className="pb-16 border-t border-[color:var(--color-border)] pt-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            {t("senateDistribution")}
          </p>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {senateCounts.map(([senate, count]) => (
              <li
                key={senate}
                className="flex items-baseline justify-between gap-3 border-b border-[color:var(--color-border)] pb-2"
              >
                <span className="font-mono text-xs text-[color:var(--color-fg)]">
                  {senate}
                </span>
                <span className="text-sm text-[color:var(--color-fg-muted)]">
                  {count}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="pb-16 border-t border-[color:var(--color-border)] pt-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
          {t("sourceKicker")}
        </p>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
          {t("sourceBody")}
          <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)]">
            npm run db:fetch-cases
          </code>
          {t("sourceBody2")}
        </p>
        <p className="mt-3 text-[11px] italic text-[color:var(--color-fg-muted)]">
          {t("rdgFooter")}
        </p>
      </section>
    </Container>
  );
}
