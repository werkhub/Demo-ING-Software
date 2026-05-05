"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createAufmass } from "../aufmass-actions";

export function NewAufmassForm({
  projectId,
  lvId,
}: {
  projectId: string;
  lvId: string;
}) {
  const [state, formAction] = useActionState(createAufmass, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="lvId" value={lvId} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm">
          {formError}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="name"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Bezeichnung
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={200}
          defaultValue="Aufmaß 1. Abschlagsrechnung"
          className={
            "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors " +
            (fieldErrors?.name
              ? "border-[color:var(--color-critical)]"
              : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
          }
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor="periodStart"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
          >
            Periode von
          </label>
          <input
            id="periodStart"
            name="periodStart"
            type="date"
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="periodEnd"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
          >
            Periode bis
          </label>
          <input
            id="periodEnd"
            name="periodEnd"
            type="date"
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Notizen
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={2000}
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] pt-5">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60"
    >
      {pending ? "Speichere …" : "Aufmaß anlegen"}
    </button>
  );
}
