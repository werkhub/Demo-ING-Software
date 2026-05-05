"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createBauwerk } from "../actions";

const BAUWERKSARTEN: Array<{ value: string; label: string }> = [
  { value: "bruecke", label: "Brücke" },
  { value: "tunnel", label: "Tunnel" },
  { value: "stuetzmauer", label: "Stützmauer" },
  { value: "laermschutzwand", label: "Lärmschutzwand" },
  { value: "ueberfuehrung", label: "Überführung" },
  { value: "unterfuehrung", label: "Unterführung" },
  { value: "sonstiges", label: "Sonstiges" },
];

export function BauwerkForm({ projektId }: { projektId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createBauwerk, null);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/projekte/${projektId}/bauwerke/${state.data.id}`);
    }
  }, [state, projektId, router]);

  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="projektId" value={projektId} />

      <div className="grid grid-cols-2 gap-3">
        <Field
          name="bauwerksnummer"
          label="Bauwerksnummer"
          required
          placeholder="BW-7"
          errors={state?.ok === false ? state.fieldErrors?.bauwerksnummer : undefined}
        />
        <SelectField
          name="bauwerksart"
          label="Art"
          options={BAUWERKSARTEN}
          required
          defaultValue="bruecke"
        />
      </div>

      <Field
        name="bezeichnung"
        label="Bezeichnung"
        required
        placeholder="Eisenbahnüberführung Mülheimer Brücke"
        errors={state?.ok === false ? state.fieldErrors?.bezeichnung : undefined}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          name="baujahr"
          label="Baujahr"
          type="number"
          placeholder="1987"
          min={1800}
          max={2100}
        />
        <Field
          name="letzteHauptpruefungAm"
          label="Letzte Hauptprüfung"
          type="date"
        />
      </div>

      <Field
        name="notes"
        label="Notizen"
        textarea
        placeholder="Lage, Besonderheiten, Auftraggeber-Hinweise…"
      />

      {state?.ok === false && state.formError ? (
        <p className="text-sm text-[color:var(--color-danger)]">{state.formError}</p>
      ) : null}

      <div className="flex gap-3 pt-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-50"
        >
          {pending ? "Speichert…" : "Bauwerk anlegen"}
        </button>
      </div>
    </form>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  placeholder,
  textarea,
  errors,
  min,
  max,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  textarea?: boolean;
  errors?: string[];
  min?: number;
  max?: number;
}) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        {label}
        {required ? " *" : ""}
      </span>
      {textarea ? (
        <textarea
          name={name}
          required={required}
          placeholder={placeholder}
          rows={3}
          className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
        />
      ) : (
        <input
          name={name}
          type={type}
          required={required}
          placeholder={placeholder}
          min={min}
          max={max}
          className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
        />
      )}
      {errors?.length ? (
        <p className="mt-1 text-xs text-[color:var(--color-danger)]">
          {errors[0]}
        </p>
      ) : null}
    </label>
  );
}

function SelectField({
  name,
  label,
  options,
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        {label}
        {required ? " *" : ""}
      </span>
      <select
        name={name}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
