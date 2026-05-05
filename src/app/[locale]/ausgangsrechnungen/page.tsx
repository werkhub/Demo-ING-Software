import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import {
  ArKindBadge,
  ArStatusBadge,
} from "@/components/ar-status-badge";
import {
  getArStats,
  getAusgangsrechnungen,
  getProjects,
} from "@/db/queries";
import { fmtMoney, formatDateShort, timeAgo } from "@/lib/utils";
import { verzugsTage } from "@/lib/mahnung";

export const dynamic = "force-dynamic";

export default async function AusgangsrechnungenTopList() {
  const [rechnungen, stats, projects, t, locale] = await Promise.all([
    getAusgangsrechnungen(),
    getArStats(),
    getProjects(),
    getTranslations("modules.ausgangsrechnungen"),
    getLocale(),
  ]);

  const dtfLocale = locale === "en" ? "en-IE" : "de-DE";

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("intro")}
        </p>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <StatGrid4>
          <StatCard label={t("statsTotal")} value={stats.total} />
          <StatCard
            label={t("statsDrafts")}
            value={stats.entwuerfe}
            tone={stats.entwuerfe > 0 ? "warning" : "default"}
          />
          <StatCard
            label={t("statsOpen")}
            value={fmtMoney(stats.totalOffenGross, locale)}
            caption={t("statsOpenCaption", { n: stats.offen })}
            tone={stats.offen > 0 ? "warning" : "default"}
          />
          <StatCard
            label={t("statsReminders")}
            value={stats.mahnung}
            tone={stats.mahnung > 0 ? "critical" : "default"}
          />
        </StatGrid4>
      </section>

      {rechnungen.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {t("emptyTitle")}
            </p>
            <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] max-w-md mx-auto">
              {t("emptyHint")}
            </p>
            {projects.length > 0 ? (
              <Link
                href={`/projekte/${projects[0].id}/ausgangsrechnungen/new`}
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                {t("createFirst", { identifier: projects[0].identifier })}
              </Link>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="pb-16">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {rechnungen.map((r) => {
              const project = projects.find((p) => p.id === r.projectId);
              const offenGross = (r.payoutGross ?? 0) - (r.paidAmount ?? 0);
              const tage = verzugsTage(r);
              const isOverdue = tage > 0 && r.status !== "bezahlt" && r.status !== "entwurf";
              return (
                <li key={r.id} className="py-5">
                  <Link
                    href={`/projekte/${r.projectId}/ausgangsrechnungen/${r.id}`}
                    className="block group"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-sm text-[color:var(--color-fg)]">
                            {r.number}
                          </p>
                          <ArKindBadge
                            kind={r.kind}
                            abschlagNo={r.abschlagNo}
                          />
                          <ArStatusBadge status={r.status} />
                          {r.xrechnungGeneratedAt ? (
                            <span
                              title={`XRechnung ${r.xrechnungGeneratedAt.toLocaleDateString(dtfLocale)}`}
                              className="inline-flex rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                            >
                              XRechnung
                            </span>
                          ) : null}
                          {r.zugferdGeneratedAt ? (
                            <span
                              title={`ZUGFeRD ${r.zugferdGeneratedAt.toLocaleDateString(dtfLocale)}`}
                              className="inline-flex rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                            >
                              ZUGFeRD
                            </span>
                          ) : null}
                          {r.reverseCharge ? (
                            <span
                              title="Reverse charge per § 13b UStG"
                              className="inline-flex rounded-full border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider"
                            >
                              §13b
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-base font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                          {r.subjectLine ?? t("noSubject")}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                          {project
                            ? `${project.identifier} · ${project.name}`
                            : t("projectRemoved")}
                          {" · "}
                          {formatDateShort(r.invoiceDate, locale)}
                          {r.dueDate
                            ? ` · ${t("due", { date: formatDateShort(r.dueDate, locale) })}`
                            : ""}
                          {r.sentAt
                            ? ` · ${t("sentAgo", { ago: timeAgo(r.sentAt, locale) })}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-mono font-medium">
                          {fmtMoney(r.payoutGross, locale)}
                        </p>
                        {offenGross > 0 && r.status !== "entwurf" ? (
                          <p className="font-mono text-[10px] text-[color:var(--color-warning)]">
                            {t("openLabel", { amount: fmtMoney(offenGross, locale) })}
                            {isOverdue ? (
                              <span className="block text-[color:var(--color-critical)]">
                                {t("overdueDays", { days: tage })}
                              </span>
                            ) : null}
                          </p>
                        ) : r.status === "bezahlt" ? (
                          <p className="font-mono text-[10px] text-[color:var(--color-success)]">
                            {t("paidLabel")}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Container>
  );
}
