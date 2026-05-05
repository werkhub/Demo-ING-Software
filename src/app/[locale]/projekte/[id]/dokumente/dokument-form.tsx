"use client";

import { useActionState } from "react";
import { Link } from "@/i18n/navigation";
import { createDokument } from "./actions";
import type { ActionResult } from "@/lib/action-result";

export function DokumentForm({ projektId }: { projektId: string }) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(createDokument, null);

  const fieldErr = (k: string) =>
    state && !state.ok ? state.fieldErrors?.[k]?.[0] : undefined;

  const inputCls =
    "block w-full rounded-sm border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--color-fg)]";

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="space-y-6 max-w-2xl"
    >
      <input type="hidden" name="projektId" value={projektId} />

      {state && !state.ok && state.formError ? (
        <p className="text-sm text-[color:var(--color-critical)] border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-sm px-3 py-2">
          {state.formError}
        </p>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
            Kategorie
          </span>
          <input
            name="kategorie"
            required
            defaultValue="Vertrag"
            placeholder="Vertrag / Protokoll / Brief"
            className={"mt-1.5 " + inputCls}
          />
          {fieldErr("kategorie") ? (
            <p className="mt-1 text-[11px] text-[color:var(--color-critical)]">
              {fieldErr("kategorie")}
            </p>
          ) : null}
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
            Vertraulich (0-100)
          </span>
          <input
            name="vertraulichPct"
            type="number"
            min={0}
            max={100}
            defaultValue={0}
            className={"mt-1.5 " + inputCls}
          />
        </label>
      </div>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
          Bezeichnung
        </span>
        <input
          name="bezeichnung"
          required
          placeholder="HU-Vertrag mit Stadtwerken Müller"
          className={"mt-1.5 " + inputCls}
        />
        {fieldErr("bezeichnung") ? (
          <p className="mt-1 text-[11px] text-[color:var(--color-critical)]">
            {fieldErr("bezeichnung")}
          </p>
        ) : null}
      </label>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
          Datei
        </span>
        <input
          type="file"
          name="file"
          required
          className="mt-1.5 block text-sm"
        />
      </label>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
          Notizen
        </span>
        <textarea
          name="notes"
          rows={3}
          className={"mt-1.5 " + inputCls + " min-h-[72px]"}
        />
      </label>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-50"
        >
          {pending ? "Hochladen…" : "Dokument speichern"}
        </button>
        <Link
          href={`/projekte/${projektId}/dokumente`}
          className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
        >
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
