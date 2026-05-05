"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { updateProjectHoai } from "../../actions";
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

const LB_OPTIONS: HoaiLeistungsbild[] = [
  "gebaeude",
  "ingenieurbau",
  "tragwerk",
  "tga",
];
const ZONE_OPTIONS: HoaiHonorarzone[] = ["I", "II", "III", "IV", "V"];
const SATZ_OPTIONS: HoaiSatz[] = ["min", "mittel", "max"];

const SATZ_LABEL: Record<HoaiSatz, string> = {
  min: "Mindestsatz",
  mittel: "Mittelsatz",
  max: "Höchstsatz",
};

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2";
const inputClass =
  "w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

type Initial = {
  leistungsbild: HoaiLeistungsbild | null;
  zone: HoaiHonorarzone | null;
  satz: HoaiSatz;
  anrechenbareKostenCents: number | null;
  beauftragteLps: number[];
  umbauPct: number;
  nebenkostenPct: number;
  honorarsummeNettoCents: number | null;
  berechnetAm: Date | null;
};

export function ProjectHoaiForm({
  projectId,
  initial,
}: {
  projectId: string;
  initial: Initial;
}) {
  const { push } = useToast();
  const [state, formAction] = useActionState(updateProjectHoai, null);
  const success = state?.ok ? state.data : null;
  const formError = state && !state.ok ? state.formError : undefined;

  const [leistungsbild, setLeistungsbild] = useState<HoaiLeistungsbild>(
    initial.leistungsbild ?? "gebaeude"
  );
  const [zone, setZone] = useState<HoaiHonorarzone>(initial.zone ?? "III");
  const [satz, setSatz] = useState<HoaiSatz>(initial.satz);
  const [kostenEur, setKostenEur] = useState<string>(
    initial.anrechenbareKostenCents !== null
      ? (initial.anrechenbareKostenCents / 100).toFixed(2).replace(".", ",")
      : ""
  );
  const [umbauPct, setUmbauPct] = useState<string>(String(initial.umbauPct));
  const [nebenkostenPct, setNebenkostenPct] = useState<string>(
    String(initial.nebenkostenPct)
  );
  const [aktiveLps, setAktiveLps] = useState<Set<Leistungsphase>>(
    new Set(initial.beauftragteLps as Leistungsphase[])
  );

  useEffect(() => {
    if (success) {
      push({
        tone: "success",
        title: "HOAI gespeichert",
        body: `Honorarsumme: ${formatEur(success.honorarsummeNettoCents)}`,
      });
    }
  }, [success, push]);

  const validLps = useMemo(() => getValidLps(leistungsbild), [leistungsbild]);
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

  const previewResult = useMemo(() => {
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
  }, [
    leistungsbild,
    zone,
    satz,
    kostenCents,
    filteredAktiveLps,
    umbauPct,
    nebenkostenPct,
  ]);

  const toggleLp = (lp: Leistungsphase): void => {
    setAktiveLps((prev) => {
      const next = new Set(prev);
      if (next.has(lp)) next.delete(lp);
      else next.add(lp);
      return next;
    });
  };

  // Hidden field für Form: LPs als JSON
  const lpsJson = JSON.stringify(
    Array.from(filteredAktiveLps).sort((a, b) => a - b)
  );

  return (
    <form action={formAction} className="mt-10 grid lg:grid-cols-[1fr_360px] gap-8">
      <div className="space-y-6 max-w-xl">
        <input type="hidden" name="id" value={projectId} />
        <input type="hidden" name="hoaiBeauftragteLpsJson" value={lpsJson} />

        {formError ? (
          <div className="rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
            {formError}
          </div>
        ) : null}

        <div>
          <label className={labelClass}>Leistungsbild *</label>
          <select
            name="hoaiLeistungsbild"
            value={leistungsbild}
            onChange={(e) =>
              setLeistungsbild(e.target.value as HoaiLeistungsbild)
            }
            className={inputClass}
            required
          >
            {LB_OPTIONS.map((lb) => (
              <option key={lb} value={lb}>
                {LEISTUNGSBILD_LABEL[lb]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
            {tafel.paragraph} · Bereich {formatEur(tafel.kostenBereichMinCents)} bis{" "}
            {formatEur(tafel.kostenBereichMaxCents)}
          </p>
        </div>

        <div>
          <label className={labelClass}>Anrechenbare Kosten netto (€) *</label>
          <input
            type="text"
            inputMode="decimal"
            name="hoaiAnrechenbareKostenCents"
            value={kostenEur}
            onChange={(e) => setKostenEur(e.target.value)}
            className={inputClass + " font-mono"}
            placeholder="z.B. 500000,00"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Honorarzone *</label>
            <select
              name="hoaiHonorarzone"
              value={zone}
              onChange={(e) => setZone(e.target.value as HoaiHonorarzone)}
              className={inputClass}
              required
            >
              {ZONE_OPTIONS.map((z) => (
                <option key={z} value={z}>
                  {HONORARZONE_LABEL[z]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Honorarsatz *</label>
            <select
              name="hoaiSatz"
              value={satz}
              onChange={(e) => setSatz(e.target.value as HoaiSatz)}
              className={inputClass}
              required
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
          <label className={labelClass}>Beauftragte Leistungsphasen *</label>
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
            {filteredAktiveLps.size} von {validLps.length} LPs ausgewählt
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Umbau-Zuschlag (%)</label>
            <input
              type="number"
              name="hoaiUmbauZuschlagPct"
              min="0"
              max="80"
              step="1"
              value={umbauPct}
              onChange={(e) => setUmbauPct(e.target.value)}
              className={inputClass + " font-mono"}
            />
            <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
              § 6 II Nr. 5 HOAI
            </p>
          </div>
          <div>
            <label className={labelClass}>Nebenkosten (%)</label>
            <input
              type="number"
              name="hoaiNebenkostenPct"
              min="0"
              max="50"
              step="0.5"
              value={nebenkostenPct}
              onChange={(e) => setNebenkostenPct(e.target.value)}
              className={inputClass + " font-mono"}
            />
          </div>
        </div>

        <SubmitButton />
      </div>

      <aside className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-6 self-start sticky top-24">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          Live-Vorschau
        </p>

        {!previewResult ? (
          <p className="mt-4 text-sm text-[color:var(--color-fg-muted)]">
            Mindestens eine LP wählen.
          </p>
        ) : !previewResult.ok ? (
          <p className="mt-4 text-sm text-[color:var(--color-warning)]">
            {previewResult.error.kind === "kosten_unter_min"
              ? `Kosten unter Tafel-Minimum (${formatEur(previewResult.error.minCents)})`
              : previewResult.error.kind === "kosten_ueber_max"
                ? `Kosten über Tafel-Maximum (${formatEur(previewResult.error.maxCents)})`
                : previewResult.error.kind === "ungueltige_lp"
                  ? `LP${previewResult.error.lp} nicht für ${previewResult.error.leistungsbild}`
                  : "Keine LPs"}
          </p>
        ) : (
          <>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--color-accent)]">
              {formatEur(previewResult.result.honorarsummeNettoCents)}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)] font-mono">
              Honorarsumme netto
            </p>

            <div className="mt-5 space-y-1.5 text-xs font-mono">
              <Line
                label={`Vollhonorar`}
                value={formatEur(previewResult.result.vollhonorarCents)}
                muted
              />
              <Line
                label={`Grundhonorar (${(previewResult.result.beauftragterLpAnteil * 100).toFixed(0)} %)`}
                value={formatEur(previewResult.result.grundhonorarCents)}
              />
              {previewResult.result.umbauZuschlagCents > 0 ? (
                <Line
                  label="+ Umbauzuschlag"
                  value={formatEur(previewResult.result.umbauZuschlagCents)}
                />
              ) : null}
              {previewResult.result.nebenkostenCents > 0 ? (
                <Line
                  label="+ Nebenkosten"
                  value={formatEur(previewResult.result.nebenkostenCents)}
                />
              ) : null}
              <div className="border-t border-[color:var(--color-border)] pt-1.5 mt-2">
                <Line
                  label="+ USt 19 %"
                  value={formatEur(
                    Math.round(
                      previewResult.result.honorarsummeNettoCents * 0.19
                    )
                  )}
                  muted
                />
                <Line
                  label="= Brutto"
                  value={formatEur(
                    Math.round(
                      previewResult.result.honorarsummeNettoCents * 1.19
                    )
                  )}
                />
              </div>
            </div>

            {initial.berechnetAm ? (
              <p className="mt-5 text-[10px] text-[color:var(--color-fg-muted)] font-mono">
                Letzte Speicherung:{" "}
                {new Date(initial.berechnetAm).toLocaleDateString("de-DE")}{" "}
                ·{" "}
                {initial.honorarsummeNettoCents !== null
                  ? formatEur(initial.honorarsummeNettoCents)
                  : "—"}
              </p>
            ) : null}
          </>
        )}
      </aside>
    </form>
  );
}

function Line({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between">
      <span className={muted ? "text-[color:var(--color-fg-muted)]" : ""}>
        {label}
      </span>
      <span className={muted ? "text-[color:var(--color-fg-muted)]" : ""}>
        {value}
      </span>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Wird gespeichert …" : "HOAI-Werte speichern"}
    </button>
  );
}
