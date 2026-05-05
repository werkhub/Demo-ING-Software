"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { CATEGORY_LABEL } from "@/lib/hinschg";
import type { HinschgCategory } from "@/db/schema";
import { submitMeldung } from "../actions";

export function MeldungForm({ workspaceId }: { workspaceId: string }) {
  const [state, formAction] = useActionState(submitMeldung, null);
  const [withContact, setWithContact] = useState(false);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="workspaceId" value={workspaceId} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm">
          {formError}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="category"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Themenbereich
        </label>
        <select
          id="category"
          name="category"
          defaultValue="sonstiges"
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        >
          {(Object.keys(CATEGORY_LABEL) as HinschgCategory[]).map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="subject"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Betreff (kurze Überschrift)
        </label>
        <input
          id="subject"
          name="subject"
          type="text"
          required
          minLength={5}
          maxLength={200}
          placeholder="z. B. Verdacht auf Bestechungsgeld bei Auftragsvergabe"
          className={
            "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors " +
            (fieldErrors?.subject
              ? "border-[color:var(--color-critical)]"
              : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
          }
        />
        {fieldErrors?.subject ? (
          <p className="mt-1 text-xs text-[color:var(--color-critical)]">
            {fieldErrors.subject[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="bodyText"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Sachverhalt
        </label>
        <textarea
          id="bodyText"
          name="bodyText"
          rows={10}
          required
          minLength={20}
          maxLength={20_000}
          placeholder={`Bitte beschreiben Sie:\n· Was ist passiert?\n· Wann und wo?\n· Wer ist beteiligt?\n· Welche Beweise / Dokumente gibt es?`}
          className={
            "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors " +
            (fieldErrors?.bodyText
              ? "border-[color:var(--color-critical)]"
              : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
          }
        />
        {fieldErrors?.bodyText ? (
          <p className="mt-1 text-xs text-[color:var(--color-critical)]">
            {fieldErrors.bodyText[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label
          htmlFor="reporterDisplayName"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Pseudonym (optional, für die Kommunikation)
        </label>
        <input
          id="reporterDisplayName"
          name="reporterDisplayName"
          type="text"
          maxLength={100}
          placeholder='z. B. "Beobachter"'
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </div>

      <div className="border-t border-[color:var(--color-border)] pt-6">
        <label className="flex items-start gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={withContact}
            onChange={(e) => setWithContact(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-accent)] focus:ring-[color:var(--color-accent)]"
          />
          <span>
            <span className="font-medium text-[color:var(--color-fg)]">
              Ich möchte Kontakt für Rückfragen hinterlassen
            </span>
            <span className="block text-[11px] text-[color:var(--color-fg-muted)] mt-0.5">
              Optional — ohne Angabe melden Sie anonym. Sie können trotzdem
              jederzeit über den Token nachfragen.
            </span>
          </span>
        </label>

        {withContact ? (
          <div className="mt-4">
            <label
              htmlFor="reporterContact"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Kontakt (E-Mail oder Telefon)
            </label>
            <input
              id="reporterContact"
              name="reporterContact"
              type="text"
              maxLength={500}
              placeholder="z. B. ihre@email.de"
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      <div className="border-t border-[color:var(--color-border)] pt-6 flex items-center justify-end gap-3">
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
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-6 py-3 text-base text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Sende …" : "Meldung absenden"}
    </button>
  );
}
