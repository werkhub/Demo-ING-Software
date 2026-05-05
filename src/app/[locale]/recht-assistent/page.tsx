import { getTranslations } from "next-intl/server";
import { Container } from "@/components/container";
import { getAllQueries, getProjects } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import { RdgBanner } from "@/components/rdg-banner";
import { ROLE_META } from "@/lib/roles";
import { AssistantClient } from "./assistant-client";

export const dynamic = "force-dynamic";

export default async function RechtAssistent() {
  const [history, workspace, projects, t] = await Promise.all([
    getAllQueries(),
    getCurrentWorkspace(),
    getProjects(),
    getTranslations("modules.rechtAssistent"),
  ]);

  const roleMeta = ROLE_META[workspace.workspaceRole];

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <div className="mt-4 flex items-baseline gap-3 flex-wrap">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter">
            {t("title")}
          </h1>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] rounded-sm px-1.5 py-0.5">
            {t("demoBadge")}
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("intro")}
        </p>

        <div className="mt-6 border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] rounded-md p-4 max-w-2xl">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            {t("perspectiveLabel", { short: roleMeta.shortLabel, label: roleMeta.label })}
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg)] leading-relaxed">
            {roleMeta.assistantPerspective}
          </p>
          <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)]">
            {t("switchRoleHintBefore")}
            <a
              href="/workspace#rolle"
              className="underline hover:text-[color:var(--color-accent)] transition-colors"
            >
              {t("switchRoleLink")}
            </a>
            {t("switchRoleHintAfter")}
          </p>
        </div>

        <div className="mt-6">
          <RdgBanner />
        </div>
      </section>

      <AssistantClient
        history={history.map((h) => ({
          id: h.id,
          question: h.question,
          category: h.category,
          response: h.response,
          createdAt: h.createdAt,
        }))}
        vobPreferred={workspace.vobPreferredExternalProvider}
        projects={projects.map((p) => ({
          id: p.id,
          identifier: p.identifier,
          name: p.name,
        }))}
      />

      <section className="pb-16">
        <div className="border-l-2 border-[color:var(--color-warning)] pl-5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
            {t("noticeKicker")}
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
            {t("noticeBody")}
          </p>
        </div>
      </section>
    </Container>
  );
}
