"use client";

import { Link } from "@/i18n/navigation";
import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { updateProject } from "../../actions";
import type { Project } from "@/db/schema";

export function EditProjectForm({ project }: { project: Project }) {
  const [state, formAction] = useActionState(updateProject, null);
  const { push } = useToast();
  const router = useRouter();
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;
  const success = state?.ok ? state.data : null;

  useEffect(() => {
    if (success) {
      push({ tone: "success", title: "Projekt aktualisiert" });
      router.push(`/projekte/${success.id}`);
    }
  }, [success, push, router]);

  return (
    <form action={formAction} className="mt-10 space-y-10">
      <input type="hidden" name="id" value={project.id} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm">
          {formError}
        </div>
      ) : null}

      <Section title="Stammdaten">
        <Field
          id="identifier"
          label="BV-Nummer"
          defaultValue={project.identifier}
          mono
          required
          errors={fieldErrors?.identifier}
        />
        <Field
          id="name"
          label="Bauvorhaben"
          defaultValue={project.name}
          required
          errors={fieldErrors?.name}
        />
        <Field
          id="ag"
          label="Auftraggeber"
          defaultValue={project.ag}
          required
          errors={fieldErrors?.ag}
        />
        <Field
          id="siteAddress"
          label="Standort der Baustelle"
          defaultValue={project.siteAddress ?? ""}
          errors={fieldErrors?.siteAddress}
        />
      </Section>

      <Section title="Auftrag und Fortschritt">
        <div className="grid grid-cols-2 gap-8">
          <Field
            id="value"
            label="Auftragsvolumen netto (€)"
            defaultValue={String(project.value)}
            type="number"
            mono
            required
            errors={fieldErrors?.value}
          />
          <Field
            id="progress"
            label="Fortschritt (0–1)"
            defaultValue={String(project.progress)}
            placeholder="0.62"
            type="number"
            mono
            hint="0.0 = 0 % · 1.0 = 100 %"
            errors={fieldErrors?.progress}
          />
        </div>
        <SelectField
          id="status"
          label="Status"
          defaultValue={project.status}
          options={[
            { value: "Geplant", label: "Geplant" },
            { value: "Bauphase", label: "Bauphase" },
            { value: "Abnahme", label: "Abnahme" },
            { value: "Gewährleistung", label: "Gewährleistung" },
            { value: "Abgeschlossen", label: "Abgeschlossen" },
          ]}
          errors={fieldErrors?.status}
        />
        <SelectField
          id="contractType"
          label="Vertragsgrundlage"
          defaultValue={project.contractType ?? ""}
          options={[
            { value: "", label: "(nicht festgelegt)" },
            { value: "vob_vertrag", label: "VOB-Vertrag" },
            { value: "bgb_werkvertrag", label: "BGB-Werkvertrag" },
            {
              value: "verbraucherbauvertrag",
              label: "Verbraucherbauvertrag (§ 650i BGB)",
            },
          ]}
          errors={fieldErrors?.contractType}
        />
      </Section>

      <Section title="Termine">
        <div className="grid grid-cols-2 gap-8">
          <Field
            id="contractDate"
            label="Vertragsdatum"
            defaultValue={project.contractDate ?? ""}
            type="date"
            mono
            errors={fieldErrors?.contractDate}
          />
          <Field
            id="plannedCompletion"
            label="Geplante Fertigstellung"
            defaultValue={project.plannedCompletion ?? ""}
            type="date"
            mono
            errors={fieldErrors?.plannedCompletion}
          />
        </div>
        <div className="grid grid-cols-2 gap-8">
          <Field
            id="abnahmeDate"
            label="Tatsächliche Abnahme"
            defaultValue={project.abnahmeDate ?? ""}
            type="date"
            mono
            errors={fieldErrors?.abnahmeDate}
          />
          <Field
            id="warrantyEnd"
            label="Ende Gewährleistung"
            defaultValue={project.warrantyEnd ?? ""}
            type="date"
            mono
            errors={fieldErrors?.warrantyEnd}
          />
        </div>
      </Section>

      <Section title="Sicherheiten und Klauseln">
        <div className="grid grid-cols-2 gap-8 items-start">
          <Field
            id="securityRetentionPercent"
            label="Sicherheitseinbehalt (%)"
            defaultValue={
              project.securityRetentionPercent !== null &&
              project.securityRetentionPercent !== undefined
                ? String(project.securityRetentionPercent)
                : ""
            }
            type="number"
            mono
            errors={fieldErrors?.securityRetentionPercent}
          />
          <Checkbox
            id="penaltyClauseAgreed"
            label="Vertragsstrafe vereinbart"
            defaultChecked={project.penaltyClauseAgreed}
          />
        </div>
      </Section>

      <Section title="Notizen">
        <Textarea
          id="notes"
          label="Interne Notizen"
          defaultValue={project.notes ?? ""}
          rows={4}
          errors={fieldErrors?.notes}
        />
      </Section>

      <div className="flex justify-end gap-3 pt-6 border-t border-[color:var(--color-border)]">
        <Link
          href={`/projekte/${project.id}`}
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="space-y-6">
      <legend className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
        {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  id,
  label,
  defaultValue,
  placeholder,
  type = "text",
  mono,
  required,
  hint,
  errors,
}: {
  id: string;
  label: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        aria-invalid={hasError || undefined}
        className={
          "w-full bg-transparent border-b py-2.5 text-base text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:outline-none transition-colors " +
          (hasError
            ? "border-[color:var(--color-critical)]"
            : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]") +
          (mono ? " font-mono" : "")
        }
      />
      {hasError ? (
        <p className="mt-1 text-xs text-[color:var(--color-critical)]">{errors[0]}</p>
      ) : hint ? (
        <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">{hint}</p>
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
        <p className="mt-1 text-xs text-[color:var(--color-critical)]">{errors[0]}</p>
      ) : null}
    </div>
  );
}

function Checkbox({
  id,
  label,
  defaultChecked,
}: {
  id: string;
  label: string;
  defaultChecked?: boolean;
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
        defaultChecked={defaultChecked}
        className="mt-1 accent-[color:var(--color-accent)]"
      />
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-fg)]">
        {label}
      </span>
    </label>
  );
}

function Textarea({
  id,
  label,
  defaultValue,
  rows = 3,
  errors,
}: {
  id: string;
  label: string;
  defaultValue?: string;
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
        defaultValue={defaultValue}
        className={
          "w-full bg-transparent border rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none transition-colors resize-y " +
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
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Speichere …" : "Änderungen speichern"}
    </button>
  );
}
