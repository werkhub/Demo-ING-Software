"use client";

import { Link } from "@/i18n/navigation";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProject } from "../actions";

export function NewProjectForm() {
  const [state, formAction] = useActionState(createProject, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;

  return (
    <form action={formAction} className="mt-10 space-y-10">
      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm">
          {formError}
        </div>
      ) : null}

      <Section title="Stammdaten" required>
        <Field
          id="identifier"
          label="BV-Nummer"
          placeholder="BV-2026-001"
          mono
          required
          errors={fieldErrors?.identifier}
        />
        <Field
          id="name"
          label="Bauvorhaben"
          placeholder="Sporthalle Köln-Mülheim"
          required
          errors={fieldErrors?.name}
        />
        <Field
          id="ag"
          label="Auftraggeber"
          placeholder="Stadt Köln · Hochbauamt"
          required
          errors={fieldErrors?.ag}
        />
        <Field
          id="siteAddress"
          label="Standort der Baustelle"
          placeholder="Hauptstr. 12, 50667 Köln"
          errors={fieldErrors?.siteAddress}
        />
      </Section>

      <Section title="Auftrag und Vertrag">
        <div className="grid grid-cols-2 gap-8">
          <Field
            id="value"
            label="Auftragsvolumen netto (€)"
            placeholder="2500000"
            type="number"
            mono
            required
            errors={fieldErrors?.value}
          />
          <SelectField
            id="status"
            label="Status"
            defaultValue="Bauphase"
            options={[
              { value: "Geplant", label: "Geplant (vor Ausführung)" },
              { value: "Bauphase", label: "Bauphase (Ausführung)" },
              { value: "Abnahme", label: "Abnahme (Übergang)" },
              { value: "Gewährleistung", label: "Gewährleistung" },
              { value: "Abgeschlossen", label: "Abgeschlossen" },
            ]}
            errors={fieldErrors?.status}
          />
        </div>
        <SelectField
          id="contractType"
          label="Vertragsgrundlage"
          defaultValue=""
          options={[
            { value: "", label: "(später festlegen)" },
            { value: "vob_vertrag", label: "VOB-Vertrag (typisch öffentliche AG)" },
            { value: "bgb_werkvertrag", label: "BGB-Werkvertrag" },
            { value: "verbraucherbauvertrag", label: "Verbraucherbauvertrag (§ 650i BGB)" },
          ]}
          errors={fieldErrors?.contractType}
        />
      </Section>

      <Section title="Termine">
        <div className="grid grid-cols-2 gap-8">
          <Field
            id="contractDate"
            label="Vertragsdatum"
            type="date"
            mono
            errors={fieldErrors?.contractDate}
          />
          <Field
            id="plannedCompletion"
            label="Geplante Fertigstellung"
            type="date"
            mono
            errors={fieldErrors?.plannedCompletion}
          />
        </div>
        <div className="grid grid-cols-2 gap-8">
          <Field
            id="abnahmeDate"
            label="Tatsächliche Abnahme"
            type="date"
            mono
            hint="Beginn der Gewährleistungsfrist"
            errors={fieldErrors?.abnahmeDate}
          />
          <Field
            id="warrantyEnd"
            label="Ende Gewährleistung"
            type="date"
            mono
            hint="typ. +5 J. (BGB) bzw. +4 J. (VOB)"
            errors={fieldErrors?.warrantyEnd}
          />
        </div>
      </Section>

      <Section title="Sicherheiten und Klauseln">
        <div className="grid grid-cols-2 gap-8">
          <Field
            id="securityRetentionPercent"
            label="Sicherheitseinbehalt (%)"
            placeholder="5"
            type="number"
            mono
            hint="typ. 5 % nach § 17 VOB/B"
            errors={fieldErrors?.securityRetentionPercent}
          />
          <Checkbox
            id="penaltyClauseAgreed"
            label="Vertragsstrafe vereinbart"
            hint="aktiviert Höchstgrenzen-Hinweise (BGH 5 % / 0,3 % je WT)"
          />
        </div>
      </Section>

      <Section title="Notizen (optional)">
        <Textarea
          id="notes"
          label="Interne Notizen"
          placeholder="Frei für eigene Anmerkungen, Telefonate, Beobachtungen …"
          rows={4}
          errors={fieldErrors?.notes}
        />
      </Section>

      <div className="flex justify-end gap-3 pt-6 border-t border-[color:var(--color-border)]">
        <Link
          href="/projekte"
          className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-4 py-2.5 transition-colors"
        >
          Abbrechen
        </Link>
        <SubmitButton />
      </div>
    </form>
  );
}

