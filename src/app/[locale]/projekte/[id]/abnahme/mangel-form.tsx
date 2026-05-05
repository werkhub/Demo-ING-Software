"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { MANGEL_PRIORITAET_LABEL } from "@/lib/maengel";
import type { MangelPrioritaet } from "@/db/schema";
import { addMangel } from "./abnahme-actions";

export function MangelForm({ abnahmeId }: { abnahmeId: string }) {
  const [state, formAction] = useActionState(addMangel, null);
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
      push({ tone: "success", title: "Mangel erfasst" });
    }
  }, [success, push]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
      >
        + Mangel erfassen
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-5 space-y-4"
    >
      <input type="hidden" name="abnahmeId" value={abnahmeId} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="beschreibung"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Beschreibung
        </label>
        <textarea
          id="beschreibung"
          name="beschreibung"
          rows={3}
          required
          minLength={5}
          maxLength={2000}
          placeholder="z. B. Risse Putz Treppenhaus 1.OG — 18 m² horizontale Risse..."
          className={
            "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors " +
            (fieldErrors?.beschreibung
              ? "border-[color:var(--color-critical)]"
              : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
          }
        />
        {fieldErrors?.beschreibung ? (
          <p className="mt-1 text-xs text-[color:var(--color-critical)]">
            {fieldErrors.beschreibung[0]}
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <SelectField
          id="prioritaet"
          label="Priorität"
          defaultValue="mittel"
          options={(["niedrig", "mittel", "hoch", "kritisch"] as MangelPrioritaet[]).map(
            (p) => ({
              value: p,
              label: MANGEL_PRIORITAET_LABEL[p],
            })
          )}
        />
        <Field id="kategorie" label="Kategorie/Gewerk" placeholder="z. B. Putz" />
        <Field
          id="ortImBauwerk"
          label="Ort/Bauteil"
          placeholder="z. B. EG, Raum 1.04"
        />
      </div>

      <div>
        <label
          htmlFor="fristsetzungDatum"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Fristsetzung (optional)
        </label>
        <input
          id="fristsetzungDatum"
          name="fristsetzungDatum"
          type="date"
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
        />
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
  required,
  placeholder,
  errors,
}: {
  id: string;
  label: string;
  required?: boolean;
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
        type="text"
        required={required}
        placeholder={placeholder}
        className={
          "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors " +
          (hasError
            ? "border-[color:var(--color-critical)]"
            : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
        }
      />
      {hasError ? (
        <p className="mt-1 text-xs text-[color:var(--color-critical)]">
          {errors[0]}
        </p>
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
        className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
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
      {pending ? "Speichere …" : "Mangel erfassen"}
    </button>
  );
}
