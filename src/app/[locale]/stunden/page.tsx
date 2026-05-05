import { getLocale, getTranslations } from "next-intl/server";
import { and, asc, eq, gte, lte } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  daysOfIsoWeek,
  isoWeekFromDate,
  mondayOfIsoWeek,
} from "@/lib/stunden";
import { LockWocheButton, UnlockWocheButton } from "./lock-controls";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number, locale: string) =>
  new Intl.NumberFormat(locale === "en" ? "en-IE" : "de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

type SearchParams = Promise<{
  jahr?: string;
  kw?: string;
  error?: string;
  locked?: string;
}>;

export default async function StundenWochePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();
  const [t, tDays, locale] = await Promise.all([
    getTranslations("modules.stunden"),
    getTranslations("modules.stunden.table"),
    getLocale(),
  ]);

  const dayLabels = [
    tDays("monday"),
    tDays("tuesday"),
    tDays("wednesday"),
    tDays("thursday"),
    tDays("friday"),
    tDays("saturday"),
    tDays("sunday"),
  ];

  const today = new Date();
  const isoNow = isoWeekFromDate(today);
  const jahr = Number(sp.jahr ?? isoNow.jahr);
  const kw = Number(sp.kw ?? isoNow.kw);
  const days = daysOfIsoWeek(jahr, kw);
  const monday = days[0];
  const sunday = days[6];

  const [aktiveMa, stundenRows, lockRow] = await Promise.all([
    db
      .select()
      .from(schema.mitarbeiter)
      .where(
        and(
          eq(schema.mitarbeiter.workspaceId, workspaceId),
          eq(schema.mitarbeiter.aktiv, true)
        )
      )
      .orderBy(asc(schema.mitarbeiter.name)),
    db
      .select()
      .from(schema.stunden)
      .where(
        and(
          eq(schema.stunden.workspaceId, workspaceId),
          gte(schema.stunden.datum, monday),
          lte(schema.stunden.datum, sunday)
        )
      ),
    db
      .select()
      .from(schema.stundenWochenLock)
      .where(
        and(
          eq(schema.stundenWochenLock.workspaceId, workspaceId),
          eq(schema.stundenWochenLock.jahr, jahr),
          eq(schema.stundenWochenLock.kw, kw)
        )
      )
      .limit(1),
  ]);

  const isLocked = lockRow.length > 0;

  const aggMa = new Map<string, Map<string, number>>();
  let weekTotalHours = 0;
  let weekTotalLohnCents = 0;
  for (const s of stundenRows) {
    if (!aggMa.has(s.mitarbeiterId)) aggMa.set(s.mitarbeiterId, new Map());
    const inner = aggMa.get(s.mitarbeiterId)!;
    inner.set(s.datum, (inner.get(s.datum) ?? 0) + s.stunden);
    weekTotalHours += s.stunden;
    weekTotalLohnCents += Math.round(s.stunden * s.stundensatzCents);
  }

  const mondayDate = mondayOfIsoWeek(jahr, kw);
  const prevMon = new Date(mondayDate);
  prevMon.setUTCDate(mondayDate.getUTCDate() - 7);
  const nextMon = new Date(mondayDate);
  nextMon.setUTCDate(mondayDate.getUTCDate() + 7);
  const prevWeek = isoWeekFromDate(prevMon);
  const nextWeek = isoWeekFromDate(nextMon);

  const buchungenCount = stundenRows.length;
  const isCurrentWeek = jahr === isoNow.jahr && kw === isoNow.kw;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {t("weekTitle", { kw, jahr })}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("intro")}
        </p>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}
      {sp.locked === "1" ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] px-4 py-3 text-sm text-[color:var(--color-success)]">
          {t("weekLockedToast", { kw, jahr })}
        </div>
      ) : null}

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/stunden?jahr=${prevWeek.jahr}&kw=${prevWeek.kw}`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          ← KW {prevWeek.kw}/{prevWeek.jahr}
        </Link>
        {!isCurrentWeek ? (
          <Link
            href="/stunden"
            className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
          >
            {t("navTodayWeek", { kw: isoNow.kw, jahr: isoNow.jahr })}
          </Link>
        ) : null}
        <Link
          href={`/stunden?jahr=${nextWeek.jahr}&kw=${nextWeek.kw}`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          KW {nextWeek.kw}/{nextWeek.jahr} →
        </Link>
        <span className="ml-auto flex items-center gap-3">
          <Link
            href="/stunden/erfassen"
            className="rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            {t("captureBtn")}
          </Link>
          <Link
            href="/stunden/mitarbeiter"
            className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
          >
            {t("employeesBtn")}
          </Link>
        </span>
      </section>

      <section className="mb-8 border-t border-[color:var(--color-border)] pt-6">
        <StatGrid4>
          <StatCard label={t("stats.activeEmployees")} value={aktiveMa.length} />
          <StatCard label={t("stats.bookings")} value={buchungenCount} />
          <StatCard
            label={t("stats.hoursTotal")}
            value={weekTotalHours.toFixed(2) + " h"}
          />
          <StatCard
            label={t("stats.wageTotal")}
            value={fmtCurrency(weekTotalLohnCents, locale)}
            tone="accent"
          />
        </StatGrid4>
      </section>

      <section className="mb-8">
        {isLocked ? (
          <div className="flex items-center justify-between rounded-md border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] px-4 py-3 text-sm text-[color:var(--color-warning)]">
            <div>
              <strong>{t("lockState.lockedTitle")}</strong> —{" "}
              {t("lockState.lockedDetails", {
                date:
                  lockRow[0].gesperrtAm?.toLocaleDateString(
                    locale === "en" ? "en-IE" : "de-DE"
                  ) ?? "—",
                by: lockRow[0].gesperrtVon ?? "—",
              })}
              {" "}
              {lockRow[0].notes
                ? t("lockState.lockedNote", { note: lockRow[0].notes })
                : ""}
            </div>
            <UnlockWocheButton jahr={jahr} kw={kw} />
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-4 py-3 text-sm">
            <span className="text-[color:var(--color-fg-muted)]">
              {t("lockState.openLabel")}
            </span>
            <LockWocheButton jahr={jahr} kw={kw} />
          </div>
        )}
      </section>

      {aktiveMa.length === 0 ? (
        <section className="border-t border-[color:var(--color-border)] py-12 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            {t("noEmployees")}
          </p>
          <Link
            href="/stunden/mitarbeiter/new"
            className="mt-4 inline-flex rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            {t("createFirstEmployee")}
          </Link>
        </section>
      ) : (
        <section className="border border-[color:var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
              <tr>
                <th className="px-3 py-3 text-left">{t("tableHeaders.employee")}</th>
                {dayLabels.map((d, i) => (
                  <th key={d + i} className="px-2 py-3 text-right">
                    {d}
                    <br />
                    <span className="text-[9px] opacity-60">
                      {days[i].slice(8, 10)}.
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3 text-right">{t("tableHeaders.hoursTotal")}</th>
              </tr>
            </thead>
            <tbody>
              {aktiveMa.map((ma) => {
                const inner = aggMa.get(ma.id) ?? new Map<string, number>();
                let row = 0;
                for (const v of inner.values()) row += v;
                return (
                  <tr
                    key={ma.id}
                    className="border-t border-[color:var(--color-border)]"
                  >
                    <td className="px-3 py-2.5">
                      <Link
                        href={`/stunden/mitarbeiter/${ma.id}/edit`}
                        className="text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)]"
                      >
                        {ma.name}
                      </Link>
                      {ma.gewerk ? (
                        <span className="ml-2 font-mono text-[10px] text-[color:var(--color-fg-muted)] uppercase tracking-wider">
                          {ma.gewerk}
                        </span>
                      ) : null}
                    </td>
                    {days.map((d) => {
                      const v = inner.get(d) ?? 0;
                      return (
                        <td
                          key={d}
                          className={`px-2 py-2.5 text-right font-mono text-xs ${
                            v > 12
                              ? "text-[color:var(--color-critical)] font-semibold"
                              : v > 0
                                ? "text-[color:var(--color-fg)]"
                                : "text-[color:var(--color-fg-muted)] opacity-40"
                          }`}
                        >
                          {v > 0 ? v.toFixed(2) : "—"}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">
                      {row.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
    </Container>
  );
}
