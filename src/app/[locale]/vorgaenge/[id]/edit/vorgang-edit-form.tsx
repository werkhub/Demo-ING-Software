"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { Vorgang } from "@/db/schema";
import { updateVorgang } from "../../actions";
import {
  VORGANG_CATEGORY_LABEL,
  VORGANG_STATUS_LABEL,
} from "@/lib/vorgang";
import type { VorgangCategory, VorgangStatus } from "@/db/schema";

type ProjectOption = { id: string; identifier: string; name: string };
type UserOption = { id: string; name: string };

export function VorgangEditForm({
  vorgang,
  projects,
  users,
}: {
  vorgang: Vorgang;
  projects: ProjectOption[];
  users: UserOption[];
}) {
  const [state, action, isPending] = useActionState(updateVorgang, null);
  const router = useRouter();

  useEffect(() => {
    if (state?.ok) {
      router.push(`/vorgaenge/${vorgang.id}`);
      router.refresh();
    }
  }, [state, router, vorgang.id]);

  return (
    <form action={action} className="grid gap-5 max-w-2xl">
      <input type="hidden" name="id" value={vorgang.id} />
      <Field label="Titel" name="title" defaultValue={vorgang.title} required />
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField label="Kategorie" name="category" defaultValue={vorgang.category}>
          {(Object.keys(VORGANG_CATEGORY_LABEL) as VorgangCategory[]).map((c) => (
            <option key={c} value={c}>
              {VORGANG_CATEGORY_LABEL[c]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Status" name="status" defaultValue={vorgang.status}>
          {(Object.keys(VORGANG_STATUS_LABEL) as VorgangStatus[]).map((s) => (
            <option key={s} value={s}>
              {VORGANG_STATUS_LABEL[s]}
            </option>
          ))}
        </SelectField>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <SelectField label="Projekt" name="projectId" defaultValue={vorgang.projectId ?? ""}>
          <option value="">— ohne Projekt —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.identifier} · {p.name}
            </option>
          ))}
        </SelectField>
        <SelectField
          label="Verantwortlich"
          name="assignedTo"
          defaultValue={vorgang.assignedTo ?? ""}
        >
          <option value="">— offen —</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </SelectField>
      </div>
      <Field
        label="Bearbeitungsfrist (YYYY-MM-DD)"
        name="dueDate"
        defaultValue={vorgang.dueDate ?? ""}
        placeholder="2026-06-15"
      />

      {state && !state.ok && state.formError ? (
        <p className="text-sm text-[color:var(--color-critical)]">
          {state.formError}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-5 py-2.5 transition-colors disabled:opacity-50"
        >
          {isPending ? "Speichert…" : "Speichern"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
        >
          Abbrechen
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 focus:outline-none focus:border-[color:var(--color-accent)]"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  defaultValue,
  children,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 focus:outline-none focus:border-[color:var(--color-accent)]"
      >
        {children}
      </select>
    </label>
  );
}
