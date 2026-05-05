import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { timeAgo } from "@/lib/utils";

export type ActivityItem = {
  id: string;
  when: Date;
  kind: "bautagebuch" | "anfrage" | "vorgang" | "rechnung" | "audit";
  title: string;
  detail: string;
  href: string;
};

const KIND_TONE: Record<ActivityItem["kind"], string> = {
  bautagebuch:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  anfrage:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  vorgang:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  rechnung:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg)] border-[color:var(--color-border)]",
  audit:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

export async function LetzteAktivitaeten({ items }: { items: ActivityItem[] }) {
  const t = await getTranslations("modules.dashboard.activities");
  const locale = await getLocale();

  if (items.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)] py-8 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
        {t("empty")}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
      {items.map((it) => (
        <li key={it.id}>
          <Link
            href={it.href as never}
            className="flex items-center gap-3 py-3 group"
          >
            <span
              className={`font-mono text-[9px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 shrink-0 ${KIND_TONE[it.kind]}`}
            >
              {t(`kindLabels.${it.kind}`)}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors truncate">
                {it.title}
              </p>
              <p className="text-xs text-[color:var(--color-fg-muted)] truncate">
                {it.detail}
              </p>
            </div>
            <span className="text-[11px] text-[color:var(--color-fg-muted)] shrink-0">
              {timeAgo(it.when, locale)}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
