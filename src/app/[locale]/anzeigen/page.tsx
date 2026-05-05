import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { AnzeigeStatusBadge } from "@/components/anzeige-status-badge";
import {
  getAnzeigen,
  getAnzeigenStats,
  getProjects,
} from "@/db/queries";
import {
  ANZEIGE_KIND_LABEL,
  ANZEIGE_KIND_SHORT,
  ANZEIGE_LEGAL_BASIS,
  uiState,
} from "@/lib/anzeigen";
import { formatDateShort, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AnzeigenPage() {
  const [anzeigen, stats, projects, t, locale] = await Promise.all([
    getAnzeigen(),
    getAnzeigenStats(),
    getProjects(),
    getTranslations("modules.anzeigen"),
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

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <StatGrid4>
          <StatCard label={t("stats.total")} value={stats.total} />
          <StatCard
            label={t("stats.drafts")}
            value={stats.entwurf}
            tone={stats.entwurf > 0 ? "warning" : "default"}
          />
          <StatCard label={t("stats.sentWaiting")} value={stats.versendet} />
          <StatCard
            label={t("stats.ackOverdue")}
            value={stats.zugangUeberfaellig}
            tone={stats.zugangUeberfaellig > 0 ? "critical" : "default"}
          />
        </StatGrid4>
      </section>

      <section className="pb-8 flex justify-end">
        {projects.length > 0 ? (
          <Link
            href="/anzeigen/new"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + {t("newNotice")}
          </Link>
        ) : null}
      </section>

      {projects.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {t("emptyNoProjects")}
            </p>
          </div>
        </section>
      ) : anzeigen.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {t("empty")}
            </p>
            <p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">
              {t("emptyHint")}
            </p>
          </div>
        </section>
      ) : (
        <section className="pb-16">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {anzeigen.map((a) => {
              const project = projects.find((p) => p.id === a.projectId);
              const state = uiState(a);
              return (
                <li key={a.id} className="py-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/anzeigen/${a.id}`}
                          className="text-base font-medium text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors"
                        >
                          {a.title}
                        </Link>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg)] border-[color:var(--color-border)]">
                          {ANZEIGE_KIND_SHORT[a.kind]}
                        </span>
                        <AnzeigeStatusBadge state={state} />
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        <span className="font-mono">
                          {ANZEIGE_LEGAL_BASIS[a.kind]}
                        </span>
                        {project
                          ? ` · ${project.identifier} · ${project.name}`
                          : ""}
                        {a.sentAt
                          ? ` · ${t("sentOn", { date: formatDateShort(a.sentAt, locale) })}`
                          : ""}
                        {a.acknowledgedAt
                          ? ` · ${t("acknowledgedOn", { date: formatDateShort(a.acknowledgedAt, locale) })}`
                          : ""}
                      </p>
                      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] line-clamp-2">
                        {a.subjectMatter}
                      </p>
                    </div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] shrink-0">
                      {timeAgo(a.createdAt, locale)}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)] mb-3">
          {t("legalNoticesHeading")}
        </p>
        <ul className="space-y-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
          <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
            <strong>{ANZEIGE_KIND_LABEL.behinderung}</strong> ist UNVERZÜGLICH
            und SCHRIFTLICH dem AG mitzuteilen — versäumt der AN die Anzeige,
            entfallen Ansprüche auf Bauzeitverlängerung und Schadensersatz nach
            § 6 Abs. 6 VOB/B.
          </li>
          <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
            <strong>{ANZEIGE_KIND_LABEL.bedenken}</strong> entlastet den AN von
            der Mängelhaftung, soweit der AG dennoch auf der Ausführung
            besteht. Ohne Anzeige haftet der AN für vermeidbare Mängel.
          </li>
          <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
            Beweissicherung: Anzeige stets per Einschreiben oder per E-Mail mit
            Lesebestätigung versenden — Zugangsnachweis ist im Streit
            entscheidend.
          </li>
        </ul>
      </section>
    </Container>
  );
}
