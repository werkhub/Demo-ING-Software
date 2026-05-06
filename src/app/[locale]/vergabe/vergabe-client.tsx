"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import {
  analyzeTender,
  SAMPLE_TENDER_TEXT,
  type TenderAnalysisResult,
} from "@/lib/vergabe/analyze";
import { detectPlatformFromUrl } from "@/lib/vergabe/platforms";
import { createVorgangFromTender } from "./actions";

type Project = { id: string; identifier: string; name: string };

type FileMeta = { name: string; sizeBytes: number; mimeType?: string };

export type Prefill = {
  url: string;
  text: string;
  sourceTitle: string;
} | null;

const DECISION_CLASSES: Record<string, string> = {
  ja: "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  pruefen:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  nein: "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
};

const DECISION_LABEL: Record<string, string> = {
  ja: "Bieten",
  pruefen: "Bedingt — prüfen",
  nein: "Eher ablehnen",
};

const RISK_CLASSES: Record<string, string> = {
  high: "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]",
  medium:
    "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  info: "border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)]",
};

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} kB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
}

export function VergabeClient({
  projects,
  prefill,
}: {
  projects: Project[];
  prefill?: Prefill;
}) {
  const [url, setUrl] = useState(prefill?.url ?? "");
  const [text, setText] = useState(prefill?.text ?? "");
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [projectId, setProjectId] = useState("");
  const [result, setResult] = useState<TenderAnalysisResult | null>(null);

  // Bei Prefill (Aufruf aus dem Radar): Analyse direkt nach Mount triggern,
  // damit der User sofort das Ergebnis sieht.
  useEffect(() => {
    if (prefill) {
      setResult(
        analyzeTender({
          url: prefill.url || null,
          text: prefill.text || null,
          files: [],
        })
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const platformPreview = useMemo(
    () => (url ? detectPlatformFromUrl(url) : null),
    [url]
  );

  const canAnalyze = url.trim().length > 0 || text.trim().length >= 50 || files.length > 0;

  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const list = e.target.files;
    if (!list) return;
    const meta: FileMeta[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list.item(i);
      if (!f) continue;
      meta.push({ name: f.name, sizeBytes: f.size, mimeType: f.type });
    }
    setFiles((prev) => [...prev, ...meta]);
  }

  function removeFile(idx: number) {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  function loadSample() {
    setText(SAMPLE_TENDER_TEXT);
    setUrl("https://www.dtvp.de/Center/notice/CXP4YVDDXNK/");
    setFiles([
      { name: "211_Aufforderung.pdf", sizeBytes: 142_000, mimeType: "application/pdf" },
      { name: "214_BVB.pdf", sizeBytes: 88_000, mimeType: "application/pdf" },
      { name: "215_ZVB.pdf", sizeBytes: 76_000, mimeType: "application/pdf" },
      { name: "LV.X83", sizeBytes: 31_000, mimeType: "application/xml" },
      { name: "Lageplan.pdf", sizeBytes: 1_240_000, mimeType: "application/pdf" },
    ]);
  }

  function clearAll() {
    setUrl("");
    setText("");
    setFiles([]);
    setResult(null);
  }

  function run() {
    if (!canAnalyze) return;
    setResult(
      analyzeTender({
        url: url.trim() || null,
        text: text.trim() || null,
        files,
      })
    );
  }

  return (
    <section className="border-t border-[color:var(--color-border)] pt-10 pb-10 grid gap-10 md:grid-cols-3">
      {/* ---------- Input ---------- */}
      <div className="md:col-span-1 space-y-6">
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] block mb-2">
            Plattform-URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.dtvp.de/…"
            className="w-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:bg-[color:var(--color-bg)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
          />
          {platformPreview ? (
            <p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">
              Erkannt: <span className="text-[color:var(--color-fg)]">{platformPreview.label}</span>
              <span className="block mt-1 text-[11px]">{platformPreview.hint}</span>
            </p>
          ) : url ? (
            <p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">
              Plattform nicht erkannt — Analyse läuft trotzdem.
            </p>
          ) : null}
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] block mb-2">
            Aufforderung / BVB / ZVB einfügen
          </label>
          <textarea
            rows={12}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Text aus Aufforderung zur Angebotsabgabe, BVB, ZVB oder Vorbemerkungen LV…"
            className="w-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:bg-[color:var(--color-bg)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors resize-y font-sans"
          />
        </div>

        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] block mb-2">
            Unterlagen (optional)
          </label>
          <input
            type="file"
            multiple
            onChange={onFileChange}
            className="block w-full text-xs text-[color:var(--color-fg-muted)] file:mr-3 file:py-2 file:px-3 file:rounded-md file:border file:border-[color:var(--color-border)] file:bg-[color:var(--color-bg-subtle)] file:text-[color:var(--color-fg)] file:text-xs file:font-medium hover:file:bg-[color:var(--color-bg)] file:cursor-pointer"
          />
          <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
            In dieser Demo wird nur Dateiname + Größe ausgewertet (kein Upload). Volltext-Extraktion folgt in Phase 1.
          </p>
          {files.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {files.map((f, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 text-xs border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] rounded-md px-3 py-1.5"
                >
                  <span className="truncate">{f.name}</span>
                  <span className="font-mono text-[10px] text-[color:var(--color-fg-muted)] shrink-0">
                    {formatBytes(f.sizeBytes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label="Datei entfernen"
                    className="text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={loadSample}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            Beispiel laden
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            Leeren
          </button>
          <button
            type="button"
            onClick={run}
            disabled={!canAnalyze}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Analysieren <span aria-hidden>→</span>
          </button>
        </div>
      </div>

      {/* ---------- Result ---------- */}
      <div className="md:col-span-2">
        {result ? (
          <div className="space-y-8">
            {/* Bid/No-Bid Hero */}
            <div className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg)] p-5 grid gap-px md:grid-cols-3 bg-[color:var(--color-border)] overflow-hidden">
              <div className="bg-[color:var(--color-bg)] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
                  Empfehlung
                </p>
                <span
                  className={`mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-2 py-1 ${DECISION_CLASSES[result.bid.decision]}`}
                >
                  {DECISION_LABEL[result.bid.decision]}
                </span>
              </div>
              <div className="bg-[color:var(--color-bg)] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
                  Bid-Score
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {result.bid.score} / 100
                </p>
              </div>
              <div className="bg-[color:var(--color-bg)] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
                  Plattform
                </p>
                <p className="mt-3 text-sm">
                  {result.platform ? result.platform.label : "—"}
                </p>
              </div>
            </div>

            {(result.bid.reasons.length > 0 || result.bid.warnings.length > 0) && (
              <div className="grid md:grid-cols-2 gap-4">
                {result.bid.reasons.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-success)] mb-2">
                      Pro
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {result.bid.reasons.map((r, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[color:var(--color-success)] shrink-0">+</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.bid.warnings.length > 0 && (
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)] mb-2">
                      Contra / Warnungen
                    </p>
                    <ul className="space-y-1.5 text-sm">
                      {result.bid.warnings.map((w, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-[color:var(--color-warning)] shrink-0">⚠</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Eckdaten */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                Eckdaten
              </p>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {result.facts.map((f) => (
                  <div key={f.key} className="flex justify-between gap-3 border-b border-[color:var(--color-border)] py-2">
                    <dt className="text-[color:var(--color-fg-muted)] text-xs">{f.label}</dt>
                    <dd className={f.value ? "text-[color:var(--color-fg)] text-right" : "text-[color:var(--color-fg-muted)] italic text-right"}>
                      {f.value ?? "—"}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* Fristen */}
            {result.deadlines.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                  Fristen ({result.deadlines.length})
                </p>
                <ul className="border border-[color:var(--color-border)] rounded-md divide-y divide-[color:var(--color-border)]">
                  {result.deadlines.map((d, i) => (
                    <li key={i} className="px-4 py-3 flex justify-between items-baseline gap-3 flex-wrap">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{d.label}</p>
                        <p className="text-xs text-[color:var(--color-fg-muted)] mt-0.5 break-words">
                          {d.raw}
                        </p>
                      </div>
                      <span className="font-mono text-[11px] text-[color:var(--color-accent)] shrink-0">
                        {d.isoDate ?? "—"}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Eignung */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                Eignungskriterien
              </p>
              <ul className="space-y-2">
                {result.eligibility.map((c, i) => (
                  <li key={i} className="border border-[color:var(--color-border)] rounded-md px-4 py-3 bg-[color:var(--color-bg)]">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <p className="text-sm font-medium">{c.label}</p>
                      <span className={`font-mono text-[10px] uppercase tracking-[0.18em] ${c.required ? "text-[color:var(--color-warning)]" : "text-[color:var(--color-fg-muted)]"}`}>
                        {c.required ? "gefordert" : "optional / üblich"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">{c.detail}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* Zuschlag */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                Zuschlagskriterien
              </p>
              <ul className="space-y-2">
                {result.award.map((a, i) => (
                  <li key={i} className="border border-[color:var(--color-border)] rounded-md px-4 py-3 bg-[color:var(--color-bg)] flex items-baseline justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{a.label}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--color-fg-muted)]">{a.detail}</p>
                    </div>
                    {a.weightPercent !== null && (
                      <span className="font-mono text-sm text-[color:var(--color-accent)] shrink-0">
                        {a.weightPercent} %
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Risiken */}
            {result.risks.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                  Vertrags-Risiken ({result.risks.length})
                </p>
                <ul className="space-y-3">
                  {result.risks.map((r, i) => (
                    <li key={i} className={`border rounded-md px-4 py-3 ${RISK_CLASSES[r.level]}`}>
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold">{r.title}</p>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">{r.level}</span>
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">{r.detail}</p>
                      <p className="mt-1 font-mono text-[10px] text-[color:var(--color-fg-muted)]">Basis · {r.basis}</p>
                      {r.snippet && (
                        <p className="mt-2 font-mono text-[11px] text-[color:var(--color-fg)] bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-sm px-2 py-1 break-words">
                          {r.snippet}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Doc Types */}
            {result.documentTypes.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                  Erkannte Dokumente
                </p>
                <ul className="flex flex-wrap gap-2">
                  {result.documentTypes.map((d, i) => (
                    <li key={i} className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] rounded-sm px-2 py-1">
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Persist */}
            <form
              action={createVorgangFromTender}
              className="border border-[color:var(--color-accent-soft)] bg-[color:var(--color-bg-subtle)] rounded-md p-5 space-y-4"
            >
              <input type="hidden" name="url" value={url} />
              <input type="hidden" name="text" value={text} />
              <input type="hidden" name="filesJson" value={JSON.stringify(files)} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                  Als Vorgang persistieren
                </p>
                <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                  Erzeugt einen Vorgang mit dieser Analyse als ersten Schritt, übernimmt
                  erkannte Fristen und verlinkt auf das gewählte Projekt.
                </p>
              </div>
              <div>
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                    Projekt (optional)
                  </span>
                  <select
                    name="projectId"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
                  >
                    <option value="">—</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.identifier} · {p.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] text-white px-5 py-2 text-sm hover:bg-[color:var(--color-fg)] transition-colors"
              >
                In Vorgang überführen <span aria-hidden>→</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-12 text-center">
            <p className="text-4xl">📑</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tighter">
              Ausschreibung scannen
            </h2>
            <p className="mt-3 max-w-md mx-auto text-sm text-[color:var(--color-fg-muted)]">
              URL einer Vergabe-Plattform, BVB-/Aufforderungs-Text oder
              Unterlagen einfügen — Analyse läuft komplett clientseitig
              (DTVP, eVergabe, TED, Subreport, Bayern, NRW erkannt).
            </p>
            <p className="mt-4 text-xs text-[color:var(--color-fg-muted)]">
              <button
                type="button"
                onClick={loadSample}
                className="underline underline-offset-2 hover:text-[color:var(--color-accent)] transition-colors"
              >
                Beispiel laden
              </button>{" "}
              · Stadt Lüdenscheid · Dachsanierung Sporthalle · 480 k€
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
