"use client";

import { useState, useTransition, useRef } from "react";
import { ExternalLink } from "lucide-react";
import { SCENARIOS, type Scenario } from "@/lib/data";
import { timeAgo } from "@/lib/utils";
import { RdgFooterNote } from "@/components/rdg-footer-note";
import { useToast } from "@/components/ui/toast";
import { buildVobDeepLinks } from "@/lib/legal/external-providers";
import type { VobPreferredExternalProvider } from "@/db/schema";
import { createQuery } from "./actions";

type HistoryItem = {
  id: string;
  question: string;
  category: string | null;
  response: string | null;
  createdAt: Date;
};

type VobRef = { source: "vob_a" | "vob_b" | "vob_c"; slug: string };

function vobRefFromLabel(label: string): VobRef | null {
  // VOB/A oder VOB/B mit Paragraf, optional „EU"/„VS"-Suffix für Abschnitt 2/3:
  //   "VOB/B § 13 Abs. 5" → vob_b, "13"
  //   "VOB/A § 3a"        → vob_a, "3a"
  //   "VOB/A § 10 EU"     → vob_a, "10-eu"
  //   "VOB/A § 1 VS"      → vob_a, "1-vs"
  const paragraf = /^VOB\/([AB])\s*§\s*(\d+[a-z]?)(?:\s*(EU|VS))?/i.exec(label);
  if (paragraf) {
    const part = paragraf[1].toUpperCase();
    const num = paragraf[2].toLowerCase();
    const suffix = paragraf[3]?.toLowerCase();
    return {
      source: part === "A" ? "vob_a" : "vob_b",
      slug: suffix ? `${num}-${suffix}` : num,
    };
  }
  // VOB/C ATV: "DIN 18331" → "din-18331"
  const din = /^DIN\s*(\d{5})/i.exec(label);
  if (din) {
    return { source: "vob_c", slug: `din-${din[1]}` };
  }
  return null;
}

type ProjectOption = { id: string; identifier: string; name: string };

