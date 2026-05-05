/**
 * Finanzen-Hub: bündelt Eingangs-/Ausgangsrechnungen, E-Rechnung-Import,
 * DATEV-Export und Liquiditätsplanung in einer Sidebar-Entry. Die einzelnen
 * Routen (`/rechnungen`, `/ausgangsrechnungen`, `/finanzen/datev`,
 * `/finanzen/liquiditaet`, `/eingangsrechnungen/upload`) bleiben erreichbar
 * und werden als Cards mit Live-Zahlen dargestellt.
 */
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  FileUp,
  Receipt,
  ReceiptText,
} from "lucide-react";
import { Container } from "@/components/container";
import { getArStats, getRechnungen } from "@/db/queries";
import { fmtMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("modules.finanzen");
  return { title: t("title") };
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

export default async function FinanzenHubPage() {
  const [t, locale] = await Promise.all([
    getTranslations("modules.finanzen"),
    getLocale(),
  ]);

  const [eingang, ausgangStats] = await Promise.all([
    getRechnungen({ limit: 500 }),
    getArStats(),
  ]);

  const eingangAnomalies = eingang.reduce((s, r) => s + r.anomalyCount, 0);
  const eingangHighRisk = eingang.filter((r) => r.anomalyScore >= 60).length;
  const eingangXmlCount = eingang.filter((r) => r.xmlFormat).length;

  const ausgangBadge: CardProps["badge"] | undefined =
    ausgangStats.mahnung > 0
      ? {
          text: t("hub.outgoing.badgeReminder", { n: ausgangStats.mahnung }),
          tone: "warning",
        }
      : undefined;

  const eingangBadge: CardProps["badge"] | undefined =
    eingangHighRisk > 0
      ? { text: t("hub.incoming.badgeRisk", { n: eingangHighRisk }), tone: "critical" }
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
            href="/rechnungen"
            icon={<Receipt size={16} aria-hidden />}
            title={t("hub.incoming.title")}
            desc={t("hub.incoming.desc")}
            primaryStat={eingang.length.toString()}
            primaryStatLabel={t("hub.incoming.primaryLabel")}
            secondary={t("hub.incoming.secondary", {
              anomalies: eingangAnomalies,
              xml: eingangXmlCount,
            })}
            badge={eingangBadge}
          />

          <HubCard
            href="/ausgangsrechnungen"
            icon={<ReceiptText size={16} aria-hidden />}
            title={t("hub.outgoing.title")}
            desc={t("hub.outgoing.desc")}
            primaryStat={fmtMoney(ausgangStats.totalOffenGross, locale)}
            primaryStatLabel={t("hub.outgoing.primaryLabel")}
            secondary={t("hub.outgoing.secondary", {
              open: ausgangStats.offen,
              paid: ausgangStats.bezahlt,
              drafts: ausgangStats.entwuerfe,
            })}
            badge={ausgangBadge}
          />

          <HubCard
            href="/eingangsrechnungen/upload"
            icon={<FileUp size={16} aria-hidden />}
            title={t("hub.import.title")}
            desc={t("hub.import.desc")}
            primaryStat={t("hub.import.primary")}
            primaryStatLabel={t("hub.import.primaryLabel")}
            secondary={t("hub.import.secondary", { n: eingangXmlCount })}
          />
        </div>
      </section>
    </Container>
  );
}
