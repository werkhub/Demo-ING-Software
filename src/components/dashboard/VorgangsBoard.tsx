import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Vorgang, VorgangStatus } from "@/db/schema";
import { formatDateShort } from "@/lib/utils";

const COLUMN_KEYS: VorgangStatus[] = [
  "offen",
  "in_bearbeitung",
  "wartet_auf_anwalt",
  "abgeschlossen",
];

function riskClass(score: number) {
  if (score >= 70)
    return "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]";
  if (score >= 40)
    return "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]";
  return "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]";
}

export async function VorgangsBoard({ vorgaenge }: { vorgaenge: Vorgang[] }) {
  const t = await getTranslations("modules.dashboard.vorgaengeBoard");
  const locale = await getLocale();

  const byStatus: Record<VorgangStatus, Vorgang[]> = {
    offen: [],
    in_bearbeitung: [],
    wartet_auf_anwalt: [],
    abgeschlossen: [],
    archiviert: [],
  };
  for (const v of vorgaenge) {
    byStatus[v.status].push(v);
  }

  return (
    <div className="grid gap-3 md:grid-cols-4 overflow-x-auto">
      {COLUMN_KEYS.map((key) => {
        const cards = byStatus[key];
        return (
          <div
            key={key}
            className="min-w-[220px] rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] p-3"
          >
            <div className="flex items-baseline justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg)]">
                {t(`columns.${key}`)}
              </p>
              <span className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                {cards.length}
              </span>
            </div>
            {cards.length === 0 ? (
              <p className="text-[11px] text-[color:var(--color-fg-muted)] italic py-4 text-center">
                —
              </p>
            ) : (
              <ul className="space-y-2">
                {cards.slice(0, 6).map((v) => {
                  const categoryKey = v.category as keyof typeof CATEGORY_KEYS;
                  const categoryLabel = CATEGORY_KEYS[categoryKey]
                    ? t(`categoryLabels.${categoryKey}`)
                    : v.category;
                  return (
                    <li key={v.id}>
                      <Link
                        href={`/vorgaenge/${v.id}` as never}
                        className="block rounded-md bg-[color:var(--color-bg)] border border-[color:var(--color-border)] p-2.5 hover:border-[color:var(--color-accent)] transition-colors"
                      >
                        <div className="flex items-baseline justify-between gap-2 mb-1">
                          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                            {categoryLabel}
                          </span>
                          <span
                            className={`font-mono text-[9px] uppercase tracking-[0.12em] border rounded-sm px-1 py-0.5 ${riskClass(v.riskScore)}`}
                          >
                            {v.riskScore}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-[color:var(--color-fg)] line-clamp-2">
                          {v.title}
                        </p>
                        {v.dueDate ? (
                          <p className="text-[10px] text-[color:var(--color-fg-muted)] mt-1.5">
                            {t("dueLabel", { date: formatDateShort(v.dueDate, locale) })}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            {cards.length > 6 ? (
              <p className="text-[10px] text-[color:var(--color-fg-muted)] text-center mt-2">
                {t("moreCount", { count: cards.length - 6 })}
              </p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

const CATEGORY_KEYS = {
  maengelruege: true,
  anlieferung: true,
  vertragspflicht: true,
  sonstiges: true,
} as const;
