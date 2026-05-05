"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { createBautagebuchEntry } from "./actions";
import { EntryFormFields } from "./entry-form-fields";

type Project = { id: string; identifier: string; name: string };

export function NewEntryForm({ projects }: { projects: Project[] }) {
  const [state, formAction] = useActionState(createBautagebuchEntry, null);
  const formRef = useRef<HTMLFormElement>(null);
  const { push } = useToast();
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;
  const success = state?.ok ? state.data : null;

  useEffect(() => {
    if (!success) return;
    formRef.current?.reset();
    if (success.autoFristCreated) {
      push({
        tone: "warning",
        title: "Eintrag gespeichert · Frist automatisch angelegt",
        body: `Trigger "${success.trigger}" erkannt — passende Frist auf /fristen sichtbar.`,
        durationMs: 6000,
      });
    } else if (success.trigger) {
      push({
        tone: "warning",
        title: "Eintrag gespeichert",
        body: `Trigger erkannt: ${success.trigger}.`,
      });
    } else {
      push({ tone: "success", title: "Eintrag gespeichert" });
    }
  }, [success, push]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="mt-4 border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-5"
    >
      {formError ? (
        <div className="mb-4 border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <EntryFormFields projects={projects} fieldErrors={fieldErrors} />

      <div className="mt-5 flex items-center justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          Trigger-Erkennung · Keyword-Matching
        </p>
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
      {pending ? "Speichere …" : <>Speichern <span aria-hidden>→</span></>}
    </button>
  );
}
