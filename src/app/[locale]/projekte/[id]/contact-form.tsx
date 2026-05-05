"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { createContact } from "./contact-actions";

export function ContactForm({ projectId }: { projectId: string }) {
  const [state, formAction] = useActionState(createContact, null);
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
      push({ tone: "success", title: "Kontakt angelegt" });
    }
  }, [success, push]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
      >
        + Kontakt hinzufügen
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-4 space-y-3"
    >
      <input type="hidden" name="projectId" value={projectId} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-xs">
          {formError}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          id="role"
          label="Rolle"
          defaultValue="ag_vertreter"
          options={[
            { value: "ag_vertreter", label: "AG-Vertreter" },
            { value: "architekt", label: "Architekt" },
            { value: "fachplaner", label: "Fachplaner" },
            { value: "bauleiter_ag", label: "Bauleiter AG" },
            { value: "nachunternehmer", label: "Nachunternehmer" },
            { value: "sachverstaendiger", label: "Sachverständiger" },
            { value: "anwalt", label: "Anwalt" },
            { value: "sonstiges", label: "Sonstiges" },
          ]}
        />
        <Field id="name" label="Name" required errors={fieldErrors?.name} />
      </div>

      <Field id="organization" label="Organisation (optional)" errors={fieldErrors?.organization} />

      <div className="grid grid-cols-2 gap-3">
        <Field id="email" label="E-Mail" type="email" errors={fieldErrors?.email} />
        <Field id="phone" label="Telefon" errors={fieldErrors?.phone} />
      </div>

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
  required,
  errors,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
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
        required={required}
        className={
          "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none transition-colors " +
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
