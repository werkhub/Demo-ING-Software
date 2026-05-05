"use client";

import { useActionState } from "react";
import { Link } from "@/i18n/navigation";
import { createPlan } from "./actions";
import type { ActionResult } from "@/lib/action-result";
import { PLAN_TYPEN } from "@/lib/validation/plaene";
import { PLAN_TYP_LABEL } from "@/lib/plaene";

export function PlanForm({ projektId }: { projektId: string }) {
  const [state, formAction, pending] = useActionState<
    ActionResult<{ id: string }> | null,
    FormData
  >(createPlan, null);

  const fieldErr = (k: string) =>
    state && !state.ok ? state.fieldErrors?.[k]?.[0] : undefined;

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
        <Field label="Plan-Typ" error={fieldErr("planTyp")}>
          <select name="planTyp" required defaultValue="architektur" className={inputCls}>
            {PLAN_TYPEN.map((t) => (
              <option key={t} value={t}>
                {PLAN_TYP_LABEL[t] ?? t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Plan-Nr." error={fieldErr("planNr")}>
          <input
            name="planNr"
            required
            placeholder="A-101"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Bezeichnung" error={fieldErr("bezeichnung")}>
        <input
          name="bezeichnung"
          required
          placeholder="Grundriss EG"
          className={inputCls}
        />
      </Field>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Maßstab" error={fieldErr("masstab")}>
          <input name="masstab" placeholder="1:100" className={inputCls} />
        </Field>
        <Field label="Plan-Datum (YYYY-MM-DD)" error={fieldErr("datum")}>
          <input name="datum" placeholder="2026-05-04" className={inputCls} />
        </Field>
        <Field label="Planer" error={fieldErr("planerName")}>
          <input
            name="planerName"
            placeholder="Architekt Müller"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="Initialversion (optional)" error={fieldErr("file")}>
        <input
          type="file"
          name="file"
          accept=".pdf,.dwg,.dxf,.ifc,.png,.jpg,.jpeg"
          className="block text-sm"
        />
        <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
          Wenn Datei hinterlegt, wird automatisch v1 angelegt. Sonst kann sie
          später hochgeladen werden.
        </p>
      </Field>

      <Field label="Notizen" error={fieldErr("notes")}>
        <textarea
          name="notes"
          rows={3}
          placeholder="optional"
          className={inputCls + " min-h-[72px]"}
        />
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-50"
        >
          {pending ? "Speichere…" : "Plan anlegen"}
        </button>
        <Link
          href={`/projekte/${projektId}/plaene`}
          className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
        >
          Abbrechen
        </Link>
      </div>
    </form>
  );
}

const inputCls =
  "block w-full rounded-sm border border-[color:var(--color-border)] bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-[color:var(--color-fg)]";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)]">
        {label}
      </span>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p className="mt-1 text-[11px] text-[color:var(--color-critical)]">
          {error}
        </p>
      ) : null}
    </label>
  );
}
