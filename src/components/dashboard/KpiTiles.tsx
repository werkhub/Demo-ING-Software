import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

type KpiTile = {
  label: string;
  value: number;
  caption: string;
  href: "/projekte" | "/vorgaenge" | "/fristen" | "/vorgaenge?risk=high";
  tone: "default" | "accent" | "warning" | "critical";
};

const TONE: Record<KpiTile["tone"], string> = {
  default: "text-[color:var(--color-fg-muted)]",
  accent: "text-[color:var(--color-accent)]",
  warning: "text-[color:var(--color-warning)]",
  critical: "text-[color:var(--color-critical)]",
};

export async function KpiTiles({
  aktiveProjekte,
  offeneVorgaenge,
  fristenKritisch,
  highRiskVorgaenge,
}: {
  aktiveProjekte: number;
  offeneVorgaenge: number;
  fristenKritisch: number;
  highRiskVorgaenge: number;
}) {
  const t = await getTranslations("modules.dashboard.kpi");

  const tiles: KpiTile[] = [
    {
      label: t("activeProjects.label"),
      value: aktiveProjekte,
      caption: t("activeProjects.caption"),
      href: "/projekte",
      tone: "accent",
    },
    {
      label: t("openCases.label"),
      value: offeneVorgaenge,
      caption: t("openCases.caption"),
      href: "/vorgaenge",
      tone: "accent",
    },
    {
      label: t("deadlines14.label"),
      value: fristenKritisch,
      caption: fristenKritisch > 0 ? t("deadlines14.captionCritical") : t("deadlines14.captionCalm"),
      href: "/fristen",
      tone: fristenKritisch > 0 ? "critical" : "default",
    },
    {
      label: t("highRisk.label"),
      value: highRiskVorgaenge,
      caption: highRiskVorgaenge > 0 ? t("highRisk.captionPresent") : t("highRisk.captionAbsent"),
      href: "/vorgaenge?risk=high",
      tone: highRiskVorgaenge > 0 ? "warning" : "default",
    },
  ];

  return (
    <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-4">
      {tiles.map((tile) => (
        <Link
          key={tile.label}
          href={tile.href}
          className="bg-[color:var(--color-bg)] p-6 group hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          <p
            className={`font-mono text-[10px] uppercase tracking-[0.22em] ${TONE[tile.tone]}`}
          >
            {tile.label}
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
            {tile.value}
          </p>
          <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
            {tile.caption}
          </p>
        </Link>
      ))}
    </div>
  );
}
