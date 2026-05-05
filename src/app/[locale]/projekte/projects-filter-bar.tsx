"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutGrid, Rows3, Search, X } from "lucide-react";

const STATUS_OPTIONS = [
  "Geplant",
  "Bauphase",
  "Abnahme",
  "Gewährleistung",
  "Abgeschlossen",
] as const;

const SORT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "recent", label: "Zuletzt angelegt" },
  { value: "deadline", label: "Nächste Frist" },
  { value: "name", label: "Name (A–Z)" },
  { value: "value-desc", label: "Volumen (absteigend)" },
  { value: "value-asc", label: "Volumen (aufsteigend)" },
  { value: "progress-desc", label: "Fortschritt (absteigend)" },
];

export function ProjectsFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const status = params.get("status") ?? "";
  const sort = params.get("sort") ?? "recent";
  const view = params.get("view") === "table" ? "table" : "cards";

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  function update(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "") sp.delete(key);
      else sp.set(key, value);
    }
    const queryString = sp.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    });
  }

  function clear() {
    setQ("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const hasFilter = q.length > 0 || status !== "" || sort !== "recent";

  return (
    <div className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-3 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[color:var(--color-fg-muted)] pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            update({ q: e.target.value });
          }}
          placeholder="Suche nach Name, Auftraggeber, BV-Nummer …"
          aria-label="Projekte durchsuchen"
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md pl-9 pr-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
        />
      </div>

      <select
        value={status}
        onChange={(e) => update({ status: e.target.value || undefined })}
        aria-label="Status-Filter"
        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
      >
        <option value="">Alle Status</option>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select
        value={sort}
        onChange={(e) => update({ sort: e.target.value })}
        aria-label="Sortierung"
        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <div
        role="group"
        aria-label="Ansicht"
        className="inline-flex border border-[color:var(--color-border)] rounded-md overflow-hidden bg-[color:var(--color-bg)]"
      >
        <button
          type="button"
          onClick={() => update({ view: undefined })}
          aria-pressed={view === "cards"}
          aria-label="Kachelansicht"
          title="Kachelansicht"
          className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors ${
            view === "cards"
              ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]"
              : "text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-subtle)]"
          }`}
        >
          <LayoutGrid size={14} aria-hidden /> Kacheln
        </button>
        <button
          type="button"
          onClick={() => update({ view: "table" })}
          aria-pressed={view === "table"}
          aria-label="Tabellenansicht"
          title="Tabellenansicht"
          className={`flex items-center gap-1.5 px-3 py-2 text-xs border-l border-[color:var(--color-border)] transition-colors ${
            view === "table"
              ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]"
              : "text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg-subtle)]"
          }`}
        >
          <Rows3 size={14} aria-hidden /> Tabelle
        </button>
      </div>

      {hasFilter ? (
        <button
          type="button"
          onClick={clear}
          className="inline-flex items-center gap-1 text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-2 py-1 transition-colors"
        >
          <X size={12} aria-hidden /> Filter zurücksetzen
        </button>
      ) : null}
    </div>
  );
}
