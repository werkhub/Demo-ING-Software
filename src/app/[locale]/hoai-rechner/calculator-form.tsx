"use client";

import { useMemo, useState } from "react";
import {
  HONORARTAFELN,
  HONORARZONE_LABEL,
  LEISTUNGSBILD_LABEL,
} from "@/lib/hoai/honorartafeln";
import {
  LP_LABEL,
  LP_LABEL_SHORT,
  getValidLps,
} from "@/lib/hoai/leistungsphasen";
import { calculate, formatEur } from "@/lib/hoai/calculator";
import type {
  HoaiHonorarzone,
  HoaiLeistungsbild,
  HoaiSatz,
} from "@/db/schema";
import type { Leistungsphase } from "@/lib/hoai/types";

const ALL_LB_OPTIONS: HoaiLeistungsbild[] = [
  "gebaeude",
  "ingenieurbau",
  "tragwerk",
  "tga",
  "verkehr",
];
const ZONE_OPTIONS: HoaiHonorarzone[] = ["I", "II", "III", "IV", "V"];
const SATZ_OPTIONS: HoaiSatz[] = ["min", "mittel", "max"];

const SATZ_LABEL: Record<HoaiSatz, string> = {
  min: "Mindestsatz",
  mittel: "Mittelsatz (Standard)",
  max: "Höchstsatz",
};

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2";
const inputClass =
  "w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

export type HoaiCalculatorProps = {
  /**
   * Leistungsbilder, die für diesen Workspace verfügbar sind. Wird auf Basis
   * der Workspace-Disziplinen vom Server gefiltert. Leeres Array → alle
   * (defensiver Fallback), damit die Seite nicht leer wirkt.
   */
  allowedLeistungsbilder?: HoaiLeistungsbild[];
};

