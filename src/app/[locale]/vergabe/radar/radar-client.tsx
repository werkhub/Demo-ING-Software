"use client";

import { useMemo, useState } from "react";
import {
  applyFilters,
  daysToDeadline,
  sortByDeadlineAsc,
  uniqueBundeslaender,
  uniquePlatformIds,
  type ManualFilter,
  type WorkspaceAutoFilter,
} from "@/lib/vergabe/feed-filters";
import { TENDER_PLATFORMS } from "@/lib/vergabe/platforms";
import type { TenderFeedItem } from "@/lib/vergabe/feed-mock";
import { DISCIPLINE_LABEL } from "@/lib/workspace/disciplines";
import { openInAnalyzer, refreshFeed, toggleHidden, toggleWatch } from "./actions";

type Props = {
  items: readonly TenderFeedItem[];
  watchedIds: string[];
  hiddenIds: string[];
  auto: WorkspaceAutoFilter;
};

type ListMode = "alle" | "watched" | "hidden";

const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  TENDER_PLATFORMS.map((p) => [p.id, p.label])
);

const BUNDESLAND_LABEL: Record<string, string> = {
  BW: "Baden-Württemberg",
  BY: "Bayern",
  BE: "Berlin",
  BB: "Brandenburg",
  HB: "Bremen",
  HH: "Hamburg",
  HE: "Hessen",
  MV: "Mecklenburg-Vorp.",
  NDS: "Niedersachsen",
  NRW: "Nordrhein-Westfalen",
  RP: "Rheinland-Pfalz",
  SL: "Saarland",
  SN: "Sachsen",
  ST: "Sachsen-Anhalt",
  SH: "Schleswig-Holstein",
  TH: "Thüringen",
};

function formatEur(n: number | null): string {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} Mio. €`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} k €`;
  return `${n} €`;
}

function deadlineToneClasses(days: number): string {
  if (days < 0)
    return "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]";
  if (days <= 7)
    return "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]";
  if (days <= 21)
    return "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]";
  return "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]";
}

