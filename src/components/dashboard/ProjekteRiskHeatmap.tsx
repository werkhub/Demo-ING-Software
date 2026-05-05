import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export type ProjektRiskRow = {
  id: string;
  identifier: string;
  name: string;
  status: string;
  fristScore: number;
  vorgangScore: number;
  vertragsluecken: number;
  maengelScore: number;
  overall: number;
};

function heatClass(score: number): string {
  if (score >= 70)
    return "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]";
  if (score >= 40)
    return "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]";
  if (score >= 15)
    return "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]";
  return "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]";
}

const COLUMNS: { key: "fristScore" | "vorgangScore" | "vertragsluecken" | "maengelScore" | "overall"; labelKey: string }[] = [
  { key: "fristScore", labelKey: "frist" },
  { key: "vorgangScore", labelKey: "vorgangstau" },
  { key: "vertragsluecken", labelKey: "vertragsluecken" },
  { key: "maengelScore", labelKey: "maengel" },
  { key: "overall", labelKey: "overall" },
];

export async function ProjekteRiskHeatmap({ rows }: { rows: ProjektRiskRow[] }) {
  const t = await getTranslations("modules.dashboard.riskHeatmap");

  if (rows.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)] py-8 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
        {t("empty")}
      </p>
    );
  }
  const sorted = [...rows].sort((a, b) => b.overall - a.overall);

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--color-border)]">
            <th className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] text-left py-2.5 px-4">
              {t("columns.project")}
            </th>
            {COLUMNS.map((c) => (
              <th
                key={c.key}
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] text-left py-2.5 px-3"
              >
                {t(`columns.${c.labelKey}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr
              key={r.id}
              className="border-b border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)] transition-colors"
            >
              <td className="py-3 px-4">
                <Link
                  href={`/projekte/${r.id}` as never}
                  className="block group"
                >
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                    {r.identifier}
                  </p>
                  <p className="text-sm font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                    {r.name}
                  </p>
                </Link>
              </td>
              {COLUMNS.map((c) => {
                const score = r[c.key];
                return (
                  <td key={c.key} className="py-3 px-3">
                    <span
                      className={`inline-flex w-12 justify-center font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-1 ${heatClass(score)}`}
                    >
                      {score}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