function Section({
  title,
  required,
  children,
}: {
  title: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-6">
      <legend className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
        {title}
        {required ? (
          <span className="text-[color:var(--color-critical)] ml-1">*</span>
        ) : null}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  id,
  label,
  placeholder,
  type = "text",
  mono,
  required,
  hint,
  errors,
}: {
  id: string;
  label: string;
  placeholder?: string;
  type?: string;
  mono?: boolean;
  required?: boolean;
  hint?: string;
  errors?: string[];
}) {
  const hasError = !!errors?.length;
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
      >
        {label}
        {required ? <span className="text-[color:var(--color-critical)]"> *</span> : null}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        required={required}
        placeholder={placeholder}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={
          "w-full bg-transparent border-b py-2.5 text-base text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:outline-none transition-colors " +
          (hasError
            ? "border-[color:var(--color-critical)] focus:border-[color:var(--color-critical)]"
            : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]") +
          (mono ? " font-mono" : "")
        }
      />
      {hasError ? (
        <p
          id={`${id}-error`}
          className="mt-1 text-xs text-[color:var(--color-critical)]"
        >
          {errors[0]}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

function SelectField({
  id,
  label,
  options,
  defaultValue,
  errors,
}: {
  id: string;
  label: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  errors?: string[];
}) {
  const hasError = !!errors?.length;
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
      >
        {label}
      </label>
      <select
        id={id}
        name={id}
        defaultValue={defaultValue}
        className={
          "w-full bg-transparent border-b py-2.5 text-base text-[color:var(--color-fg)] focus:outline-none transition-colors " +
          (hasError
            ? "border-[color:var(--color-critical)]"
            : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
        }
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {hasError ? (
        <p className="mt-1 text-xs text-[color:var(--color-critical)]">
          {errors[0]}
        </p>
      ) : null}
    </div>
  );
}

function Checkbox({
  id,
  label,
  hint,
}: {
  id: string;
  label: string;
  hint?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-3 border border-[color:var(--color-border)] rounded-md p-3 cursor-pointer hover:border-[color:var(--color-accent)] transition-colors has-[input:checked]:border-[color:var(--color-accent)] has-[input:checked]:bg-[color:var(--color-bg-subtle)]"
    >
      <input
        id={id}
        name={id}
        type="checkbox"
        className="mt-1 accent-[color:var(--color-accent)]"
      />
      <div className="flex-1 min-w-0">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg)]">
          {label}
        </span>
        {hint ? (
          <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)] leading-relaxed">
            {hint}
          </p>
        ) : null}
      </div>
    </label>
  );
}

function Textarea({
  id,
  label,
  placeholder,
  rows = 3,
  errors,
}: {
  id: string;
  label: string;
  placeholder?: string;
  rows?: number;
  errors?: string[];
}) {
  const hasError = !!errors?.length;
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
      >
        {label}
      </label>
      <textarea
        id={id}
        name={id}
        rows={rows}
        placeholder={placeholder}
        className={
          "w-full bg-transparent border rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:outline-none transition-colors resize-y " +
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Wird angelegt …" : <>Projekt anlegen <span aria-hidden>→</span></>}
    </button>
  );
}
