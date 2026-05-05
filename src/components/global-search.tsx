"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { globalSearch } from "@/app/actions/global-search";
import type {
  GlobalSearchHit,
  GlobalSearchResult,
} from "@/lib/actions/global-search";

const KIND_LABEL: Record<GlobalSearchHit["kind"], string> = {
  projekt: "Projekt",
  vorgang: "Vorgang",
  vertrag: "Vertrag",
  bautagebuch: "Bautagebuch",
  frist: "Frist",
  rechnung: "Rechnung",
  gesetz: "Gesetz",
  urteil: "Urteil",
};

const KIND_TONE: Record<GlobalSearchHit["kind"], string> = {
  projekt:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  vorgang:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  vertrag:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg)] border-[color:var(--color-border)]",
  bautagebuch:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  frist:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  rechnung:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  gesetz:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  urteil:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<GlobalSearchResult | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Globaler Cmd/Ctrl+K Listener
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  // Auto-Focus beim Öffnen
  useEffect(() => {
    if (open) {
      // Kurze Verzögerung, damit das Modal gerendert ist
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      setQuery("");
      setResult(null);
      setActiveIndex(0);
    }
  }, [open]);

  // Debounced Suche
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResult(null);
      return;
    }
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(query);
        setResult(res);
        setActiveIndex(0);
      });
    }, 200);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  function activate(hit: GlobalSearchHit) {
    setOpen(false);
    router.push(hit.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const hits = result?.hits ?? [];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(0, hits.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && hits.length > 0) {
      e.preventDefault();
      activate(hits[activeIndex] ?? hits[0]);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 flex-1 max-w-xl bg-[color:var(--color-bg-subtle)] border border-transparent rounded-full pl-10 pr-3 py-2 text-sm text-[color:var(--color-fg-muted)] hover:bg-[color:var(--color-bg)] hover:border-[color:var(--color-border)] transition relative text-left"
        aria-label="Globale Suche öffnen (Strg+K)"
      >
        <Search
          size={15}
          className="absolute left-3.5 top-2.5 text-[color:var(--color-fg-muted)] pointer-events-none"
        />
        <span className="flex-1 truncate">Suche · Projekte, Vorgänge, Verträge, Gesetze…</span>
        <kbd className="hidden md:inline-flex font-mono text-[10px] text-[color:var(--color-fg-muted)] bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded px-1.5 py-0.5">
          Strg K
        </kbd>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[10vh] px-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[color:var(--color-border)]">
              <Search size={16} className="text-[color:var(--color-fg-muted)]" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Suche im Workspace und in Gesetzen / Urteilen…"
                className="flex-1 bg-transparent text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:outline-none"
                autoComplete="off"
              />
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                {isPending ? "lädt …" : query.length < 2 ? "min. 2 Zeichen" : ""}
              </span>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {result === null && query.length < 2 ? (
                <p className="text-xs text-[color:var(--color-fg-muted)] px-4 py-8 text-center">
                  Tippe einen Suchbegriff. Trefferquellen: Projekte · Vorgänge · Verträge · Bautagebuch · Fristen · Rechnungen · Gesetze · Urteile.
                </p>
              ) : null}
              {result && result.hits.length === 0 ? (
                <p className="text-xs text-[color:var(--color-fg-muted)] px-4 py-8 text-center">
                  Keine Treffer für „{result.query}".
                </p>
              ) : null}
              {result && result.hits.length > 0 ? (
                <ul>
                  {result.hits.map((h, i) => (
                    <li key={`${h.kind}_${h.id}`}>
                      <button
                        type="button"
                        onClick={() => activate(h)}
                        onMouseEnter={() => setActiveIndex(i)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-2.5 transition-colors ${
                          i === activeIndex
                            ? "bg-[color:var(--color-bg-subtle)]"
                            : "hover:bg-[color:var(--color-bg-subtle)]"
                        }`}
                      >
                        <span
                          className={`font-mono text-[9px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 shrink-0 ${KIND_TONE[h.kind]}`}
                        >
                          {KIND_LABEL[h.kind]}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[color:var(--color-fg)] truncate">
                            {h.title}
                          </p>
                          {h.subtitle ? (
                            <p className="text-[11px] text-[color:var(--color-fg-muted)] truncate">
                              {h.subtitle}
                            </p>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
            <div className="flex items-center justify-between px-4 py-2 border-t border-[color:var(--color-border)] text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              <span>↑ ↓ navigieren · ⏎ öffnen</span>
              <span>Esc schließen</span>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
