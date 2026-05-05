"use client";

import { useState, useTransition } from "react";
import type { VorgangLink, VorgangLinkKind } from "@/db/schema";
import { addVorgangLink, removeVorgangLink } from "@/app/[locale]/vorgaenge/actions";

const KIND_LABEL: Record<VorgangLinkKind, string> = {
  project: "Projekt",
  contract: "Vertrag",
  bautagebuch: "Bautagebuch",
  frist: "Frist",
  vorgang: "Vorgang",
  rechnung: "Rechnung",
};

type LinkOption = { id: string; label: string };

export function VorgangVerknuepfungen({
  vorgangId,
  links,
  options,
}: {
  vorgangId: string;
  links: VorgangLink[];
  options: Record<VorgangLinkKind, LinkOption[]>;
}) {
  const [kind, setKind] = useState<VorgangLinkKind>("project");
  const [targetId, setTargetId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function add() {
    if (!targetId) {
      setError("Bitte einen Eintrag auswählen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("vorgangId", vorgangId);
      fd.set("targetKind", kind);
      fd.set("targetId", targetId);
      try {
        await addVorgangLink(fd);
        setTargetId("");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Hinzufügen fehlgeschlagen.");
      }
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await removeVorgangLink(fd);
    });
  }

  const grouped = (Object.keys(KIND_LABEL) as VorgangLinkKind[]).map((k) => ({
    kind: k,
    items: links.filter((l) => l.targetKind === k),
  }));

  function labelFor(linkKind: VorgangLinkKind, id: string): string {
    return options[linkKind]?.find((o) => o.id === id)?.label ?? id;
  }

  function hrefFor(linkKind: VorgangLinkKind, id: string): string {
    if (linkKind === "project") return `/projekte/${id}`;
    if (linkKind === "vorgang") return `/vorgaenge/${id}`;
    if (linkKind === "rechnung") return `/rechnungen/${id}`;
    if (linkKind === "bautagebuch") return `/bautagebuch`;
    if (linkKind === "frist") return `/fristen`;
    if (linkKind === "contract") return `/vertrag`;
    return "/";
  }

  const currentOptions = options[kind] ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Neue Verknüpfung
        </p>
        <div className="grid gap-3 md:grid-cols-[160px_1fr_auto] items-end">
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
              Typ
            </label>
            <select
              value={kind}
              onChange={(e) => {
                setKind(e.target.value as VorgangLinkKind);
                setTargetId("");
              }}
              className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 focus:outline-none focus:border-[color:var(--color-accent)]"
            >
              {(Object.keys(KIND_LABEL) as VorgangLinkKind[])
                .filter((k) => k !== "vorgang" || true)
                .map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABEL[k]}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
              Eintrag
            </label>
            <select
              value={targetId}
              onChange={(e) => setTargetId(e.target.value)}
              className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 focus:outline-none focus:border-[color:var(--color-accent)]"
              disabled={currentOptions.length === 0}
            >
              <option value="">
                {currentOptions.length === 0
                  ? "Keine verfügbaren Einträge"
                  : "— bitte wählen —"}
              </option>
              {currentOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={add}
            disabled={isPending || !targetId}
            className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-4 py-2 transition-colors disabled:opacity-50"
          >
            Hinzufügen
          </button>
        </div>
        {error ? (
          <p className="text-xs text-[color:var(--color-critical)] mt-2">{error}</p>
        ) : null}
      </div>

      <div className="space-y-5">
        {grouped.map((g) =>
          g.items.length === 0 ? null : (
            <div key={g.kind}>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-2">
                {KIND_LABEL[g.kind]} · {g.items.length}
              </p>
              <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {g.items.map((l) => (
                  <li
                    key={l.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <a
                      href={hrefFor(l.targetKind, l.targetId)}
                      className="text-sm text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors flex-1 min-w-0 truncate"
                    >
                      {labelFor(l.targetKind, l.targetId)}
                    </a>
                    <button
                      type="button"
                      onClick={() => remove(l.id)}
                      disabled={isPending}
                      className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors shrink-0"
                      aria-label="Verknüpfung lösen"
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
        {links.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] py-6 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
            Noch keine Verknüpfungen.
          </p>
        ) : null}
      </div>
    </div>
  );
}
