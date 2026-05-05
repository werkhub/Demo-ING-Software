import { getLocale, getTranslations } from "next-intl/server";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { StatCard, StatGrid } from "@/components/stat-card";
import { RdgBanner } from "@/components/rdg-banner";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getProjects } from "@/db/queries";
import { formatDateShort, timeAgo } from "@/lib/utils";
import type { Finding } from "@/lib/contract-risk-scan";
import { ContractForm } from "./contract-form";
import {
  createVorgangFromContract,
  deleteContract,
  rescanContract,
} from "./actions";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  hauptvertrag: "Hauptvertrag",
  nachtragsvertrag: "Nachtragsvertrag",
  buergschaft: "Bürgschaft",
  vereinbarung: "Vereinbarung",
};

const LEVEL_TONE: Record<string, string> = {
  high: "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]",
  medium:
    "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  info: "border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)]",
};

function parseFindings(json: string | null): Finding[] {
  if (!json) return [];
  try {
    return JSON.parse(json) as Finding[];
  } catch {
    return [];
  }
}

export default async function VertragPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const [projects, contracts, t, locale] = await Promise.all([
    getProjects(),
    db
      .select()
      .from(schema.contracts)
      .where(eq(schema.contracts.workspaceId, workspaceId))
      .orderBy(desc(schema.contracts.updatedAt)),
    getTranslations("modules.vertrag"),
    getLocale(),
  ]);

  const totalHigh = contracts.reduce(
    (s, c) => s + parseFindings(c.riskFindings).filter((f) => f.level === "high").length,
    0
  );
  const totalMedium = contracts.reduce(
    (s, c) =>
      s + parseFindings(c.riskFindings).filter((f) => f.level === "medium").length,
    0
  );

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

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <StatGrid>
          <StatCard label={t("stats.contracts")} value={contracts.length} />
          <StatCard
            label={t("stats.high")}
            value={totalHigh}
            tone={totalHigh > 0 ? "critical" : "default"}
          />
          <StatCard
            label={t("stats.medium")}
            value={totalMedium}
            tone={totalMedium > 0 ? "warning" : "default"}
          />
        </StatGrid>
      </section>

      {projects.length > 0 ? (
        <section className="pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
            {t("newSection")}
          </p>
          <ContractForm
            projects={projects.map((p) => ({
              id: p.id,
              identifier: p.identifier,
              name: p.name,
            }))}
          />
        </section>
      ) : (
        <section className="pb-10">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {t("noProjects")}
            </p>
          </div>
        </section>
      )}

      <section className="pb-16 border-t border-[color:var(--color-border)] pt-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-5">
          {t("listSection", { count: contracts.length })}
        </p>

        {contracts.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {t("noContractsYet")}
            </p>
          </div>
        ) : (
          <ul className="space-y-6">
            {contracts.map((c) => {
              const findings = parseFindings(c.riskFindings);
              const project = projects.find((p) => p.id === c.projectId);
              return (
                <li
                  key={c.id}
                  className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg)] p-5"
                >
                  <div className="flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                        {KIND_LABEL[c.kind] ?? c.kind}
                        {project ? (
                          <>
                            {" · "}
                            <span className="text-[color:var(--color-fg-muted)]">
                              {project.identifier} · {project.name}
                            </span>
                          </>
                        ) : null}
                      </p>
                      <h3 className="mt-1 text-lg font-semibold tracking-tight">
                        {c.title}
                      </h3>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        {c.signedAt ? `${formatDateShort(c.signedAt, locale)} · ` : ""}
                        {timeAgo(c.updatedAt, locale)}
                        {c.partyAg ? ` · AG: ${c.partyAg}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 ${
                          (c.riskScore ?? 0) >= 50
                            ? LEVEL_TONE.high
                            : (c.riskScore ?? 0) >= 20
                              ? LEVEL_TONE.medium
                              : LEVEL_TONE.info
                        }`}
                      >
                        Risk {c.riskScore ?? 0}/100
                      </span>
                      <form action={rescanContract}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] px-2 py-1 transition-colors"
                        >
                          Neu scannen
                        </button>
                      </form>
                      {findings.length > 0 ? (
                        <form action={createVorgangFromContract}>
                          <input type="hidden" name="id" value={c.id} />
                          <button
                            type="submit"
                            className="text-xs text-[color:var(--color-accent)] hover:text-[color:var(--color-fg)] px-2 py-1 transition-colors"
                          >
                            → Vorgang
                          </button>
                        </form>
                      ) : null}
                      <form action={deleteContract}>
                        <input type="hidden" name="id" value={c.id} />
                        <button
                          type="submit"
                          aria-label="Vertrag löschen"
                          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] px-2 py-1 transition-colors"
                        >
                          ✕
                        </button>
                      </form>
                    </div>
                  </div>

                  {findings.length === 0 ? (
                    <p className="mt-4 text-sm text-[color:var(--color-fg-muted)] italic">
                      Keine bekannten Risiko-Klauseln gefunden.
                    </p>
                  ) : (
                    <ul className="mt-4 space-y-3">
                      {findings.map((f, i) => (
                        <li
                          key={i}
                          className={`border rounded-md px-4 py-3 ${LEVEL_TONE[f.level]}`}
                        >
                          <div className="flex items-baseline justify-between gap-2 flex-wrap">
                            <p className="text-sm font-semibold">{f.title}</p>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                              {f.level}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                            {f.description}
                          </p>
                          <p className="mt-1 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                            Basis: {f.basis}
                          </p>
                          {f.snippet ? (
                            <p className="mt-2 font-mono text-[11px] text-[color:var(--color-fg)] bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-sm px-2 py-1">
                              {f.snippet}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Container>
  );
}
