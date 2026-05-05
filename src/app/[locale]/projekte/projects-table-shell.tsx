/**
 * Client-Wrapper um die server-gerenderte Projekt-Tabelle.
 *
 * Übernimmt:
 *   - Spalten-Konfigurator (Sichtbarkeit, persistiert in localStorage)
 *   - CSV-Export-Link (der Server-Route bekommt die aktuellen Filter via URL mit)
 *
 * Strategie: Server rendert IMMER alle Spalten (mit data-col="…" Attribut auf
 * jedem th/td). Der Wrapper injiziert ein <style>-Block, der ausgeblendete
 * Spalten via `[data-col="x"] { display: none }` versteckt — kein Re-Render
 * der Tabelle nötig. SSR und Hydration sehen identische Markups; das Style-
 * Element wird erst nach Mount aus localStorage gefüllt.
 */
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  Clock,
  Columns3,
  Download,
  FileWarning,
  Lock,
  ShieldAlert,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export type ColumnId =
  | "identifier"
  | "name"
  | "ag"
  | "status"
  | "contract"
  | "termine"
  | "value"
  | "nachtraege"
  | "securities"
  | "nu"
  | "risk"
  | "fristen"
  | "contacts"
  | "progress";

type ColumnDef = {
  id: ColumnId;
  label: string;
  group: string;
  required?: boolean;
};

const COLUMNS: ColumnDef[] = [
  { id: "identifier", label: "BV-Nr.", group: "Stamm", required: true },
  { id: "name", label: "Projekt", group: "Stamm", required: true },
  { id: "ag", label: "Auftraggeber", group: "Stamm" },
  { id: "status", label: "Status", group: "Stamm", required: true },
  { id: "contract", label: "Vertrag", group: "Vertrag · Termine" },
  { id: "termine", label: "Termine (Plan/Abnahme/Gewährleistung)", group: "Vertrag · Termine" },
  { id: "value", label: "Auftragsvolumen / HOAI", group: "Finanzen" },
  { id: "nachtraege", label: "Nachträge offen", group: "Finanzen" },
  { id: "securities", label: "Sicherheiten aktiv", group: "Finanzen" },
  { id: "nu", label: "NU · Compliance", group: "Risiko" },
  { id: "risk", label: "Vertrags-Risk-Score", group: "Risiko" },
  { id: "fristen", label: "Fristen / nächste Frist", group: "Risiko" },
  { id: "contacts", label: "Zuständigkeiten", group: "Beteiligte" },
  { id: "progress", label: "Fortschritt", group: "Status" },
];

const STORAGE_KEY = "lexbau:projects-table:cols";
const REQUIRED_IDS: ColumnId[] = COLUMNS.filter((c) => c.required).map((c) => c.id);

function readVisible(): Set<ColumnId> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const valid = new Set(COLUMNS.map((c) => c.id));
    const result = new Set<ColumnId>();
    for (const v of parsed) {
      if (typeof v === "string" && valid.has(v as ColumnId)) {
        result.add(v as ColumnId);
      }
    }
    for (const r of REQUIRED_IDS) result.add(r);
    return result;
  } catch {
    return null;
  }
}

function writeVisible(set: Set<ColumnId>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* QuotaExceeded etc. — silently ignore, default state stays in memory */
  }
}

type FlagId =
  | "critical"
  | "compliance"
  | "securities-expiring"
  | "nachtraege-open"
  | "confidential";

const FLAG_DEFS: Array<{
  id: FlagId;
  label: string;
  icon: typeof AlertTriangle;
  tone: "critical" | "warning" | "info";
}> = [
  { id: "critical", label: "Kritische Frist", icon: AlertTriangle, tone: "critical" },
  { id: "compliance", label: "NU-Compliance-Lücke", icon: ShieldAlert, tone: "critical" },
  { id: "securities-expiring", label: "Sicherheit ≤ 30 T.", icon: Clock, tone: "warning" },
  { id: "nachtraege-open", label: "Nachträge offen", icon: FileWarning, tone: "warning" },
  { id: "confidential", label: "Vertraulich", icon: Lock, tone: "info" },
];

const TONE_CLASS = {
  critical: {
    active:
      "bg-[color:var(--color-critical)] text-white border-[color:var(--color-critical)]",
    inactive:
      "border-[color:var(--color-critical-border)] text-[color:var(--color-critical)] bg-[color:var(--color-critical-soft)] hover:bg-[color:var(--color-critical)] hover:text-white",
  },
  warning: {
    active:
      "bg-[color:var(--color-warning)] text-white border-[color:var(--color-warning)]",
    inactive:
      "border-[color:var(--color-warning-border)] text-[color:var(--color-warning)] bg-[color:var(--color-warning-soft)] hover:bg-[color:var(--color-warning)] hover:text-white",
  },
  info: {
    active: "bg-[color:var(--color-fg)] text-[color:var(--color-bg)] border-[color:var(--color-fg)]",
    inactive:
      "border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] bg-[color:var(--color-bg-subtle)] hover:bg-[color:var(--color-bg)] hover:text-[color:var(--color-fg)]",
  },
} as const;

