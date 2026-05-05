import { getLocale, getTranslations } from "next-intl/server";
import { getAllFristen, getProjects } from "@/db/queries";
import { formatDateShort, urgencyClasses, urgencyLabel } from "@/lib/utils";
import { Container } from "@/components/container";
import { StatCard, StatGrid } from "@/components/stat-card";
import { RdgBanner } from "@/components/rdg-banner";
import { FRIST_DISCLAIMER } from "@/lib/legal/rdg";
import { deleteFrist, toggleFristCompleted } from "./actions";
import { NewFristForm } from "./new-frist-form";

export const dynamic = "force-dynamic";

export default async function Fristen() {
  const [allFristen, projects, t, locale] = await Promise.all([
    getAllFristen(),
    getProjects(),
    getTranslations("modules.fristen"),
    getLocale(),
  ]);
  const open = allFristen.filter((f) => !f.completed);
  const done = allFristen.filter((f) => f.completed);
  const critical = open.filter((f) => f.daysRemaining <= 1).length;
  const thisWeek = open.filter((f) => f.daysRemaining > 1 && f.daysRemaining <= 7).length;
  const next30 = open.length;

  function projectLabel(projectId: string | null): string {
    if (!projectId) return t("projectFallback.none");
    const p = projects.find((p) => p.id === projectId);
    return p ? `${p.identifier} · ${p.name}` : t("projectFallback.unknown");
  }

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <div className="mt-4 flex items-end justify-between gap-4 flex-wrap">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter">
            {t("title")}
          </h1>
          <a
            href="/fristen/calendar.ics"
            download="lexbau-fristen.ics"
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] px-4 py-2 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
            title={t("icalTitle")}
          >
            ↓ {t("actions.exportIcal")}
          </a>
        </div>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("intro")}
        </p>
        <p className="mt-3 text-[12px] italic text-[color:var(--color-fg-muted)] max-w-2xl">
          {FRIST_DISCLAIMER}
        </p>
        <div className="mt-6">
          <RdgBanner />
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-10">
        <StatGrid>
          <StatCard label={t("groups.todayTomorrow")} value={critical} tone="critical" />
          <StatCard label={t("groups.thisWeek")} value={thisWeek} tone="warning" />
          <StatCard label={t("groups.totalOpen")} value={next30} />
        </StatGrid>
      </section>

      <section className="pb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
          {t("newSection")}
        </p>
        <NewFristForm
          projects={projects.map((p) => ({
            id: p.id,
            identifier: p.identifier,
            name: p.name,
          }))}
        />
      </section>

      <section className="pb-10">
        {open.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] py-12 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
            {t("empty")}
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {open.map((f) => (
              <li key={f.id} className="py-5 flex items-center gap-6 flex-wrap">
                <div className="text-center shrink-0 w-24">
                  <div
                    className={`font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 inline-block ${urgencyClasses(f.urgency)}`}
                  >
                    {urgencyLabel(f.daysRemaining)}
                  </div>
                  <p className="mt-1.5 text-xs text-[color:var(--color-fg-muted)] font-mono">
                    {formatDateShort(f.deadline, locale)}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[color:var(--color-fg)]">{f.task}</p>
                  <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                    {projectLabel(f.projectId)}
                    {f.legalBasis ? (
                      <>
                        {" · "}
                        <span className="font-mono">{f.legalBasis}</span>
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={toggleFristCompleted}>
                    <input type="hidden" name="id" value={f.id} />
                    <button
                      type="submit"
                      className="rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white text-xs px-4 py-1.5 transition-colors"
                    >
                      {t("actions.complete")}
                    </button>
                  </form>
                  <form action={deleteFrist}>
                    <input type="hidden" name="id" value={f.id} />
                    <button
                      type="submit"
                      aria-label={t("actions.deleteAria")}
                      className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] px-2 py-1.5 transition-colors"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {done.length > 0 && (
        <section className="pb-16 border-t border-[color:var(--color-border)] pt-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-5">
            {t("groups.doneCount", { count: done.length })}
          </p>
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {done.map((f) => (
              <li key={f.id} className="py-4 flex items-center gap-6 flex-wrap">
                <div className="text-center shrink-0 w-24">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-success)]">
                    {t("actions.doneShort")}
                  </span>
                  <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] font-mono">
                    {formatDateShort(f.deadline, locale)}
                  </p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[color:var(--color-fg-muted)] line-through">
                    {f.task}
                  </p>
                  <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                    {projectLabel(f.projectId)}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <form action={toggleFristCompleted}>
                    <input type="hidden" name="id" value={f.id} />
                    <button
                      type="submit"
                      className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-3 py-1.5 transition-colors"
                    >
                      ↺ {t("actions.reopen")}
                    </button>
                  </form>
                  <form action={deleteFrist}>
                    <input type="hidden" name="id" value={f.id} />
                    <button
                      type="submit"
                      aria-label={t("actions.deleteAria")}
                      className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] px-2 py-1.5 transition-colors"
                    >
                      ✕
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Container>
  );
}
