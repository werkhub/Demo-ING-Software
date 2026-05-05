"use client";

import { useActionState } from "react";
import { Link } from "@/i18n/navigation";
import { addFreigabe } from "../../../actions";
import type { ActionResult } from "@/lib/action-result";

export function FreigabeForm({
  projektId,
  planId,
  planVersionId,
  versionNr,
}: {
  projektId: string;
  planId: string;
  planVersionId: string;
  versionNr: number;
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(addFreigabe, null);

  const fieldErr = (k: string) =>
    state && !state.ok ? state.fieldErrors?.[k]?.[0] : undefined;

  const inputCls =
    "block w-full rounded-sm border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--color-fg)]";

  return (
    <form action={formAction} className="space-y-6 max-w-xl">
      <input type="hidden" name="planVersionId" value={planVersionId} />

      <p className="text-sm text-[color:var(--color-fg-muted)]">
        Freigabe für Version <span className="font-mono">v{versionNr}</span>
      </p>

      {state && !state.ok && state.formError ? (
        <p className="text-sm text-[color:var(--color-critical)] border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-sm px-3 py-2">
          {state.formError}
        </p>
      ) : null}

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
          Externer Name (z. B. Bauherr)
        </span>
        <input
          name="freigabeDurchName"
          placeholder="Hr. Schmidt (Bauherr)"
          className={"mt-1.5 " + inputCls}
        />
        {fieldErr("freigabeDurchName") ? (
          <p className="mt-1 text-[11px] text-[color:var(--color-critical)]">
            {fieldErr("freigabeDurchName")}
          </p>
        ) : null}
      </label>

      <label className="block">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
          Rolle
        </span>
        <input
          name="freigabeRolle"
          placeholder="Bauherr / Statiker / Polier"
          className={"mt-1.5 " + inputCls}
        />
      </label>

      <p className="text-[11px] text-[color:var(--color-fg-muted)]">
        Status startet auf <em>Offen</em>. Nach Rückmeldung wird der Status auf
        der Plan-Detail-Seite aktualisiert. Wenn alle Freigaben zustimmen, geht
        der Plan automatisch auf <em>Freigegeben</em> + Vorgang.
      </p>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-50"
        >
          {pending ? "Speichere…" : "Freigabe anlegen"}
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
