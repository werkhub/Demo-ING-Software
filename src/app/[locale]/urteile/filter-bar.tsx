"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

const COURT_OPTIONS = [
  { value: "all", label: "Alle Gerichte" },
  { value: "BGH", label: "BGH" },
  { value: "OLG", label: "OLG" },
] as const;

const YEAR_OPTIONS = [
  { value: "all", label: "Alle Jahre" },
  { value: "current", label: "Laufendes Jahr" },
  { value: "recent", label: "Letzte 5 Jahre" },
  { value: "older", label: "Älter als 5 Jahre" },
] as const;

export function CasesFilterBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  const [q, setQ] = useState(params.get("q") ?? "");
  const court = params.get("court") ?? "all";
  const year = params.get("year") ?? "all";

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  function update(next: Record<string, string | undefined>) {
    const sp = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === undefined || value === "" || value === "all") sp.delete(key);
      else sp.set(key, value);
    }
    const queryString = sp.toString();
    startTransition(() =>
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      })
    );
  }

  function clear() {
    setQ("");
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const hasFilter = q.length > 0 || court !== "all" || year !== "all";

  return (
    <div className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-3 flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[220px]">
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
          placeholder="Aktenzeichen, Stichwort, ECLI …"
          aria-label="Urteile durchsuchen"
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md pl-9 pr-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
        />
      </div>

      <select
        value={court}
        onChange={(e) => update({ court: e.target.value })}
        aria-label="Gericht-Filter"
        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
      >
        {COURT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        value={year}
        onChange={(e) => update({ year: e.target.value })}
        aria-label="Zeitraum-Filter"
        className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
      >
        {YEAR_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

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
