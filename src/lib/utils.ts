export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * BCP-47-Locale-Code zu Intl-Locale-Code mappen.
 * Erlaubt sowohl "de" (next-intl) als auch "de-DE" (Intl-API).
 */
function intlLocale(loc: string): string {
  if (loc === "de") return "de-DE";
  if (loc === "en") return "en-GB";
  return loc;
}

export const fmtMoney = (n: number, locale: string = "de"): string =>
  new Intl.NumberFormat(intlLocale(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

/**
 * Schlüssel statt String — Aufrufer übersetzt via `t("dashboard.urgency.{key}", { days })`.
 * Strukturierte Variante zur einfachen i18n in Phase 2/4.
 */
export type UrgencyKey =
  | { kind: "overdue"; days: number }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "inDays"; days: number };

export function urgencyKey(days: number): UrgencyKey {
  if (days < 0) return { kind: "overdue", days: Math.abs(days) };
  if (days === 0) return { kind: "today" };
  if (days === 1) return { kind: "tomorrow" };
  return { kind: "inDays", days };
}

/**
 * DE-Fallback. Neue Komponenten sollten `urgencyKey` + Übersetzung verwenden.
 */
export function urgencyLabel(days: number): string {
  if (days < 0) return `${Math.abs(days)} TAGE ÜBERFÄLLIG`;
  if (days === 0) return "HEUTE";
  if (days === 1) return "MORGEN";
  return `in ${days} Tagen`;
}

/**
 * Status-Pill-Klassen im gedämpften kozoa-Stil.
 * Verwendet die globalen `--color-critical/warning/success/info`-Tokens.
 */
export function formatDateLong(date: Date, locale: string = "de"): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Schlüssel-basiert. Aufrufer übersetzt via `t("dashboard.greeting.{key}")`.
 */
export type GreetingKey = "night" | "morning" | "day" | "evening";

export function greetingKeyForHour(hour: number): GreetingKey {
  if (hour < 5) return "night";
  if (hour < 11) return "morning";
  if (hour < 18) return "day";
  return "evening";
}

/**
 * DE-Fallback. Neue Komponenten sollten `greetingKeyForHour` + Übersetzung verwenden.
 */
export function greetingForHour(hour: number): string {
  const k = greetingKeyForHour(hour);
  return { night: "Gute Nacht", morning: "Guten Morgen", day: "Guten Tag", evening: "Guten Abend" }[k];
}

export function firstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] ?? "";
}

/**
 * Tage bis zur Deadline (negativ = überfällig). Berechnet auf Tagesgrenze (00:00 lokal).
 */
export function daysUntilDeadline(deadlineIso: string, now: Date = new Date()): number {
  const deadline = new Date(deadlineIso + "T00:00:00");
  if (isNaN(deadline.getTime())) return 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ms = deadline.getTime() - today.getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Urgency aus Resttagen ableiten:
 * - critical: ≤ 1 Tag (Heute / Morgen / überfällig)
 * - warning: ≤ 7 Tage
 * - info: alles andere
 */
export function urgencyFromDays(days: number): "critical" | "warning" | "info" {
  if (days <= 1) return "critical";
  if (days <= 7) return "warning";
  return "info";
}

export function urgencyFromDeadline(
  deadlineIso: string,
  now: Date = new Date()
): "critical" | "warning" | "info" {
  return urgencyFromDays(daysUntilDeadline(deadlineIso, now));
}

export function formatDateShort(
  iso: string | null | undefined,
  locale: string = "de"
): string {
  if (!iso) return "—";
  const d = new Date(iso.length <= 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Locale-aware relative time using Intl.RelativeTimeFormat.
 * Defaults to "de" für Backwards-Compat.
 */
export function timeAgo(date: Date, locale: string = "de"): string {
  const rtf = new Intl.RelativeTimeFormat(intlLocale(locale), {
    numeric: "auto",
    style: "long",
  });
  const diffMs = date.getTime() - Date.now();
  const min = 60 * 1000;
  const hr = 60 * min;
  const day = 24 * hr;
  const abs = Math.abs(diffMs);
  if (abs < hr) return rtf.format(Math.round(diffMs / min), "minute");
  if (abs < day) return rtf.format(Math.round(diffMs / hr), "hour");
  return rtf.format(Math.round(diffMs / day), "day");
}

export function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function urgencyClasses(urgency: "critical" | "warning" | "info"): string {
  const map = {
    critical:
      "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
    warning:
      "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
    info: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  } as const;
  return map[urgency];
}