export function HoaiCalculator({ allowedLeistungsbilder }: HoaiCalculatorProps = {}) {
  const lbOptions = useMemo<HoaiLeistungsbild[]>(() => {
    if (!allowedLeistungsbilder || allowedLeistungsbilder.length === 0) {
      return ALL_LB_OPTIONS;
    }
    // Reihenfolge der ALL-Liste beibehalten, damit die Auswahl stabil ist.
    return ALL_LB_OPTIONS.filter((lb) => allowedLeistungsbilder.includes(lb));
  }, [allowedLeistungsbilder]);

  const initialLb: HoaiLeistungsbild = lbOptions[0] ?? "gebaeude";
  const [leistungsbild, setLeistungsbild] =
    useState<HoaiLeistungsbild>(initialLb);
  const [zone, setZone] = useState<HoaiHonorarzone>("III");
  const [satz, setSatz] = useState<HoaiSatz>("mittel");
  const [kostenEur, setKostenEur] = useState<string>("500000");
  const [umbauPct, setUmbauPct] = useState<string>("0");
  const [nebenkostenPct, setNebenkostenPct] = useState<string>("5");
  const [aktiveLps, setAktiveLps] = useState<Set<Leistungsphase>>(
    new Set([1, 2, 3, 4, 5, 6, 7, 8, 9])
  );

  const validLps = useMemo(() => getValidLps(leistungsbild), [leistungsbild]);

  // Bei Wechsel des Leistungsbilds: ungültige LPs aus dem Set entfernen
  // (z.B. LP7-9 bei Tragwerk)
  const filteredAktiveLps = useMemo(() => {
    const filtered = new Set<Leistungsphase>();
    aktiveLps.forEach((lp) => {
      if (validLps.includes(lp)) filtered.add(lp);
    });
    return filtered;
  }, [aktiveLps, validLps]);

  const tafel = HONORARTAFELN[leistungsbild];
  const kostenCents = Math.round(
    Number((kostenEur || "0").replace(/[^\d.,]/g, "").replace(",", ".")) * 100
  );

  const result = useMemo(() => {
    const lps = Array.from(filteredAktiveLps).sort((a, b) => a - b);
    if (lps.length === 0) return null;
    return calculate({
      leistungsbild,
      zone,
      satz,
      anrechenbareKostenCents: kostenCents,
      beauftragteLps: lps,
      umbauZuschlagPct: Number(umbauPct) || 0,
      nebenkostenPauschalePct: Number(nebenkostenPct) || 0,
    });
  }, [leistungsbild, zone, satz, kostenCents, filteredAktiveLps, umbauPct, nebenkostenPct]);

  const toggleLp = (lp: Leistungsphase): void => {
    setAktiveLps((prev) => {
      const next = new Set(prev);
      if (next.has(lp)) next.delete(lp);
      else next.add(lp);
      return next;
    });
  };

  return (
    <div className="grid lg:grid-cols-[1fr_auto] gap-8">
      {/* Eingabe-Bereich */}
      <div className="space-y-6 max-w-xl">
        <div>
          <label className={labelClass}>Leistungsbild</label>
          <select
            value={leistungsbild}
            onChange={(e) =>
              setLeistungsbild(e.target.value as HoaiLeistungsbild)
            }
            className={inputClass}
          >
            {lbOptions.map((lb) => (
              <option key={lb} value={lb}>
                {LEISTUNGSBILD_LABEL[lb]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
            {tafel.paragraph} · {tafel.anlage} · Bereich{" "}
            {formatEur(tafel.kostenBereichMinCents)} bis{" "}
            {formatEur(tafel.kostenBereichMaxCents)}
          </p>
        </div>

        <div>
          <label className={labelClass}>Anrechenbare Kosten netto (€)</label>
          <input
            type="text"
            inputMode="decimal"
            value={kostenEur}
            onChange={(e) => setKostenEur(e.target.value)}
            className={inputClass + " font-mono"}
            placeholder="z.B. 500000"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Honorarzone</label>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value as HoaiHonorarzone)}
              className={inputClass}
            >
              {ZONE_OPTIONS.map((z) => (
                <option key={z} value={z}>
                  {HONORARZONE_LABEL[z]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Honorarsatz</label>
            <select
              value={satz}
              onChange={(e) => setSatz(e.target.value as HoaiSatz)}
              className={inputClass}
            >
              {SATZ_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {SATZ_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Beauftragte Leistungsphasen</label>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
            {validLps.map((lp) => {
              const active = filteredAktiveLps.has(lp);
              return (
                <button
                  key={lp}
                  type="button"
                  onClick={() => toggleLp(lp)}
                  className={`rounded-md border px-3 py-2 text-xs font-mono transition-colors ${
                    active
                      ? "bg-[color:var(--color-accent-soft)] border-[color:var(--color-accent)] text-[color:var(--color-accent)]"
                      : "bg-[color:var(--color-bg)] border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] hover:border-[color:var(--color-fg-muted)]"
                  }`}
                  title={LP_LABEL[lp]}
                >
                  {LP_LABEL_SHORT[lp]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] text-[color:var(--color-fg-muted)]">
            Klick zum Aktivieren/Deaktivieren. {filteredAktiveLps.size} von{" "}
            {validLps.length} LPs ausgewählt.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Umbau-Zuschlag (%)</label>
            <input
              type="number"
              min="0"
              max="80"
              step="1"
              value={umbauPct}
              onChange={(e) => setUmbauPct(e.target.value)}
              className={inputClass + " font-mono"}
            />
            <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
              § 6 II Nr. 5 HOAI · 0–80 %
            </p>
          </div>
          <div>
            <label className={labelClass}>Nebenkosten (%)</label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={nebenkostenPct}
              onChange={(e) => setNebenkostenPct(e.target.value)}
              className={inputClass + " font-mono"}
            />
            <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
              Typisch 5–8 %
            </p>
          </div>
        </div>
      </div>

      {/* Ergebnis-Panel */}
      <aside className="lg:w-[360px] border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-6 self-start sticky top-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          Ergebnis
        </p>

        {!result ? (
          <p className="mt-4 text-sm text-[color:var(--color-fg-muted)]">
            Mindestens eine Leistungsphase wählen.
          </p>
        ) : !result.ok ? (
          <div className="mt-4 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-3 py-2 text-sm text-[color:var(--color-critical)]">
            {result.error.kind === "kosten_unter_min"
              ? `Kosten unter Tafel-Minimum (${formatEur(result.error.minCents)})`
              : result.error.kind === "kosten_ueber_max"
                ? `Kosten über Tafel-Maximum (${formatEur(result.error.maxCents)})`
                : result.error.kind === "ungueltige_lp"
                  ? `LP${result.error.lp} ist für ${LEISTUNGSBILD_LABEL[result.error.leistungsbild]} nicht vorgesehen.`
                  : "Keine LPs ausgewählt."}
          </div>
        ) : (
          <>
            <div className="mt-4">
              <p className="text-3xl font-semibold tracking-tight text-[color:var(--color-accent)]">
                {formatEur(result.result.honorarsummeNettoCents)}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)] font-mono">
                Gesamthonorar netto
              </p>
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <Line
                label="Vollhonorar (100% LP)"
                value={formatEur(result.result.vollhonorarCents)}
                muted
              />
              <Line
                label={`Grundhonorar (${(result.result.beauftragterLpAnteil * 100).toFixed(1)}%)`}
                value={formatEur(result.result.grundhonorarCents)}
              />
              {result.result.umbauZuschlagCents > 0 ? (
                <Line
                  label="+ Umbau-Zuschlag"
                  value={formatEur(result.result.umbauZuschlagCents)}
                />
              ) : null}
              {result.result.nebenkostenCents > 0 ? (
                <Line
                  label="+ Nebenkosten"
                  value={formatEur(result.result.nebenkostenCents)}
                />
              ) : null}
              <div className="border-t border-[color:var(--color-border)] pt-2 mt-3">
                <Line
                  label="= Honorarsumme netto"
                  value={formatEur(result.result.honorarsummeNettoCents)}
                  bold
                />
              </div>
              <Line
                label={`+ USt 19%`}
                value={formatEur(
                  Math.round(result.result.honorarsummeNettoCents * 0.19)
                )}
                muted
              />
              <Line
                label="= Brutto"
                value={formatEur(
                  Math.round(result.result.honorarsummeNettoCents * 1.19)
                )}
                muted
              />
            </div>

            <div className="mt-6 border-t border-[color:var(--color-border)] pt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-3">
                LP-Aufsplitt (Grundhonorar)
              </p>
              <ul className="space-y-1.5 text-xs">
                {Object.entries(result.result.lpAufsplittCents)
                  .sort(([a], [b]) => Number(a) - Number(b))
                  .map(([lp, cents]) => (
                    <li key={lp} className="flex justify-between font-mono">
                      <span className="text-[color:var(--color-fg-muted)]">
                        {LP_LABEL_SHORT[Number(lp) as Leistungsphase]}
                      </span>
                      <span>{formatEur(cents ?? 0)}</span>
                    </li>
                  ))}
              </ul>
            </div>

            <p className="mt-6 text-[10px] text-[color:var(--color-fg-muted)] leading-relaxed">
              Berechnung mit linearer Interpolation zwischen den HOAI-2021-
              Tafel-Stützstellen. Genauigkeit typ. ±1.5 % gegenüber der vollen
              Tabelle.
            </p>
          </>
        )}
      </aside>
    </div>
  );
}

function Line({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between font-mono">
      <span
        className={
          muted ? "text-[color:var(--color-fg-muted)]" : ""
        }
      >
        {label}
      </span>
      <span
        className={`${bold ? "font-semibold" : ""} ${muted ? "text-[color:var(--color-fg-muted)]" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