export function ProjectsTableShell({
  children,
  flagCounts,
}: {
  children: React.ReactNode;
  flagCounts: Record<FlagId, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();
  const [visible, setVisible] = useState<Set<ColumnId> | null>(null);
  const [open, setOpen] = useState(false);

  const activeFlag = (params.get("flag") ?? "") as FlagId | "";

  function setFlag(next: FlagId | "") {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.set("flag", next);
    else sp.delete("flag");
    const qs = sp.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  useEffect(() => {
    const stored = readVisible();
    if (stored) setVisible(stored);
    else setVisible(new Set(COLUMNS.map((c) => c.id)));
  }, []);

  const hiddenCss = useMemo(() => {
    if (!visible) return "";
    const hidden = COLUMNS.filter((c) => !visible.has(c.id) && !c.required);
    if (hidden.length === 0) return "";
    return hidden
      .map((c) => `[data-col="${c.id}"]{display:none !important;}`)
      .join("");
  }, [visible]);

  function toggle(id: ColumnId) {
    if (REQUIRED_IDS.includes(id)) return;
    setVisible((prev) => {
      const next = new Set(prev ?? new Set(COLUMNS.map((c) => c.id)));
      if (next.has(id)) next.delete(id);
      else next.add(id);
      for (const r of REQUIRED_IDS) next.add(r);
      writeVisible(next);
      return next;
    });
  }

  function reset() {
    const next = new Set<ColumnId>(COLUMNS.map((c) => c.id));
    setVisible(next);
    writeVisible(next);
  }

  const exportHref = (() => {
    const sp = new URLSearchParams();
    const q = params.get("q");
    const status = params.get("status");
    const sort = params.get("sort");
    const flag = params.get("flag");
    if (q) sp.set("q", q);
    if (status) sp.set("status", status);
    if (sort) sp.set("sort", sort);
    if (flag) sp.set("flag", flag);
    const qs = sp.toString();
    return qs ? `/projekte/export?${qs}` : "/projekte/export";
  })();

  const groups = COLUMNS.reduce<Record<string, ColumnDef[]>>((acc, c) => {
    (acc[c.group] = acc[c.group] ?? []).push(c);
    return acc;
  }, {});

  const visibleCount = visible
    ? COLUMNS.filter((c) => visible.has(c.id)).length
    : COLUMNS.length;

  return (
    <div>
      {hiddenCss ? <style>{hiddenCss}</style> : null}

      <div className="flex items-center gap-2 mb-3 flex-wrap" role="group" aria-label="Schnellfilter">
        {FLAG_DEFS.map((f) => {
          const count = flagCounts[f.id] ?? 0;
          const active = activeFlag === f.id;
          const Icon = f.icon;
          const cls = active ? TONE_CLASS[f.tone].active : TONE_CLASS[f.tone].inactive;
          const disabled = count === 0 && !active;
          return (
            <button
              key={f.id}
              type="button"
              disabled={disabled}
              onClick={() => setFlag(active ? "" : f.id)}
              aria-pressed={active}
              title={
                disabled
                  ? `Keine Projekte mit "${f.label}"`
                  : active
                    ? `Schnellfilter "${f.label}" aktiv — Klick zum Aufheben`
                    : `Nur Projekte mit "${f.label}" anzeigen`
              }
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors ${cls} ${
                disabled ? "opacity-40 cursor-not-allowed" : ""
              }`}
            >
              <Icon size={12} aria-hidden />
              <span>{f.label}</span>
              <span className="font-mono text-[10px] tabular-nums">{count}</span>
              {active ? <X size={11} aria-hidden /> : null}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-[11px] text-[color:var(--color-fg-muted)]">
          {visibleCount} von {COLUMNS.length} Spalten sichtbar
        </p>
        <div className="flex items-center gap-2">
          <a
            href={exportHref}
            className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-1.5 text-xs text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-subtle)] transition-colors"
            title="Aktuelle gefilterte Liste als CSV exportieren (Excel-kompatibel)"
          >
            <Download size={13} aria-hidden /> CSV-Export
          </a>
          <div className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-haspopup="dialog"
              className="inline-flex items-center gap-1.5 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-1.5 text-xs text-[color:var(--color-fg)] hover:bg-[color:var(--color-bg-subtle)] transition-colors"
            >
              <Columns3 size={13} aria-hidden /> Spalten
            </button>
            {open ? (
              <div
                role="dialog"
                aria-label="Spalten konfigurieren"
                className="absolute right-0 top-full mt-1 z-30 w-72 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-3 shadow-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                    Spalten
                  </p>
                  <button
                    type="button"
                    onClick={reset}
                    className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
                  >
                    Zurücksetzen
                  </button>
                </div>
                <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                  {Object.entries(groups).map(([group, cols]) => (
                    <div key={group}>
                      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
                        {group}
                      </p>
                      <div className="space-y-1">
                        {cols.map((col) => {
                          const checked = visible
                            ? visible.has(col.id)
                            : true;
                          return (
                            <label
                              key={col.id}
                              className={`flex items-center gap-2 text-xs cursor-pointer rounded px-1 py-0.5 hover:bg-[color:var(--color-bg-subtle)] ${
                                col.required ? "opacity-60 cursor-not-allowed" : ""
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={col.required}
                                onChange={() => toggle(col.id)}
                                className="accent-[color:var(--color-accent)]"
                              />
                              <span>{col.label}</span>
                              {col.required ? (
                                <span className="ml-auto text-[9px] text-[color:var(--color-fg-muted)] uppercase tracking-wider">
                                  Pflicht
                                </span>
                              ) : null}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t border-[color:var(--color-border)] flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
                  >
                    Schließen
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
