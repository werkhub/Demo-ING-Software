import { getLocale, getTranslations } from "next-intl/server";
import {
  getCockpitStats,
  getFristen,
  getProjektRiskMatrix,
  getVorgaenge,
} from "@/db/queries";
import { getCurrentWorkspace, requireUser } from "@/lib/session";
import {
  firstName,
  formatDateLong,
  greetingKeyForHour,
} from "@/lib/utils";
import { Container } from "@/components/container";
import { Link } from "@/i18n/navigation";
import { ROLE_META } from "@/lib/roles";
import { buildQuickAccess } from "@/lib/quick-access";
import { KpiTiles } from "./KpiTiles";
import { ProjekteRiskHeatmap } from "./ProjekteRiskHeatmap";
import { AnstehendeFristen } from "./AnstehendeFristen";
import { VorgangsBoard } from "./VorgangsBoard";

export async function DashboardView() {
  const [
    user,
    workspace,
    fristen,
    cockpit,
    riskMatrix,
    vorgaenge,
    locale,
    t,
  ] = await Promise.all([
    requireUser(),
    getCurrentWorkspace(),
    getFristen(),
    getCockpitStats(),
    getProjektRiskMatrix(),
    getVorgaenge({ limit: 50 }),
    getLocale(),
    getTranslations("modules.dashboard"),
  ]);

  const now = new Date();
  const greetingKey = greetingKeyForHour(now.getHours());
  const dateLabel = formatDateLong(now, locale);
  const userFirstName = firstName(user.name);
  const role = workspace.workspaceRole;
  const roleMeta = ROLE_META[role];
  // Demo-Slim: Quick-Access auf 4 Tiles begrenzt — Dopplung zur Sidebar minimieren.
  const quickAccess = buildQuickAccess(role).slice(0, 4);
  const allClear = cockpit.fristenKritisch === 0 && cockpit.offeneVorgaenge === 0;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] flex items-center gap-2 flex-wrap">
          <span>{dateLabel}</span>
          <span aria-hidden>·</span>
          <span
            className="border border-[color:var(--color-accent-border,var(--color-border))] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] rounded-sm px-1.5 py-0.5"
            title={roleMeta.tagline}
          >
            {roleMeta.shortLabel} · {roleMeta.label}
          </span>
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {t(`greeting.${greetingKey}`)}
          {userFirstName ? `, ${userFirstName}` : ""}.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)] leading-relaxed">
          {allClear ? (
            t("summary.allClear")
          ) : (
            <>
              {t("summary.prefix")}{" "}
              <span className="text-[color:var(--color-critical)] font-medium">
                {t("summary.criticalDeadlines", {
                  count: cockpit.fristenKritisch,
                })}
              </span>{" "}
              {t("summary.middleAnd")}{" "}
              {t("summary.openCases", { count: cockpit.offeneVorgaenge })}
              {cockpit.highRiskVorgaenge > 0 ? (
                <>
                  {" "}
                  <span className="text-[color:var(--color-warning)] font-medium">
                    {t("summary.highRiskTail", {
                      n: cockpit.highRiskVorgaenge,
                    })}
                  </span>
                </>
              ) : null}
              .
            </>
          )}
        </p>
        <div className="mt-7 flex flex-wrap items-center gap-3">
          <Link
            href="/vorgaenge/new"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            {t("cta.newCase")} <span aria-hidden>→</span>
          </Link>
          <Link
            href="/vorgaenge"
            className="inline-flex items-center gap-1 px-2 py-2 text-sm text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            {t("cta.viewCases")} →
          </Link>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-10 pb-10">
        <KpiTiles
          aktiveProjekte={cockpit.aktiveProjekte}
          offeneVorgaenge={cockpit.offeneVorgaenge}
          fristenKritisch={cockpit.fristenKritisch}
          highRiskVorgaenge={cockpit.highRiskVorgaenge}
        />
      </section>

      <section className="pb-12">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-xl font-semibold tracking-tight">{t("sections.vorgaengeByStatus")}</h2>
          <Link
            href="/vorgaenge"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            {t("cta.viewAll")} →
          </Link>
        </div>
        <VorgangsBoard vorgaenge={vorgaenge} />
      </section>

      <section className="pb-12 grid gap-10 md:grid-cols-3">
        <div className="md:col-span-2">
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight">{t("sections.projektRiskHeatmap")}</h2>
            <Link
              href="/projekte"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
            >
              {t("cta.viewProjects")} →
            </Link>
          </div>
          <ProjekteRiskHeatmap rows={riskMatrix} />
        </div>
        <div>
          <div className="flex items-baseline justify-between mb-4">
            <h2 className="text-xl font-semibold tracking-tight">{t("sections.upcomingDeadlines")}</h2>
            <Link
              href="/fristen"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
            >
              {t("cta.viewDeadlines")} →
            </Link>
          </div>
          <AnstehendeFristen rows={fristen} windowDays={30} />
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-10 pb-16">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-xl font-semibold tracking-tight">{t("sections.quickAccess")}</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            {t("labels.frequentActions")} · {roleMeta.shortLabel}
          </span>
        </div>
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-4">
          {quickAccess.map((qa) => (
            <Link
              key={qa.id}
              href={qa.href}
              className="bg-[color:var(--color-bg)] p-6 group hover:bg-[color:var(--color-bg-subtle)] transition-colors"
            >
              <p className="text-sm font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors flex items-center gap-1">
                {qa.title} <span aria-hidden className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
              </p>
              <p className="mt-1.5 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                {qa.desc}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </Container>
  );
}
