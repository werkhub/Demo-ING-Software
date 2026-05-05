import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { formatDateShort, urgencyClasses, urgencyKey } from "@/lib/utils";

export type FristRow = {
  id: string;
  task: string;
  deadline: string;
  legalBasis: string | null;
  daysRemaining: number;
  urgency: "critical" | "warning" | "info";
};

export async function AnstehendeFristen({
  rows,
  windowDays = 30,
}: {
  rows: FristRow[];
  windowDays?: number;
}) {
  const filtered = rows.filter((f) => f.daysRemaining <= windowDays);
  const t = await getTranslations("modules.dashboard.fristen");
  const tUrgency = await getTranslations("common.urgency");
  const locale = await getLocale();

  if (filtered.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)] py-8 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
        {t("emptyWindow", { days: windowDays })}
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
      {filtered.map((f) => {
        const u = urgencyKey(f.daysRemaining);
        const urgencyText =
          u.kind === "today" || u.kind === "tomorrow"
            ? tUrgency(u.kind)
            : tUrgency(u.kind, { days: u.days });
        return (
          <li key={f.id} className="py-3.5 flex items-center gap-4 flex-wrap">
            <span
              className={`font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 shrink-0 ${urgencyClasses(f.urgency)}`}
            >
              {urgencyText}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{f.task}</p>
              <p className="text-xs text-[color:var(--color-fg-muted)] mt-0.5">
                {formatDateShort(f.deadline, locale)}
                {f.legalBasis ? (
                  <>
                    {" · "}
                    <span className="font-mono">{f.legalBasis}</span>
                  </>
                ) : null}
              </p>
            </div>
            <Link
              href="/fristen"
              className="text-[11px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors shrink-0"
            >
              {t("viewLink")} →
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

