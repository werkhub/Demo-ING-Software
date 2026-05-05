"use client";

import { useEffect, useMemo, useState } from "react";
import { Container } from "@/components/container";
import { useToast } from "@/components/ui/toast";
import {
  VORLAGEN,
  extractPlaceholders,
  fillTemplate,
  type Vorlage,
} from "@/lib/vorlagen";
import { formatDateShort } from "@/lib/utils";
import { ROLE_META } from "@/lib/roles";
import type { WorkspaceRole } from "@/db/schema";

type ProjectMin = {
  id: string;
  identifier: string;
  name: string;
  ag: string | null;
  siteAddress: string | null;
  contractDate: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  rüge_antwort: "Rüge-Antwort (AN)",
  rüge_setzen: "Mängel rügen (AG)",
  behinderung: "Behinderung",
  bedenken: "Bedenkenanmeldung",
  nachtrag: "Nachtrag / Mehrkosten",
  anordnung: "Anordnung erteilen",
  abnahme: "Abnahme",
  kuendigung: "Kündigung",
  schluss: "Schlussabrechnung",
  vertragsstrafe: "Vertragsstrafe",
};

function buildBaseVars(
  project: ProjectMin | null,
  authorName: string,
  authorRole: string | null,
  operatorName: string
): Record<string, string> {
  const today = new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const warrantyYears = "5";

  return {
    today,
    warranty_years: warrantyYears,
    operator_legal_name: operatorName,
    author_name: authorName,
    author_role: authorRole ?? "",
    bv_nummer: project?.identifier ?? "",
    project_name: project?.name ?? "",
    ag_name: project?.ag ?? "",
    ag_address: "",
    site_address: project?.siteAddress ?? "",
    contract_date: project?.contractDate
      ? formatDateShort(project.contractDate)
      : "",
    an_name: project?.ag ?? "",
  };
}

