/**
 * Analysen-Hub: bündelt die drei „Dokument rein → KI-Analyse → Ergebnis raus"
 * Werkzeuge — Vertrags-Scan, Rüge-Analyse, Anordnungs-Check — in einer
 * Sidebar-Entry. Die einzelnen Routen (`/vertrag`, `/ruege-analyse`,
 * `/anordnung`) bleiben erreichbar.
 */
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, Mail, Search, Shield } from "lucide-react";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("modules.analysen");
  return { title: t("title") };
}

type RiskFinding = { level?: "high" | "medium" | "low" };

function parseFindings(raw: string | null | undefined): RiskFinding[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type CardProps = {
  href: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  primaryStat: string;
  primaryStatLabel: string;
  secondary?: string;
  badge?: { text: string; tone: "success" | "warning" | "critical" | "info" };
};

const BADGE_TONE: Record<NonNullable<CardProps["badge"]>["tone"], string> = {
  success:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  warning:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  critical:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  info: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

function HubCard({
  href,
  icon,
  title,
  desc,
  primaryStat,
  primaryStatLabel,
  secondary,
  badge,
}: CardProps) {
  return (
    <Link
      href={href}
      className="group bg-[color:var(--color-bg)] p-7 hover:bg-[color:var(--color-bg-subtle)] transition-colors flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg)]">
            {icon}
          </span>
          <h3 className="text-lg font-semibold tracking-tight text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
            {title}
          </h3>
        </div>
        {badge ? (
          <span
            className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${BADGE_TONE[badge.tone]}`}
          >
            {badge.text}
          </span>
        ) : null}
      </div>

      <p className="text-xs text-[color:var(--color-fg-muted)] leading-relaxed flex-1">
        {desc}
      </p>

      <div className="mt-5 flex items-end justify-between gap-3">
        <div>
          <p className="text-2xl font-semibold tracking-tight tabular-nums">
            {primaryStat}
          </p>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider font-mono text-[color:var(--color-fg-muted)]">
            {primaryStatLabel}
          </p>
          {secondary ? (
            <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
              {secondary}
            </p>
          ) : null}
        </div>
        <ArrowRight
          size={16}
          className="text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-accent)] group-hover:translate-x-1 transition-all"
          aria-hidden
        />
      </div>
    </Link>
  );
}

export default async function AnalysenHubPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const t = await getTranslations("modules.analysen");

  const contracts = await db
    .select()
    .from(schema.contracts)
    .where(eq(schema.contracts.workspaceId, workspaceId))
    .orderBy(desc(schema.contracts.updatedAt));

  const totalHigh = contracts.reduce(
    (s, c) =>
      s + parseFindings(c.riskFindings).filter((f) => f.level === "high").length,
    0
  );
  const totalMedium = contracts.reduce(
    (s, c) =>
      s +
      parseFindings(c.riskFindings).filter((f) => f.level === "medium").length,
    0
  );

  const vertragBadge: CardProps["badge"] | undefined =
    totalHigh > 0
      ? { text: t("hub.badgeHigh", { n: totalHigh }), tone: "critical" }
      : totalMedium > 0
        ? { text: t("hub.badgeMedium", { n: totalMedium }), tone: "warning" }
        : undefined;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("intro")}
        </p>
      </section>

      <section className="pb-16">
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3">
          <HubCard
            href="/vertrag"
            icon={<Shield size={16} aria-hidden />}
            title={t("hub.vertrag.title")}
            desc={t("hub.vertrag.desc")}
            primaryStat={contracts.length.toString()}
            primaryStatLabel={t("hub.vertrag.primaryLabel")}
            secondary={
              totalHigh + totalMedium > 0
                ? t("hub.vertrag.secondary", { high: totalHigh, medium: totalMedium })
                : t("hub.vertrag.noFindings")
            }
            badge={vertragBadge}
          />

          <HubCard
            href="/ruege-analyse"
            icon={<Search size={16} aria-hidden />}
            title={t("hub.ruege.title")}
            desc={t("hub.ruege.desc")}
            primaryStat={t("hub.ruege.primary")}
            primaryStatLabel={t("hub.ruege.primaryLabel")}
            secondary={t("hub.ruege.secondary")}
          />

          <HubCard
            href="/anordnung"
            icon={<Mail size={16} aria-hidden />}
            title={t("hub.anordnung.title")}
            desc={t("hub.anordnung.desc")}
            primaryStat={t("hub.anordnung.primary")}
            primaryStatLabel={t("hub.anordnung.primaryLabel")}
            secondary={t("hub.anordnung.secondary")}
          />
        </div>
      </section>
    </Container>
  );
}
