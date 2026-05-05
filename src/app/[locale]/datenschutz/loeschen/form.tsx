"use client";

import { useActionState, useState } from "react";
import { runLoeschenAction } from "@/lib/dsgvo/actions";
import { ALL_BUCKETS, type DsgvoBucket } from "@/lib/dsgvo/buckets";
import type { ActionResult } from "@/lib/action-result";

const BUCKET_LABEL: Record<DsgvoBucket, string> = {
  users: "Workspace-User",
  subcontractors: "Nachunternehmer-Stamm",
  projectContacts: "Projekt-Kontakte",
  mitarbeiter: "Mitarbeiter-Stamm (Stunden)",
};

const initial: ActionResult<{
  buckets: Array<{ bucket: DsgvoBucket; affected: number }>;
}> | null = null;

export function LoeschForm() {
  const [state, action, pending] = useActionState(runLoeschenAction, initial);
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="grid gap-6">
      <form action={action} className="grid gap-3">
        <label className="grid gap-1 text-sm">
          <span>Identifier (E-Mail, Name oder Telefon)</span>
          <input
            name="identifier"
            required
            minLength={2}
            className="border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 rounded"
          />
        </label>
        <label className="grid gap-1 text-sm">
          <span>Begr&uuml;ndung / Antragsnummer (Pflicht)</span>
          <input
            name="reason"
            required
            minLength={5}
            placeholder="z. B. Antrag #2026-04-22 von M. Mustermann"
            className="border border-[color:var(--color-border)] bg-transparent px-2 py-1.5 rounded"
          />
        </label>
        <fieldset className="grid gap-1 text-sm">
          <legend>
            Tabellen ausnehmen (kein Anonymisieren in diesen Buckets)
          </legend>
          {ALL_BUCKETS.map((b) => (
            <label key={b} className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                name="except"
                value={b}
                className="accent-current"
              />
              {BUCKET_LABEL[b]}
            </label>
          ))}
        </fieldset>
        <label className="inline-flex items-start gap-2 text-sm pt-2 border-t border-[color:var(--color-border)]">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            className="mt-1"
          />
          <span>
            Ich habe gepr&uuml;ft, dass keine gesetzliche Aufbewahrungs-Pflicht
            (z. B. &sect; 147 AO, &sect; 257 HGB) der Anonymisierung
            entgegensteht und dass der Antrag berechtigt ist.
          </span>
        </label>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={pending || !confirmed}
            className="px-3 py-1.5 text-sm rounded bg-[color:var(--color-foreground)] text-[color:var(--color-background)] disabled:opacity-50"
          >
            {pending ? "Anonymisiere..." : "Anonymisierung durchführen"}
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
        <section className="border border-[color:var(--color-border)] rounded p-4 grid gap-2">
          <h2 className="font-medium">Ergebnis</h2>
          {state.data.buckets.length === 0 ? (
            <p className="text-sm">Keine personenbezogenen Daten gefunden.</p>
          ) : (
            <ul className="text-sm divide-y divide-[color:var(--color-border)]">
              {state.data.buckets.map((b) => (
                <li key={b.bucket} className="py-1.5 flex justify-between">
                  <span>{BUCKET_LABEL[b.bucket]}</span>
                  <span>
                    {b.affected > 0
                      ? `${b.affected} anonymisiert`
                      : "ausgenommen / 0"}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-[color:var(--color-muted-foreground)]">
            Alle &Auml;nderungen sind im{" "}
            <a href="/audit" className="underline">
              Audit-Log
            </a>{" "}
            mit Begr&uuml;ndung erfasst.
          </p>
        </section>
      ) : null}
    </div>
  );
}
