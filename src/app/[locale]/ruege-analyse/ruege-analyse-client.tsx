"use client";

import { useState } from "react";
import { analyzeRuege, type RuegeAnalysisResult } from "@/lib/ruege-analyze";
import { createVorgangFromRuege } from "./actions";

const SAMPLE = `Sehr geehrter Herr Müller,

bei der heutigen Begehung des Objekts BV-2024-014 (Stadt Lüdenscheid, Treppenhaus 1.OG) wurden mehrere horizontale Risse im Putz festgestellt, ca. 18 m². Wir fordern Sie hiermit auf, die Mängel zu beseitigen.

Die Frist setzen wir auf 5 Werktage ab Zugang dieses Schreibens.

Mit freundlichen Grüßen
Stadt Lüdenscheid · Hochbauamt`;

const LIKELY_CLASSES: Record<string, string> = {
  wahrscheinlich:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  fraglich:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  unwahrscheinlich:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
};

type Project = { id: string; identifier: string; name: string };

export function RuegeAnalyseClient({ projects }: { projects: Project[] }) {
  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [recipientEmail, setRecipientEmail] = useState<string>("");
  const [result, setResult] = useState<RuegeAnalysisResult | null>(null);
  const [copied, setCopied] = useState(false);

  function run() {
    if (text.trim().length < 30) return;
    setResult(analyzeRuege(text));
    setCopied(false);
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.responseDraft).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <section className="grid gap-10 md:grid-cols-3 border-t border-[color:var(--color-border)] pt-10 pb-10">
      <div className="md:col-span-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          Rüge-Text
        </p>
        <textarea
          rows={14}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Eingehende Mangelrüge / AG-Forderung hier einfügen…"
          className="mt-4 w-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:bg-[color:var(--color-bg)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors resize-y font-sans"
        />
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setText(SAMPLE)}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            Beispiel laden
          </button>
          <button
            type="button"
            onClick={run}
            disabled={text.trim().length < 30}
            className="ml-auto inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Analysieren <span aria-hidden>→</span>
          </button>
        </div>
      </div>

      <div className="md:col-span-2">
        {result ? (
          <div className="space-y-7">
            <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3">
              <div className="bg-[color:var(--color-bg)] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
                  Formelle Wirksamkeit
                </p>
                <p
                  className={`mt-3 text-2xl font-semibold tracking-tight ${result.formellPass ? "text-[color:var(--color-fg)]" : "text-[color:var(--color-critical)]"}`}
                >
                  {result.formellPass ? "Wirksam" : "Mängel"}
                </p>
              </div>
              <div className="bg-[color:var(--color-bg)] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
                  Materielle Berechtigung
                </p>
                <span
                  className={`mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-2 py-1 ${LIKELY_CLASSES[result.materiellLikely]}`}
                >
                  {result.materiellLikely}
                </span>
              </div>
              <div className="bg-[color:var(--color-bg)] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
                  Risiko-Score
                </p>
                <p className="mt-3 text-2xl font-semibold tracking-tight">
                  {result.riskScore} / 100
                </p>
              </div>
            </div>

            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                Prüf-Punkte
              </p>
              <ul className="mt-4 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {result.checks.map((c, i) => (
                  <li key={i} className="py-4 flex items-start gap-4">
                    <span
                      className={`shrink-0 mt-0.5 w-5 h-5 rounded-full grid place-items-center text-xs font-mono ${
                        c.pass
                          ? "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]"
                          : "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]"
                      }`}
                    >
                      {c.pass ? "✓" : "✕"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{c.label}</p>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                        {c.detail}
                      </p>
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                        Basis · {c.basis}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <div className="flex items-baseline justify-between gap-3 flex-wrap">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                  Antwort-Vorschlag
                </p>
                <button
                  type="button"
                  onClick={copy}
                  className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
                >
                  {copied ? "✓ Kopiert" : "In Zwischenablage kopieren"}
                </button>
              </div>
              <pre className="mt-3 text-sm text-[color:var(--color-fg)] leading-relaxed whitespace-pre-wrap font-sans bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md p-5">
                {result.responseDraft}
              </pre>
            </div>

            <form
              action={createVorgangFromRuege}
              className="border border-[color:var(--color-accent-soft)] bg-[color:var(--color-bg-subtle)] rounded-md p-5 space-y-4"
            >
              <input type="hidden" name="text" value={text} />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                  Als Vorgang persistieren
                </p>
                <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                  Erzeugt einen Vorgang mit dieser Analyse als ersten Schritt, dem
                  Antwort-Entwurf als E-Mail und Pflicht-Citation auf § 13 Abs. 5 VOB/B.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
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
                <label className="block">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                    Empfänger E-Mail (optional)
                  </span>
                  <input
                    name="recipientEmail"
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="ag@beispiel.de"
                    className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
                  />
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
            <p className="text-4xl">📨</p>
            <h2 className="mt-4 text-2xl font-semibold tracking-tighter">
              Rüge-Text einfügen
            </h2>
            <p className="mt-3 max-w-md mx-auto text-sm text-[color:var(--color-fg-muted)]">
              Tool prüft Mangel-Bezeichnung, Frist-Angemessenheit, Schriftform und
              Beweislast — und entwirft eine sofort sendbare Antwort mit
              Beweissicherungs-Hinweisen.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
