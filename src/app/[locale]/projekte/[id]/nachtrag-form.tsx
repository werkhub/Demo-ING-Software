"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { createNachtrag } from "./nachtrag-actions";

export function NachtragForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(createNachtrag, null);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const { push } = useToast();
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;
  const success = state?.ok ? state.data : null;

  useEffect(() => {
    if (success) {
      formRef.current?.reset();
      setOpen(false);
      push({ tone: "success", title: "Nachtrag angelegt" });
    }
  }, [success, push]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
      >
        + Nachtrag hinzufügen
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-4 space-y-4"
    >
      <input type="hidden" name="projectId" value={projectId} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-xs">
          {formError}
        </div>
      ) : null}

      <Field id="title" label="Titel" required errors={fieldErrors?.title} placeholder="Türmodell DIN 18101 → DIN 18101-XL" />

      <div className="grid grid-cols-2 gap-4">
        <Field
          id="value"
          label="Volumen netto (€)"
          type="number"
          mono
          defaultValue="0"
          errors={fieldErrors?.value}
        />
        <SelectField
          id="trigger"
          label="Auslöser"
          defaultValue=""
          options={[
            { value: "", label: "(unbestimmt)" },
            { value: "anordnung_ag", label: "AG-Anordnung" },
            { value: "bauseits_geaendert", label: "Bauseits geändert" },
            { value: "mengenmehrung", label: "Mengenmehrung" },
            { value: "behinderung", label: "Behinderung" },
            { value: "sonstiges", label: "Sonstiges" },
          ]}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          id="legalBasis"
          label="Rechtliche Basis"
          placeholder="§ 2 Abs. 5 VOB/B"
          errors={fieldErrors?.legalBasis}
        />
        <SelectField
          id="status"
          label="Status"
          defaultValue="entwurf"
          options={[
            { value: "entwurf", label: "Entwurf" },
            { value: "angekuendigt", label: "Angekündigt" },
            { value: "eingereicht", label: "Eingereicht" },
            { value: "anerkannt", label: "Anerkannt" },
            { value: "abgelehnt", label: "Abgelehnt" },
            { value: "geschlossen", label: "Geschlossen" },
          ]}
        />
      </div>

      <Textarea
        id="description"
        label="Beschreibung (optional)"
        rows={3}
        errors={fieldErrors?.description}
      />

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-3 py-1.5 transition-colors"
        >
          Abbrechen
        </button>
        <SubmitButton />
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  mono,
  required,
  defaultValue,
  placeholder,
  errors,
}: {
  id: string;
  label: string;
  type?: string;
  mono?: boolean;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  errors?: string[];
}) {
  const hasError = !!errors?.length;
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className={
          "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none transition-colors " +
          (hasError
            ? "border-[color:var(--color-critical)]"
            : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]") +
          (mono ? " font-mono" : "")
        }
      />
      {hasError ? (
        <p className="mt-1 text-xs text-[color:var(--color-critical)]">{errors[0]}</p>
      ) : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  defaultValue,
  options,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue}
        className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Textarea({
  id,
  label,
  rows = 3,
  errors,
}: {
  id: string;
  label: string;
  rows?: number;
  errors?: string[];
}) {
  const hasError = !!errors?.length;
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
      >
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        className={
          "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none transition-colors resize-y " +
          (hasError
            ? "border-[color:var(--color-critical)]"
            : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
        }
      />
      {hasError ? (
        <p className="mt-1 text-xs text-[color:var(--color-critical)]">{errors[0]}</p>
      ) : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Speichere …" : "Anlegen"}
    </button>
  );
}
