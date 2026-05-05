"use client";

import { useActionState } from "react";
import { Link } from "@/i18n/navigation";
import { addPlanVersion } from "../../../actions";
import type { ActionResult } from "@/lib/action-result";

export function VersionForm({
  projektId,
  planId,
}: {
  projektId: string;
  planId: string;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(addPlanVersion, null);

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
      <input type="hidden" name="planId" value={planId} />

      {state && !state.ok && state.formError ? (
        <p className="text-sm text-[color:var(--color-critical)] border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-sm px-3 py-2">
          {state.formError}
        </p>
      ) : null}

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
          Datei
        </span>
        <input
          type="file"
          name="file"
          required
          accept=".pdf,.dwg,.dxf,.ifc,.png,.jpg,.jpeg"
          className="mt-1.5 block text-sm"
        />
        {fieldErr("file") ? (
          <p className="mt-1 text-[11px] text-[color:var(--color-critical)]">
            {fieldErr("file")}
          </p>
        ) : null}
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
            Index-Kategorie
          </span>
          <select
            name="indexKategorie"
            defaultValue="freigegeben"
            className={"mt-1.5 " + inputCls}
          >
            <option value="entwurf">Entwurf (A, B, C, …)</option>
            <option value="freigegeben">Freigegeben (0, 1, 2, …)</option>
          </select>
          <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
            Steuert die Auto-Inkrementierung
          </p>
        </label>

        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
            Index-Label (optional)
          </span>
          <input
            name="indexLabel"
            placeholder="leer = automatisch"
            maxLength={8}
            pattern="[A-Za-z0-9]+"
            className={"mt-1.5 " + inputCls + " font-mono"}
          />
          <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
            A/B/C oder 0/1/2 — leer lassen für nächsten freien Index
          </p>
        </label>
      </div>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
          Versions-Datum (YYYY-MM-DD)
        </span>
        <input
          name="datum"
          placeholder="2026-05-04"
          className={"mt-1.5 " + inputCls}
        />
      </label>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
          Kommentar (Was hat sich geändert?)
        </span>
        <textarea
          name="kommentar"
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
          {pending ? "Hochladen…" : "Version hochladen"}
        </button>
        <Link
          href={`/projekte/${projektId}/plaene/${planId}`}
          className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
        >
          Abbrechen
        </Link>
      </div>
    </form>
  );
}
