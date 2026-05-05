"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ALL_ROLES, ROLE_META } from "@/lib/roles";
import type { WorkspaceRole } from "@/db/schema";
import { updateWorkspaceRole } from "./actions";

export function RoleForm({ current }: { current: WorkspaceRole }) {
  const [state, formAction] = useActionState(updateWorkspaceRole, null);
  const { push } = useToast();
  const success = state?.ok ? state.data : null;

  useEffect(() => {
    if (success) {
      push({
        tone: "success",
        title: "Rolle aktualisiert",
        body: `Workspace-Rolle: ${ROLE_META[success.role as WorkspaceRole].label}. Navigation wurde angepasst.`,
      });
    }
  }, [success, push]);

  return (
    <form action={formAction} id="rolle" className="space-y-6 scroll-mt-24">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          Workspace · Rolle
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          Rolle dieses Workspace im Bauprojekt
        </h2>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl leading-relaxed">
          Die Rolle bestimmt UI-Fokus, Modul-Reihenfolge, Vorlagen und die
          Perspektive des Recht-Assistenten. Auftragnehmer-Workspaces sehen
          Bautagebuch und Anordnungs-Check oben; Auftraggeber-Workspaces sehen
          Mängelrüge und Vergabe-Sicht. Die Daten bleiben unverändert — nur die
          Sicht wechselt.
        </p>
      </div>

      <fieldset className="grid gap-3 md:grid-cols-2">
        <legend className="sr-only">Rolle wählen</legend>
        {ALL_ROLES.map((role) => {
          const meta = ROLE_META[role];
          const isCurrent = role === current;
          return (
            <label
              key={role}
              className="flex flex-col gap-3 border border-[color:var(--color-border)] rounded-md p-4 cursor-pointer hover:border-[color:var(--color-accent)] transition-colors has-[input:checked]:border-[color:var(--color-accent)] has-[input:checked]:bg-[color:var(--color-bg-subtle)]"
            >
              <div className="flex items-start gap-3">
                <input
                  type="radio"
                  name="workspaceRole"
                  value={role}
                  defaultChecked={isCurrent}
                  className="mt-1 accent-[color:var(--color-accent)]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                        {meta.shortLabel}
                      </span>
                      <span className="text-base font-medium text-[color:var(--color-fg)]">
                        {meta.label}
                      </span>
                    </div>
                    {isCurrent ? (
                      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-success)] inline-flex items-center gap-1">
                        <Check size={10} aria-hidden /> aktuell
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-xs italic text-[color:var(--color-fg-muted)]">
                    {meta.tagline}
                  </p>
                  <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                    {meta.description}
                  </p>
                </div>
              </div>
              <ul className="text-[11px] text-[color:var(--color-fg-muted)] space-y-1 pl-7">
                {meta.focus.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-[color:var(--color-accent)] shrink-0">·</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </label>
          );
        })}
      </fieldset>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Wird gespeichert …" : "Rolle speichern"}
    </button>
  );
}
