"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  VORGANG_CATEGORY_LABEL,
  VORGANG_STATUS_LABEL,
} from "@/lib/vorgang";
import type { VorgangCategory, VorgangStatus } from "@/db/schema";

type ProjectOption = { id: string; identifier: string; name: string };

export function VorgaengeFilterBar({
  projects,
}: {
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value === "" || value === "all") next.delete(key);
    else next.set(key, value);
    startTransition(() => {
      router.push(`/vorgaenge${next.toString() ? `?${next.toString()}` : ""}`);
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 mb-6">
      <div className="min-w-[180px]">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
          Projekt
        </label>
        <select
          value={params.get("projectId") ?? "all"}
          onChange={(e) => update("projectId", e.target.value)}
          className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
        >
          <option value="all">Alle Projekte</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.identifier} · {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[160px]">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
          Status
        </label>
        <select
          value={params.get("status") ?? "all"}
          onChange={(e) => update("status", e.target.value)}
          className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
        >
          <option value="all">Alle Status</option>
          {(Object.keys(VORGANG_STATUS_LABEL) as VorgangStatus[]).map((s) => (
            <option key={s} value={s}>
              {VORGANG_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[160px]">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
          Kategorie
        </label>
        <select
          value={params.get("category") ?? "all"}
          onChange={(e) => update("category", e.target.value)}
          className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
        >
          <option value="all">Alle Kategorien</option>
          {(Object.keys(VORGANG_CATEGORY_LABEL) as VorgangCategory[]).map((c) => (
            <option key={c} value={c}>
              {VORGANG_CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>
      <div className="min-w-[160px]">
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
          Volltext
        </label>
        <input
          type="search"
          defaultValue={params.get("q") ?? ""}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              update("q", (e.target as HTMLInputElement).value);
            }
          }}
          placeholder="Titel suchen…"
          className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
        />
      </div>
      {isPending ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] pb-2">
          lädt …
        </span>
      ) : null}
    </div>
  );
}
