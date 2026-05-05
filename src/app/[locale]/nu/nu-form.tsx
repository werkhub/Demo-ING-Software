"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { createSubcontractor } from "./actions";

type ProjectMin = { id: string; identifier: string; name: string };

export function NuForm({ projects }: { projects: ProjectMin[] }) {
  const [state, formAction] = useActionState(createSubcontractor, null);
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
      push({ tone: "success", title: "Nachunternehmer erfasst" });
    }
  }, [success, push]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
      >
        + Nachunternehmer erfassen
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-5 space-y-4"
    >
      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          id="projectId"
          label="Projekt"
          defaultValue={projects[0]?.id ?? ""}
          options={projects.map((p) => ({
            value: p.id,
            label: `${p.identifier} · ${p.name}`,
          }))}
        />
        <Field id="name" label="Ansprechpartner" required errors={fieldErrors?.name} />
      </div>

      <Field id="organization" label="NU-Firma" />

      <div className="grid gap-3 md:grid-cols-2">
        <Field id="gewerk" label="Gewerk" required placeholder="z. B. Trockenbau" errors={fieldErrors?.gewerk} />
        <Field id="contractValue" label="Vertragsvolumen netto (€)" type="number" mono />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <SelectField
          id="contractType"
          label="Vertragsgrundlage"
          defaultValue=""
          options={[
            { value: "", label: "(nicht festgelegt)" },
            { value: "vob_vertrag", label: "VOB-Vertrag" },
            { value: "bgb_werkvertrag", label: "BGB-Werkvertrag" },
          ]}
        />
        <SelectField
          id="passThroughStatus"
          label="Pass-Through-Status"
          defaultValue="nicht_geprueft"
          options={[
            { value: "nicht_geprueft", label: "Noch nicht geprüft" },
            { value: "klausel_vorhanden", label: "Klausel vorhanden" },
            { value: "klausel_fehlend", label: "Klausel fehlt" },
            { value: "konfliktig", label: "Konfliktig" },
          ]}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field id="email" label="E-Mail" type="email" errors={fieldErrors?.email} />
        <Field id="phone" label="Telefon" />
      </div>

      <div className="grid gap-3 md:grid-cols-2 pt-2">
        <CheckboxField
          id="isForeign"
          label="Ausländischer NU"
          help="Aktiviert A1-Bescheinigungs-Pflicht (VO 883/2004)"
        />
        <CheckboxField
          id="requiresCompliance"
          label="Compliance-Prüfung aktiv"
          defaultChecked
          tristate
          help={'Aus für Sonderfälle (Architekt/Sachverständiger als „NU" geführt)'}
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
  type = "text",
  mono,
  required,
  placeholder,
  errors,
}: {
  id: string;
  label: string;
  type?: string;
  mono?: boolean;
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
        type={type}
        required={required}
        placeholder={placeholder}
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

/**
 * Checkbox mit Label + optionalem Hilfe-Text.
 *
 * `tristate` aktiviert das Standard-HTML-Pattern für Bool-Checkboxes mit
 * explizitem False-Wert: ein Hidden-Field mit gleichem name + value="false"
 * VOR der Checkbox. `formDataToObject` schreibt last-write-wins, also:
 *   - Checkbox checked   → "false" (hidden) → "true"  (overwrites) ⇒ true
 *   - Checkbox unchecked → "false" (hidden) → nichts            ⇒ false
 * Damit kann das Schema zwischen „Default" und „explizit aus" unterscheiden.
 */
function CheckboxField({
  id,
  label,
  defaultChecked,
  tristate,
  help,
}: {
  id: string;
  label: string;
  defaultChecked?: boolean;
  tristate?: boolean;
  help?: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2 text-sm cursor-pointer select-none"
    >
      {tristate ? <input type="hidden" name={id} value="false" /> : null}
      <input
        id={id}
        name={id}
        type="checkbox"
        defaultChecked={defaultChecked}
        value={tristate ? "true" : "on"}
        className="mt-0.5 h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-accent)] focus:ring-[color:var(--color-accent)]"
      />
      <span>
        <span className="font-medium text-[color:var(--color-fg)]">{label}</span>
        {help ? (
          <span className="block text-[11px] text-[color:var(--color-fg-muted)] mt-0.5">
            {help}
          </span>
        ) : null}
      </span>
    </label>
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
