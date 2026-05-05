"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Container } from "@/components/container";
import { useToast } from "@/components/ui/toast";
import { BEWEIS_SCENARIOS } from "@/lib/beweis-scenarios";
import { saveBeweisChecklist } from "./actions";

type Project = { id: string; identifier: string; name: string };
type ExistingChecklist = {
  projectId: string;
  anlass: string;
  checksState: string;
  notes: string | null;
};

type ChecksByKey = Record<string, Record<string, boolean>>;

function buildKey(projectId: string, anlass: string): string {
  return `${projectId}::${anlass}`;
}

export function BeweisClient({
  projects,
  existing,
}: {
  projects: Project[];
  existing: ExistingChecklist[];
}) {
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [anlass, setAnlass] = useState<string>(BEWEIS_SCENARIOS[0]?.id ?? "mangel");

  // Initial state aus DB-Daten aufbauen
  const initialChecks: ChecksByKey = useMemo(() => {
    const out: ChecksByKey = {};
    for (const e of existing) {
      try {
        out[buildKey(e.projectId, e.anlass)] = JSON.parse(e.checksState);
      } catch {
        out[buildKey(e.projectId, e.anlass)] = {};
      }
    }
    return out;
  }, [existing]);

  const [allChecks, setAllChecks] = useState<ChecksByKey>(initialChecks);
  const [pending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { push } = useToast();

  const currentKey = buildKey(projectId, anlass);
  const checks = allChecks[currentKey] ?? {};
  const scenario = useMemo(
    () => BEWEIS_SCENARIOS.find((s) => s.id === anlass)!,
    [anlass]
  );

  function persistDebounced(nextChecks: Record<string, boolean>) {
    if (!projectId) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("anlass", anlass);
      fd.set("checksState", JSON.stringify(nextChecks));
      startTransition(async () => {
        const res = await saveBeweisChecklist(null, fd);
        if (!res.ok) {
          push({
            tone: "critical",
            title: "Speichern fehlgeschlagen",
            body: res.formError ?? "Bitte erneut versuchen.",
          });
        }
      });
    }, 600);
  }

  function toggle(itemId: string) {
    if (!projectId) return;
    const nextChecks = { ...checks, [itemId]: !checks[itemId] };
    setAllChecks((prev) => ({ ...prev, [currentKey]: nextChecks }));
    persistDebounced(nextChecks);
  }

  function reset() {
    if (!projectId) return;
    if (!confirm("Alle Häkchen für dieses Szenario zurücksetzen?")) return;
    setAllChecks((prev) => ({ ...prev, [currentKey]: {} }));
    persistDebounced({});
  }

  const total = scenario.items.length;
  const criticalTotal = scenario.items.filter((i) => i.critical).length;
  const done = scenario.items.filter((i) => checks[i.id]).length;
  const criticalDone = scenario.items.filter((i) => i.critical && checks[i.id]).length;

  if (projects.length === 0) {
    return (
      <Container>
        <section className="pt-14 pb-16">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Beweissicherung
          </p>
          <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
            Noch kein Projekt
          </h1>
          <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
            Beweissicherung wird pro Projekt geführt. Lege zuerst ein Projekt an.
          </p>
        </section>
      </Container>
    );
  }

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Projekt-Werkzeug
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Beweissicherung
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Vor jedem riskanten Vorgang die richtigen Beweise sichern. BGH-konforme
          Checklisten — pro Projekt + Anlass gespeichert, automatisch synchron
          zwischen Geräten.
        </p>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="projectId"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
            >
              Projekt
            </label>
            <select
              id="projectId"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.identifier} · {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="anlass"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
            >
              Anlass
            </label>
            <select
              id="anlass"
              value={anlass}
              onChange={(e) => setAnlass(e.target.value)}
              className="w-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
            >
              {BEWEIS_SCENARIOS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="pb-10">
        <div className="border border-[color:var(--color-border)] rounded-md p-5 bg-[color:var(--color-bg-subtle)]">
          <h2 className="text-lg font-semibold tracking-tight">{scenario.title}</h2>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
            {scenario.intro}
          </p>
          <div className="mt-4 flex items-center gap-4 flex-wrap">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
              <span className="text-[color:var(--color-fg)]">{done}/{total}</span>{" "}
              <span className="text-[color:var(--color-fg-muted)]">erledigt</span>
            </p>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em]">
              <span
                className={
                  criticalDone < criticalTotal
                    ? "text-[color:var(--color-critical)]"
                    : "text-[color:var(--color-success)]"
                }
              >
                {criticalDone}/{criticalTotal}
              </span>{" "}
              <span className="text-[color:var(--color-fg-muted)]">kritisch</span>
            </p>
            <span className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
              {pending ? "Speichere …" : "Auto-Save aktiv"}
            </span>
            <button
              type="button"
              onClick={reset}
              className="ml-auto text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
            >
              Zurücksetzen
            </button>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
          {scenario.items.map((item) => {
            const isChecked = !!checks[item.id];
            return (
              <li key={item.id} className="py-4">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggle(item.id)}
                    className="mt-1 accent-[color:var(--color-accent)]"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span
                        className={
                          isChecked
                            ? "text-sm text-[color:var(--color-fg-muted)] line-through"
                            : "text-sm text-[color:var(--color-fg)] font-medium"
                        }
                      >
                        {item.title}
                      </span>
                      {item.critical ? (
                        <span className="font-mono text-[9px] uppercase tracking-[0.18em] border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-sm px-1.5 py-0.5">
                          Kritisch
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                      {item.detail}
                    </p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                      {item.basis}
                    </p>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      </section>
    </Container>
  );
}