export function VorlagenClient({
  projects,
  authorName,
  authorRole,
  operatorName,
  workspaceRole,
}: {
  projects: ProjectMin[];
  authorName: string;
  authorRole: string | null;
  operatorName: string;
  workspaceRole: WorkspaceRole;
}) {
  const roleMeta = ROLE_META[workspaceRole];
  const [showAll, setShowAll] = useState(false);

  const visibleVorlagen = useMemo(() => {
    if (showAll) return VORLAGEN;
    return VORLAGEN.filter((v) => v.roles.includes(workspaceRole));
  }, [showAll, workspaceRole]);

  const [active, setActive] = useState<Vorlage>(
    visibleVorlagen[0] ?? VORLAGEN[0]
  );
  const [projectId, setProjectId] = useState<string>(projects[0]?.id ?? "");
  const [extras, setExtras] = useState<Record<string, string>>({});
  const { push } = useToast();

  // Wenn aktive Vorlage nicht mehr in der gefilterten Liste ist (Toggle gewechselt),
  // auf erstes verfügbares Element zurückspringen.
  useEffect(() => {
    if (visibleVorlagen.length > 0 && !visibleVorlagen.some((v) => v.id === active.id)) {
      setActive(visibleVorlagen[0]);
      setExtras({});
    }
  }, [visibleVorlagen, active.id]);

  const project = useMemo(
    () => projects.find((p) => p.id === projectId) ?? null,
    [projectId, projects]
  );

  const baseVars = useMemo(
    () => buildBaseVars(project, authorName, authorRole, operatorName),
    [project, authorName, authorRole, operatorName]
  );

  const placeholders = useMemo(
    () => extractPlaceholders(active.body),
    [active]
  );

  const extraPlaceholders = useMemo(
    () => placeholders.filter((p) => !(p in baseVars)),
    [placeholders, baseVars]
  );

  const filled = useMemo(
    () => fillTemplate(active.body, { ...baseVars, ...extras }),
    [active.body, baseVars, extras]
  );

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(filled);
      push({ tone: "success", title: "In Zwischenablage kopiert" });
    } catch {
      push({ tone: "critical", title: "Kopieren fehlgeschlagen" });
    }
  }

  function pickVorlage(v: Vorlage) {
    setActive(v);
    setExtras({});
  }

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Bibliothek · Korrespondenz-Vorlagen
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Vorlagen
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Vorausgefüllte Schreiben für typische Bau-Korrespondenz. Standard-Felder
          werden aus dem gewählten Projekt befüllt — die übrigen Platzhalter
          ergänzt du manuell.
        </p>
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] rounded-sm px-2 py-1">
            Rolle: {roleMeta.shortLabel} · {roleMeta.label}
          </span>
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors underline-offset-2 hover:underline"
          >
            {showAll
              ? `Nur ${roleMeta.shortLabel}-Vorlagen zeigen`
              : "Alle Vorlagen anzeigen"}
          </button>
        </div>
      </section>

      <section className="grid gap-10 md:grid-cols-3 pb-16">
        {/* Linke Spalte: Liste */}
        <aside className="md:col-span-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
            {visibleVorlagen.length} {visibleVorlagen.length === 1 ? "Vorlage" : "Vorlagen"}
          </p>
          {visibleVorlagen.length === 0 ? (
            <p className="text-sm text-[color:var(--color-fg-muted)] py-8 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
              Keine Vorlage für diese Rolle. Klick auf „Alle Vorlagen anzeigen“.
            </p>
          ) : null}
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {visibleVorlagen.map((v) => {
              const isActive = v.id === active.id;
              return (
                <li key={v.id}>
                  <button
                    type="button"
                    onClick={() => pickVorlage(v)}
                    className={`w-full text-left py-3 group transition-colors ${
                      isActive
                        ? "bg-[color:var(--color-bg-subtle)] -mx-3 px-3 rounded-md"
                        : ""
                    }`}
                  >
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                      {CATEGORY_LABEL[v.category] ?? v.category}
                    </span>
                    <p
                      className={`mt-1 text-sm ${
                        isActive
                          ? "text-[color:var(--color-fg)] font-medium"
                          : "text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)]"
                      } transition-colors`}
                    >
                      {v.title}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                      {v.legalBasis}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        {/* Rechte Spalte: Editor + Preview */}
        <div className="md:col-span-2 space-y-6">
          <div className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
              {CATEGORY_LABEL[active.category] ?? active.category}
            </p>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
              {active.title}
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              {active.description}
            </p>
            <p className="mt-3 font-mono text-[11px] text-[color:var(--color-fg-muted)]">
              Rechtliche Basis: <span className="text-[color:var(--color-fg)]">{active.legalBasis}</span>
            </p>
          </div>

          {projects.length > 0 ? (
            <div>
              <label
                htmlFor="projectId"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
              >
                Projekt-Daten einsetzen
              </label>
              <select
                id="projectId"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
              >
                <option value="">— Ohne Projekt — manuell ausfüllen</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.identifier} · {p.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {extraPlaceholders.length > 0 ? (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-3">
                Zusätzliche Felder ({extraPlaceholders.length})
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {extraPlaceholders.map((p) => (
                  <div key={p}>
                    <label
                      htmlFor={`extra-${p}`}
                      className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
                    >
                      {p}
                    </label>
                    <input
                      id={`extra-${p}`}
                      type="text"
                      value={extras[p] ?? ""}
                      onChange={(e) =>
                        setExtras((prev) => ({ ...prev, [p]: e.target.value }))
                      }
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-1.5 text-sm font-mono text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                Vorschau · ausgefüllter Text
              </p>
              <button
                type="button"
                onClick={copyToClipboard}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                In Zwischenablage kopieren
              </button>
            </div>
            <pre className="whitespace-pre-wrap text-[13px] leading-[1.6] font-sans text-[color:var(--color-fg)] bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md p-5">
              {filled}
            </pre>
            <p className="mt-3 text-[11px] italic text-[color:var(--color-fg-muted)]">
              Information, keine Rechtsberatung i.S.d. RDG. Vor Versand
              eigenverantwortlich prüfen — Standardvorlage, kein Endprodukt.
            </p>
          </div>
        </div>
      </section>
    </Container>
  );
}
