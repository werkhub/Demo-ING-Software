"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { importGaeb } from "../lv-actions";

export function GaebImportForm({
  projectId,
  hasExistingLv,
}: {
  projectId: string;
  hasExistingLv: boolean;
}) {
  const [state, formAction] = useActionState(importGaeb, null);
  const formError = state && !state.ok ? state.formError : undefined;

  return (
    <form
      action={formAction}
      encType="multipart/form-data"
      className="space-y-6"
    >
      <input type="hidden" name="projectId" value={projectId} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm whitespace-pre-wrap">
          {formError}
        </div>
      ) : null}

      {hasExistingLv ? (
        <div className="border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] rounded-md px-4 py-3 text-sm text-[color:var(--color-warning)]">
          <strong>Achtung:</strong> Es existiert bereits ein LV für dieses Projekt.
          Beim Import wird es <strong>komplett ersetzt</strong> — alle bisherigen
          Positionen und ihre Verknüpfungen gehen verloren.
        </div>
      ) : null}

      <div>
        <label
          htmlFor="file"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          GAEB-Datei (.X83 / .X84 / .xml, max. 25 MB)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".x83,.x84,.x86,.xml,application/xml,text/xml"
          className="w-full text-sm text-[color:var(--color-fg-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--color-bg)] file:text-[color:var(--color-fg)] file:px-3 file:py-1.5 file:text-xs file:cursor-pointer file:hover:bg-[color:var(--color-accent-soft)]"
        />
        <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)]">
          Wir unterstützen GAEB DA XML 3.x. Ältere Formate (GAEB 90, GAEB 2000)
          werden derzeit nicht erkannt — bitte vorher konvertieren (z. B. mit
          California oder ORCA AVA).
        </p>
      </div>

      <div className="flex justify-end">
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
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Importiere …" : "Importieren"}
    </button>
  );
}