export function AssistantClient({
  history,
  vobPreferred,
  projects,
  defaultProjectId,
}: {
  history: HistoryItem[];
  vobPreferred: VobPreferredExternalProvider;
  projects: ProjectOption[];
  defaultProjectId?: string | null;
}) {
  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState<string>(defaultProjectId ?? "");
  const [active, setActive] = useState<Scenario | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const taRef = useRef<HTMLTextAreaElement>(null);
  const { push } = useToast();

  function pickScenario(s: Scenario) {
    setActive(s);
    setText(s.q);
    setError(null);
    taRef.current?.focus();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const q = text.trim();
    if (q.length < 5) {
      setError("Bitte mindestens 5 Zeichen eingeben.");
      return;
    }
    const fd = new FormData();
    fd.set("question", q);
    if (projectId) fd.set("projectId", projectId);
    startTransition(async () => {
      const result = await createQuery(null, fd);
      if (!result.ok) {
        const msg =
          result.formError ??
          result.fieldErrors?.question?.[0] ??
          "Fehler beim Speichern.";
        setError(msg);
        return;
      }
      setText("");
      setActive(null);
      push({
        tone: "success",
        title: "Anfrage gespeichert",
        body: `Kategorie: ${result.data.category}.`,
      });
    });
  }

  return (
    <>
      <section className="grid gap-10 md:grid-cols-3 pb-10 border-t border-[color:var(--color-border)] pt-10">
        <aside>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            Standardfälle
          </p>
          <p className="mt-3 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
            Klick auf einen Fall — oder formuliere unten eine eigene Situation.
          </p>
          <ul className="mt-6 divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {SCENARIOS.map((s, i) => {
              const isActive = active?.q === s.q;
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => pickScenario(s)}
                    className={`w-full text-left py-4 group transition-colors ${
                      isActive ? "bg-[color:var(--color-bg-subtle)] -mx-3 px-3 rounded-md" : ""
                    }`}
                  >
                    <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                      {s.norm}
                    </div>
                    <div className="mt-2 text-sm text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                      {s.q}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="md:col-span-2 flex flex-col">
          {active ? (
            <ScenarioDetail
              s={active}
              onClose={() => setActive(null)}
              vobPreferred={vobPreferred}
            />
          ) : (
            <div className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-12 text-center">
              <h2 className="text-2xl font-semibold tracking-tighter">
                Wie kann ich dir helfen, Thomas?
              </h2>
              <p className="mt-3 max-w-md mx-auto text-sm text-[color:var(--color-fg-muted)]">
                Beschreibe deinen Fall in Alltagssprache. Die KI antwortet mit Norm, Pro/Contra
                und konkreten Handlungsschritten — jede Aussage mit Paragraph- und Aktenzeichen-Beleg.
              </p>
            </div>
          )}

          <form onSubmit={onSubmit} className="mt-6 border-t border-[color:var(--color-border)] pt-4 space-y-3">
            {projects.length > 0 ? (
              <div className="flex items-center gap-2 flex-wrap">
                <label
                  htmlFor="projectId"
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]"
                >
                  Projektbezug (optional)
                </label>
                <select
                  id="projectId"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={pending}
                  className="bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
                >
                  <option value="">— Allgemein —</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.identifier} · {p.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex items-end gap-2">
              <textarea
                ref={taRef}
                rows={2}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Beschreibe deinen Fall — z. B. „AG verweigert Abnahme wegen Bagatelle“…"
                className="flex-1 bg-transparent border-b border-[color:var(--color-border)] focus:border-[color:var(--color-accent)] text-base resize-none focus:outline-none py-2 placeholder:text-[color:var(--color-fg-muted)] transition-colors"
                disabled={pending}
              />
              <button
                type="submit"
                disabled={pending || text.trim().length < 5}
                className="rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-sm w-10 h-10 grid place-items-center transition-colors shrink-0"
                aria-label="Frage senden"
              >
                {pending ? "…" : "↑"}
              </button>
            </div>
          </form>
          {error && (
            <p className="mt-2 text-xs text-[color:var(--color-critical)] font-mono">{error}</p>
          )}
          {pending && (
            <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] font-mono">
              Speichere Anfrage…
            </p>
          )}
        </div>
      </section>

      {history.length > 0 && (
        <section className="border-t border-[color:var(--color-border)] pt-10 pb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-5">
            Verlauf · {history.length} Anfrage{history.length === 1 ? "" : "n"}
          </p>
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {history.map((h) => (
              <li key={h.id} className="py-5">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                    {h.category ?? "Allgemein"}
                  </div>
                  <div className="text-xs text-[color:var(--color-fg-muted)]">
                    {timeAgo(h.createdAt)}
                  </div>
                </div>
                <p className="mt-2 text-sm font-medium text-[color:var(--color-fg)] leading-snug">
                  {h.question}
                </p>
                {h.response && (
                  <details className="mt-3 group">
                    <summary className="cursor-pointer text-xs font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors">
                      Antwort anzeigen ▾
                    </summary>
                    <pre className="mt-3 text-xs text-[color:var(--color-fg-muted)] leading-relaxed whitespace-pre-wrap font-sans bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md p-4">
                      {h.response}
                    </pre>
                    <RdgFooterNote className="mt-2" />
                  </details>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function ScenarioDetail({
  s,
  onClose,
  vobPreferred,
}: {
  s: Scenario;
  onClose: () => void;
  vobPreferred: VobPreferredExternalProvider;
}) {
  return (
    <div className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-7">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          Standardfall · KI-Antwort (Mock)
        </p>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
        >
          ✕ Schließen
        </button>
      </div>
      <h2 className="mt-3 text-xl md:text-2xl font-semibold tracking-tight leading-snug">
        {s.q}
      </h2>
      <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg)]">
        Einschlägige Norm · {s.norm}
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-success)]">
            Pro
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[color:var(--color-fg-muted)]">
            {s.pros.map((p, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[color:var(--color-success)] shrink-0">+</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-critical)]">
            Contra
          </p>
          <ul className="mt-3 space-y-2 text-sm text-[color:var(--color-fg-muted)]">
            {s.cons.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className="text-[color:var(--color-critical)] shrink-0">−</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-[color:var(--color-border)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          Konkrete Handlungsschritte
        </p>
        <ol className="mt-3 space-y-2 text-sm text-[color:var(--color-fg)]">
          {s.actions.map((a, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-xs text-[color:var(--color-fg-muted)] shrink-0 w-5 text-right">
                {i + 1}.
              </span>
              <span>{a}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="mt-6 pt-5 border-t border-[color:var(--color-border)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          Quellen
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {s.sources.map((src, i) => {
            const vobRef = vobRefFromLabel(src.label);
            const vobLinks = vobRef
              ? buildVobDeepLinks(vobRef.source, vobRef.slug, vobPreferred)
              : null;
            const primaryVobLink = vobLinks?.find((l) => l.isPreferred) ?? vobLinks?.[0];
            return (
              <li
                key={i}
                className="flex gap-3 items-start border border-[color:var(--color-border)] rounded-md p-3 bg-[color:var(--color-bg)]"
              >
                <span className="text-base shrink-0">{src.type}</span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs font-medium tracking-tight">
                    {src.label}
                  </div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-0.5">
                    {src.meta}
                  </div>
                  {primaryVobLink ? (
                    <a
                      href={primaryVobLink.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline inline-flex items-center gap-1"
                    >
                      Volltext bei {primaryVobLink.provider.shortLabel}
                      <ExternalLink size={10} aria-hidden />
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="mt-6 pt-4 border-t border-[color:var(--color-border)] space-y-1">
        <p className="text-[11px] text-[color:var(--color-fg-muted)]">
          Mock-Antwort aus Standardfall-Bibliothek. „Senden“ unten speichert die Frage in deiner Anfragen-Historie.
        </p>
        <RdgFooterNote />
      </div>
    </div>
  );
}
