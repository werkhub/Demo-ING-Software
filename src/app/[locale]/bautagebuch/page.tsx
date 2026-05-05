import { getTranslations } from "next-intl/server";
import { Container } from "@/components/container";
import { getBautagebuchEntries, getBautagebuchStats, getProjects } from "@/db/queries";
import { StatCard, StatGrid } from "@/components/stat-card";
import { EntriesList } from "./entries-list";
import { NewEntryForm } from "./new-entry-form";

export const dynamic = "force-dynamic";

export default async function Bautagebuch() {
  const [entries, stats, projects, t] = await Promise.all([
    getBautagebuchEntries(),
    getBautagebuchStats(),
    getProjects(),
    getTranslations("modules.bautagebuch"),
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

      <section className="border-t border-[color:var(--color-border)] pt-10 pb-10">
        <StatGrid>
          <StatCard label={t("stats.total")} value={stats.total} />
          <StatCard label={t("stats.withTrigger")} value={stats.withTrigger} tone="accent" />
          <StatCard label={t("stats.critical")} value={stats.critical} tone="critical" />
        </StatGrid>
      </section>

      <section className="pb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          {t("newEntrySection")}
        </p>
        <NewEntryForm
          projects={projects.map((p) => ({
            id: p.id,
            identifier: p.identifier,
            name: p.name,
          }))}
        />
      </section>

      <EntriesList
        entries={entries.map((e) => ({
          id: e.id,
          authorName: e.authorName,
          text: e.text,
          category: e.category,
          entryDate: e.entryDate,
          weatherCondition: e.weatherCondition,
          temperatureCelsius: e.temperatureCelsius,
          staffHoursOwn: e.staffHoursOwn,
          staffHoursSubcontractors: e.staffHoursSubcontractors,
          equipment: e.equipment,
          attachmentRefs: e.attachmentRefs,
          trigger: e.trigger,
          triggerLabel: e.triggerLabel,
          urgency: e.urgency,
          suggestion: e.suggestion,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt,
          projectId: e.projectId,
        }))}
        projects={projects.map((p) => ({
          id: p.id,
          identifier: p.identifier,
          name: p.name,
        }))}
      />
    </Container>
  );
}
