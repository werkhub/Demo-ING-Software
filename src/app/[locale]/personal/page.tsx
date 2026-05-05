/**
 * Personal-Hub — Reiter "Personal" bündelt alle Mitarbeiter-Tools.
 * Funktional sind aktuell Stunden + Mitarbeiter-Stamm + Projekt-Zuordnung;
 * weitere Kacheln (Urlaub, Schulungen, Lohn) sind als Demo gekennzeichnet.
 */
import { getTranslations } from "next-intl/server";
import { and, asc, eq } from "drizzle-orm";
import {
  ArrowRight,
  ClipboardList,
  GraduationCap,
  Link2,
  Plane,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("modules.personal");
  return { title: t("title") };
}

type CardProps = {
  href?: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  primaryStat: string;
  primaryStatLabel: string;
  secondary?: string;
  badge?: { text: string; tone: "info" | "demo" };
};

const BADGE_TONE: Record<NonNullable<CardProps["badge"]>["tone"], string> = {
  info: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  demo: "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
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
  const inner = (
    <>
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
        {href ? (
          <ArrowRight
            size={16}
            className="text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-accent)] group-hover:translate-x-1 transition-all"
            aria-hidden
          />
        ) : null}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="group bg-[color:var(--color-bg)] p-7 hover:bg-[color:var(--color-bg-subtle)] transition-colors flex flex-col"
      >
        {inner}
      </Link>
    );
  }
  return (
    <div className="group bg-[color:var(--color-bg)] p-7 flex flex-col opacity-70 cursor-not-allowed">
      {inner}
    </div>
  );
}

export default async function PersonalHubPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const t = await getTranslations("modules.personal");

  const [maRows, zuordnungen] = await Promise.all([
    db
      .select({
        id: schema.mitarbeiter.id,
        aktiv: schema.mitarbeiter.aktiv,
      })
      .from(schema.mitarbeiter)
      .where(eq(schema.mitarbeiter.workspaceId, workspaceId))
      .orderBy(asc(schema.mitarbeiter.name)),
    db
      .select({ id: schema.mitarbeiterProjekte.id })
      .from(schema.mitarbeiterProjekte)
      .where(eq(schema.mitarbeiterProjekte.workspaceId, workspaceId)),
  ]);

  const aktivCount = maRows.filter((m) => m.aktiv).length;
  const inaktivCount = maRows.length - aktivCount;
  const zuordnungCount = zuordnungen.length;

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
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-2 lg:grid-cols-3">
          <HubCard
            href="/stunden"
            icon={<ClipboardList size={16} aria-hidden />}
            title={t("hub.stunden.title")}
            desc={t("hub.stunden.desc")}
            primaryStat={aktivCount.toString()}
            primaryStatLabel={t("hub.stunden.primaryLabel")}
            secondary={t("hub.stunden.secondary")}
          />

          <HubCard
            href="/stunden/mitarbeiter"
            icon={<Users size={16} aria-hidden />}
            title={t("hub.mitarbeiter.title")}
            desc={t("hub.mitarbeiter.desc")}
            primaryStat={maRows.length.toString()}
            primaryStatLabel={t("hub.mitarbeiter.primaryLabel")}
            secondary={t("hub.mitarbeiter.secondary", {
              aktiv: aktivCount,
              inaktiv: inaktivCount,
            })}
          />

          <HubCard
            href="/personal/zuordnung"
            icon={<Link2 size={16} aria-hidden />}
            title={t("hub.zuordnung.title")}
            desc={t("hub.zuordnung.desc")}
            primaryStat={zuordnungCount.toString()}
            primaryStatLabel={t("hub.zuordnung.primaryLabel")}
            secondary={t("hub.zuordnung.secondary")}
          />

          <HubCard
            icon={<Plane size={16} aria-hidden />}
            title={t("hub.urlaub.title")}
            desc={t("hub.urlaub.desc")}
            primaryStat="—"
            primaryStatLabel={t("hub.urlaub.primaryLabel")}
            secondary={t("hub.urlaub.secondary")}
            badge={{ text: t("badge.demo"), tone: "demo" }}
          />

          <HubCard
            icon={<GraduationCap size={16} aria-hidden />}
            title={t("hub.schulung.title")}
            desc={t("hub.schulung.desc")}
            primaryStat="—"
            primaryStatLabel={t("hub.schulung.primaryLabel")}
            secondary={t("hub.schulung.secondary")}
            badge={{ text: t("badge.demo"), tone: "demo" }}
          />

          <HubCard
            icon={<Wallet size={16} aria-hidden />}
            title={t("hub.lohn.title")}
            desc={t("hub.lohn.desc")}
            primaryStat="—"
            primaryStatLabel={t("hub.lohn.primaryLabel")}
            secondary={t("hub.lohn.secondary")}
            badge={{ text: t("badge.demo"), tone: "demo" }}
          />
        </div>
      </section>
    </Container>
  );
}
