"use client";

import { Link } from "@/i18n/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import type { BautagebuchEntry } from "@/db/schema";
import { updateBautagebuchEntry } from "../../actions";
import { EntryFormFields } from "../../entry-form-fields";

type Project = { id: string; identifier: string; name: string };

export function EditBautagebuchForm({
  entry,
  projects,
}: {
  entry: BautagebuchEntry;
  projects: Project[];
}) {
  const [state, formAction] = useActionState(updateBautagebuchEntry, null);
  const { push } = useToast();
  const router = useRouter();
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;
  const success = state?.ok ? state.data : null;

  useEffect(() => {
    if (success) {
      push({ tone: "success", title: "Eintrag aktualisiert" });
      router.push("/bautagebuch");
    }
  }, [success, push, router]);

  return (
    <form action={formAction} className="mt-8 space-y-6">
      <input type="hidden" name="id" value={entry.id} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm">
          {formError}
        </div>
      ) : null}

      <div className="border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] rounded-md px-4 py-3 text-sm text-[color:var(--color-fg)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)] mb-1">
          Hinweis
        </p>
        <p className="text-[13px] text-[color:var(--color-fg-muted)] leading-relaxed">
          Bautagebücher sollten zur Beweissicherung dauerhaft erhalten bleiben.
          Nachträgliche Änderungen werden mit Zeitstempel als &bdquo;geändert&ldquo; markiert
          — bei Gerichtsverwendung kann das die Beweiskraft mindern.
        </p>
      </div>

      <EntryFormFields
        projects={projects}
        defaults={entry}
        fieldErrors={fieldErrors}
      />

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-[color:var(--color-border)]">
        <Link
          href="/bautagebuch"
          className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-4 py-2 transition-colors"
        >
          Abbrechen
        </Link>
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
      {pending ? "Speichere …" : "Änderungen speichern"}
    </button>
  );
}
