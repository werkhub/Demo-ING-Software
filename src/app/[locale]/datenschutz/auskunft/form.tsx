"use client";

import { useActionState, useState } from "react";
import { runAuskunftAction, runAuskunftPdfAction } from "@/lib/dsgvo/actions";
import type { ActionResult } from "@/lib/action-result";
import type { DsgvoExportBundle } from "@/lib/dsgvo/types";

const initial: ActionResult<DsgvoExportBundle> | null = null;
const initialPdf: ActionResult<{ filename: string; dataUrl: string }> | null =
  null;

export function AuskunftForm() {
  const [state, action, pending] = useActionState(runAuskunftAction, initial);
  const [pdfState, pdfAction, pdfPending] = useActionState(
    runAuskunftPdfAction,
    initialPdf
  );
  const [identifier, setIdentifier] = useState("");

  return (
    <div className="grid gap-6">
      <form action={action} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span>Identifier (E-Mail, Name oder Telefon)</span>
          <input
            name="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            minLength={2}
            className="border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 rounded"
          />
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending}
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--color-foreground)] text-[color:var(--color-background)] disabled:opacity-50"
          >
            {pending ? "Suche..." : "Auskunft erstellen"}
          </button>
        </div>
        {state && !state.ok ? (
          <p className="text-sm text-[color:var(--color-destructive,#c00)]">
            {state.formError ??
              Object.values(state.fieldErrors ?? {}).flat().join(", ")}
          </p>
        ) : null}
      </form>

      {state && state.ok ? (
        <section className="border border-[color:var(--color-border)] rounded p-4 grid gap-3">
          <header className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-medium">Ergebnis</h2>
            <span className="text-xs text-[color:var(--color-muted-foreground)]">
              Erzeugt: {state.data.generatedAt}
            </span>
          </header>
          <p className="text-sm">
            <strong>Identifier:</strong> {state.data.identifier}
          </p>
          {state.data.findings.length === 0 ? (
            <p className="text-sm text-[color:var(--color-muted-foreground)]">
              Keine personenbezogenen Daten gefunden.
            </p>
          ) : (
            <div className="grid gap-3">
              {state.data.findings.map((f) => (
                <div key={f.bucket}>
                  <h3 className="text-sm font-medium">
                    {f.bucket} ({f.table}) — {f.rows.length} Treffer
                  </h3>
                  <pre className="text-xs bg-[color:var(--color-muted)] p-2 rounded overflow-auto max-h-64">
                    {JSON.stringify(f.rows, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
          {state.data.notes.length > 0 ? (
            <ul className="text-xs text-[color:var(--color-muted-foreground)] list-disc pl-4">
              {state.data.notes.map((n, i) => (
                <li key={i}>{n}</li>
              ))}
            </ul>
          ) : null}

          <form action={pdfAction} className="flex items-center gap-2 pt-2 border-t border-[color:var(--color-border)]">
            <input type="hidden" name="identifier" value={identifier} />
            <button
              type="submit"
              disabled={pdfPending}
              className="px-3 py-1.5 text-sm rounded border border-[color:var(--color-border)] disabled:opacity-50"
            >
              {pdfPending ? "PDF wird erzeugt..." : "Als PDF herunterladen"}
            </button>
            {pdfState && pdfState.ok ? (
              <a
                href={pdfState.data.dataUrl}
                download={pdfState.data.filename}
                className="text-sm underline"
              >
                {pdfState.data.filename} speichern
              </a>
            ) : null}
            {pdfState && !pdfState.ok ? (
              <span className="text-xs text-[color:var(--color-destructive,#c00)]">
                {pdfState.formError}
              </span>
            ) : null}
          </form>
        </section>
      ) : null}
    </div>
  );
}