export function RadarClient({ items, watchedIds, hiddenIds, auto }: Props) {
  const [mode, setMode] = useState<ListMode>("alle");
  const [disableAuto, setDisableAuto] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshSeed, setRefreshSeed] = useState(0);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const [manual, setManual] = useState<ManualFilter>({
    query: "",
    platformIds: [],
    bundeslaender: [],
    wertMinEur: null,
    wertMaxEur: null,
    scope: "all",
    fristMinTage: null,
  });

  const watchedSet = useMemo(() => new Set(watchedIds), [watchedIds]);
  const hiddenSet = useMemo(() => new Set(hiddenIds), [hiddenIds]);

  const platformOptions = useMemo(() => uniquePlatformIds(items), [items]);
  const bundeslandOptions = useMemo(() => uniqueBundeslaender(items), [items]);

  const filteredAll = useMemo(() => {
    // Bei „alle": Hidden ausblenden. Bei den eigenen Tabs: alle anzeigen.
    if (mode === "watched") {
      return items.filter((i) => watchedSet.has(i.id));
    }
    if (mode === "hidden") {
      return items.filter((i) => hiddenSet.has(i.id));
    }
    return applyFilters(items, { auto, manual, disableAuto }, hiddenSet);
  }, [items, mode, watchedSet, hiddenSet, auto, manual, disableAuto]);

  const sorted = useMemo(() => {
    const s = sortByDeadlineAsc(filteredAll);
    if (mode !== "alle" || refreshSeed === 0) return s;
    // Demo-Refresh: leichtes Re-Shuffle innerhalb gleicher Frist-Gruppen.
    return s
      .map((it, i) => ({ it, k: (i + refreshSeed) % s.length }))
      .sort((a, b) => a.k - b.k)
      .map((x) => x.it);
  }, [filteredAll, mode, refreshSeed]);

  const counts = useMemo(
    () => ({
      alle: applyFilters(items, { auto, manual, disableAuto }, hiddenSet).length,
      watched: items.filter((i) => watchedSet.has(i.id)).length,
      hidden: hiddenSet.size,
    }),
    [items, auto, manual, disableAuto, hiddenSet, watchedSet]
  );

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refreshFeed();
      setRefreshSeed((s) => s + 1);
      setLastRefreshed(new Date());
    } finally {
      setRefreshing(false);
    }
  }

  function clearManual() {
    setManual({
      query: "",
      platformIds: [],
      bundeslaender: [],
      wertMinEur: null,
      wertMaxEur: null,
      scope: "all",
      fristMinTage: null,
    });
  }

  const autoActive =
    !disableAuto && (auto.disciplines.length > 0 || auto.clientFocus);

  return (
    <section className="border-t border-[color:var(--color-border)] pt-8 pb-10">
      {/* Top-Leiste: Tabs + Refresh */}
      <div className="flex items-end justify-between gap-3 flex-wrap mb-6">
        <div className="flex gap-1 border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-1">
          {(["alle", "watched", "hidden"] as ListMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                mode === m
                  ? "bg-[color:var(--color-bg)] text-[color:var(--color-fg)] shadow-sm"
                  : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
              }`}
            >
              {m === "alle" && `Alle (${counts.alle})`}
              {m === "watched" && `Watch (${counts.watched})`}
              {m === "hidden" && `Ausgeblendet (${counts.hidden})`}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            Stand {lastRefreshed.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-1.5 text-xs hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] disabled:opacity-50 transition-colors"
          >
            {refreshing ? "…" : "↻"} Refresh
          </button>
        </div>
      </div>

      {/* Smart-Filter-Pill (workspace-auto) — nur sichtbar wenn nicht im Watch/Hidden-Tab */}
      {mode === "alle" && (
        <div className="mb-4 flex items-start gap-3 flex-wrap">
          {autoActive ? (
            <div className="flex items-center gap-2 flex-wrap border border-[color:var(--color-accent-soft)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] rounded-full pl-3 pr-1 py-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                Smart-Filter aktiv
              </span>
              {auto.disciplines.slice(0, 3).map((d) => (
                <span key={d} className="text-[11px] font-medium">
                  {DISCIPLINE_LABEL[d] ?? d}
                </span>
              ))}
              {auto.disciplines.length > 3 ? (
                <span className="text-[11px]">+{auto.disciplines.length - 3}</span>
              ) : null}
              {auto.clientFocus ? (
                <span className="text-[11px]">· {auto.clientFocus}</span>
              ) : null}
              <button
                type="button"
                onClick={() => setDisableAuto(true)}
                className="ml-1 inline-grid place-items-center w-5 h-5 rounded-full hover:bg-[color:var(--color-bg)] transition-colors"
                title="Smart-Filter deaktivieren"
              >
                ✕
              </button>
            </div>
          ) : disableAuto ? (
            <button
              type="button"
              onClick={() => setDisableAuto(false)}
              className="border border-dashed border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] rounded-full px-3 py-1 text-xs transition-colors"
            >
              + Smart-Filter wieder aktivieren
            </button>
          ) : (
            <p className="text-xs text-[color:var(--color-fg-muted)] italic">
              Workspace ohne Disziplinen-/Schwerpunkt-Profil — Smart-Filter inaktiv. Disziplinen unter Workspace setzen.
            </p>
          )}
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className="ml-auto text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            {showFilters ? "Filter schließen ▴" : "Manuelle Filter ▾"}
          </button>
        </div>
      )}

      {/* Manuelle Filter */}
      {mode === "alle" && showFilters && (
        <div className="mb-6 border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] rounded-md p-4 grid gap-4 md:grid-cols-3">
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
              Suchtext
            </span>
            <input
              type="search"
              value={manual.query ?? ""}
              onChange={(e) => setManual((m) => ({ ...m, query: e.target.value }))}
              placeholder="z. B. Schule, Brücke, München…"
              className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-1.5"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
              Plattform
            </span>
            <select
              multiple
              value={(manual.platformIds as string[]) ?? []}
              onChange={(e) =>
                setManual((m) => ({
                  ...m,
                  platformIds: Array.from(e.target.selectedOptions).map((o) => o.value),
                }))
              }
              className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 h-20"
            >
              {platformOptions.map((id) => (
                <option key={id} value={id}>
                  {PLATFORM_LABEL[id] ?? id}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
              Bundesland
            </span>
            <select
              multiple
              value={(manual.bundeslaender as string[]) ?? []}
              onChange={(e) =>
                setManual((m) => ({
                  ...m,
                  bundeslaender: Array.from(e.target.selectedOptions).map((o) => o.value),
                }))
              }
              className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 h-20"
            >
              {bundeslandOptions.map((bl) => (
                <option key={bl} value={bl}>
                  {BUNDESLAND_LABEL[bl] ?? bl}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
              Wert min (€)
            </span>
            <input
              type="number"
              value={manual.wertMinEur ?? ""}
              onChange={(e) =>
                setManual((m) => ({
                  ...m,
                  wertMinEur: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-1.5"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
              Wert max (€)
            </span>
            <input
              type="number"
              value={manual.wertMaxEur ?? ""}
              onChange={(e) =>
                setManual((m) => ({
                  ...m,
                  wertMaxEur: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-1.5"
            />
          </label>
          <label className="block">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
              Frist mind. Tage
            </span>
            <input
              type="number"
              value={manual.fristMinTage ?? ""}
              onChange={(e) =>
                setManual((m) => ({
                  ...m,
                  fristMinTage: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              placeholder="z. B. 14"
              className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-1.5"
            />
          </label>
          <label className="block md:col-span-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
              EU-Schwellenwert
            </span>
            <div className="flex gap-1 border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg)] p-1">
              {(["all", "eu_only", "national_only"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setManual((m) => ({ ...m, scope: s }))}
                  className={`flex-1 px-3 py-1 text-xs rounded transition-colors ${
                    manual.scope === s
                      ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]"
                      : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
                  }`}
                >
                  {s === "all" ? "Alle" : s === "eu_only" ? "Nur EU" : "Nur national"}
                </button>
              ))}
            </div>
          </label>
          <div className="flex items-end">
            <button
              type="button"
              onClick={clearManual}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
            >
              Manuelle Filter zurücksetzen
            </button>
          </div>
        </div>
      )}

      {/* Liste */}
      {sorted.length === 0 ? (
        <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
          <p className="text-4xl">🔍</p>
          <h2 className="mt-4 text-xl font-semibold tracking-tight">Keine Treffer</h2>
          <p className="mt-2 max-w-md mx-auto text-sm text-[color:var(--color-fg-muted)]">
            {mode === "watched"
              ? "Noch keine Ausschreibung gemerkt. Klick „★ Watch“ auf einem Treffer."
              : mode === "hidden"
                ? "Nichts ausgeblendet."
                : "Filter passen — alles ausgeblendet. Smart-Filter deaktivieren oder manuelle Filter lockern."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((it) => {
            const tage = daysToDeadline(it.angebotsfrist);
            const isWatched = watchedSet.has(it.id);
            const isHidden = hiddenSet.has(it.id);
            return (
              <li
                key={it.id}
                className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg)] p-5 hover:border-[color:var(--color-accent-soft)] transition-colors"
              >
                <div className="flex items-baseline gap-3 flex-wrap mb-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] rounded-sm px-1.5 py-0.5 text-[color:var(--color-fg-muted)]">
                    {PLATFORM_LABEL[it.platformId]?.split("·")[0]?.trim() ?? it.platformId}
                  </span>
                  {it.isEu && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-accent-soft)] bg-[color:var(--color-accent-soft)] rounded-sm px-1.5 py-0.5 text-[color:var(--color-accent)]">
                      EU
                    </span>
                  )}
                  <span className="font-mono text-[11px] text-[color:var(--color-fg-muted)]">
                    {it.vergabeNr}
                  </span>
                  <span
                    className={`ml-auto font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 ${deadlineToneClasses(tage)}`}
                  >
                    {tage < 0
                      ? `abgelaufen (${Math.abs(tage)} T)`
                      : tage === 0
                        ? "heute"
                        : `${tage} T bis Frist`}
                  </span>
                </div>

                <h3 className="text-base font-semibold tracking-tight">{it.title}</h3>
                <p className="text-xs text-[color:var(--color-fg-muted)] mt-0.5">
                  {it.vergabestelle} · {BUNDESLAND_LABEL[it.bundesland] ?? it.bundesland}
                </p>
                <p className="text-sm text-[color:var(--color-fg)] mt-2 leading-relaxed">
                  {it.description}
                </p>

                <div className="mt-3 flex items-baseline gap-x-5 gap-y-1 flex-wrap">
                  <span className="text-xs">
                    <span className="text-[color:var(--color-fg-muted)]">Wert · </span>
                    <span className="font-medium text-[color:var(--color-fg)]">
                      {formatEur(it.wertEur)}
                    </span>
                  </span>
                  <span className="text-xs">
                    <span className="text-[color:var(--color-fg-muted)]">Frist · </span>
                    <span className="font-medium text-[color:var(--color-fg)]">
                      {it.angebotsfrist}
                    </span>
                  </span>
                  <span className="text-xs">
                    <span className="text-[color:var(--color-fg-muted)]">Verfahren · </span>
                    <span className="text-[color:var(--color-fg)]">{it.verfahrensart}</span>
                  </span>
                </div>

                <div className="mt-4 flex items-center gap-2 flex-wrap">
                  {it.disciplines.map((d) => (
                    <span
                      key={d}
                      className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] rounded-sm px-1.5 py-0.5 text-[color:var(--color-fg-muted)]"
                    >
                      {DISCIPLINE_LABEL[d] ?? d}
                    </span>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-[color:var(--color-border)] flex items-center gap-2 flex-wrap">
                  <form action={openInAnalyzer}>
                    <input type="hidden" name="tenderItemId" value={it.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] text-white px-4 py-1.5 text-xs hover:bg-[color:var(--color-fg)] transition-colors"
                    >
                      In Analyse →
                    </button>
                  </form>
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors px-2"
                  >
                    Plattform ↗
                  </a>
                  <form action={toggleWatch}>
                    <input type="hidden" name="tenderItemId" value={it.id} />
                    <button
                      type="submit"
                      className={`text-xs px-2 py-1 transition-colors ${
                        isWatched
                          ? "text-[color:var(--color-warning)]"
                          : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-warning)]"
                      }`}
                    >
                      {isWatched ? "★ Watch" : "☆ Watch"}
                    </button>
                  </form>
                  <form action={toggleHidden} className="ml-auto">
                    <input type="hidden" name="tenderItemId" value={it.id} />
                    <button
                      type="submit"
                      className={`text-xs px-2 py-1 transition-colors ${
                        isHidden
                          ? "text-[color:var(--color-fg)]"
                          : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)]"
                      }`}
                    >
                      {isHidden ? "Wieder anzeigen" : "Ausblenden"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
