import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { HinschgStatusBadge } from "@/components/hinschg-status-badge";
import { getCurrentWorkspace } from "@/lib/session";
import { getMeldungen, getMeldungenStats } from "@/db/queries";
import {
  CATEGORY_LABEL,
  uiState,
} from "@/lib/hinschg";
import { formatDateShort, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HinschgListPage() {
  const workspace = await getCurrentWorkspace();
  const enabled = workspace.hinschgEnabled;
  const [meldungen, stats, t, locale] = await Promise.all([
    enabled ? getMeldungen() : Promise.resolve([]),
    enabled
      ? getMeldungenStats()
      : Promise.resolve({
          total: 0,
          neu: 0,
          inPruefung: 0,
          abgeschlossen: 0,
          ackUeberfaellig: 0,
          antwortUeberfaellig: 0,
        }),
    getTranslations("modules.hinschg"),
    getLocale(),
  ]);

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

      {!enabled ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg)]">
              {t("notEnabled")}
            </p>
            <p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">
              {t("notEnabledHint")}
            </p>
            <Link
              href="/workspace#hinschg"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              {t("goToSettings")}
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
            <StatGrid4>
              <StatCard label={t("statsLabels.total")} value={stats.total} />
              <StatCard
                label={t("statsLabels.newWaiting")}
                value={stats.neu}
                tone={stats.neu > 0 ? "warning" : "default"}
              />
              <StatCard label={t("statsLabels.inReview")} value={stats.inPruefung} />
              <StatCard
                label={t("statsLabels.deadlineMissed")}
                value={stats.ackUeberfaellig + stats.antwortUeberfaellig}
                tone={
                  stats.ackUeberfaellig + stats.antwortUeberfaellig > 0
                    ? "critical"
                    : "default"
                }
              />
            </StatGrid4>
          </section>

          <section className="pb-8">
            <div className="border border-[color:var(--color-accent-border,var(--color-border))] bg-[color:var(--color-accent-soft)] rounded-md p-4 flex items-start gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                  {t("publicUrl")}
                </p>
                <p className="mt-1 text-sm text-[color:var(--color-fg)] font-mono break-all">
                  /hinweis?ws={workspace.id}
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                  {t("publicUrlHint")}
                </p>
              </div>
              <Link
                href={`/hinweis?ws=${workspace.id}`}
                target="_blank"
                className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] transition-colors whitespace-nowrap"
              >
                {t("openUrl")}
              </Link>
            </div>
          </section>

          {meldungen.length === 0 ? (
            <section className="pb-16">
              <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
                <p className="text-sm text-[color:var(--color-fg-muted)]">
                  {t("emptyReceived")}
                </p>
              </div>
            </section>
          ) : (
            <section className="pb-16">
              <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {meldungen.map((m) => {
                  const state = uiState(m);
                  return (
                    <li key={m.id} className="py-5">
                      <Link
                        href={`/hinschg/${m.id}`}
                        className="block group"
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-base font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                                {m.subject}
                              </p>
                              <HinschgStatusBadge state={state} />
                              {m.isAnonymous ? (
                                <span className="font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]">
                                  {t("anonymousLabel")}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                              <span className="font-mono">
                                {CATEGORY_LABEL[m.category]}
                              </span>
                              {" · "}
                              {t("submittedAgo", { ago: timeAgo(m.submittedAt, locale) })}
                              {" · "}
                              {t("responseDeadlineLabel", { date: formatDateShort(m.responseDeadline, locale) })}
                              {m.reporterDisplayName
                                ? ` · "${m.reporterDisplayName}"`
                                : ""}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </Container>
  );
}
