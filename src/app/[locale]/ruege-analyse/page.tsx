import { getTranslations } from "next-intl/server";
import { Container } from "@/components/container";
import { RdgBanner } from "@/components/rdg-banner";
import { getProjects } from "@/db/queries";
import { RuegeAnalyseClient } from "./ruege-analyse-client";

export const dynamic = "force-dynamic";

export default async function RuegeAnalyse() {
  const [projects, t] = await Promise.all([
    getProjects(),
    getTranslations("modules.ruegeAnalyse"),
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
        <div className="mt-6">
          <RdgBanner />
        </div>
      </section>

      <RuegeAnalyseClient
        projects={projects.map((p) => ({
          id: p.id,
          identifier: p.identifier,
          name: p.name,
        }))}
      />

      <section className="pb-16">
        <div className="border-l-2 border-[color:var(--color-warning)] pl-5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
            {t("statusKicker")}
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
            {t("statusBody")}
          </p>
        </div>
      </section>
    </Container>
  );
}
