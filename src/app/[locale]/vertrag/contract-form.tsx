"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { scanContract } from "@/lib/contract-risk-scan";
import { createContract } from "./actions";

type ProjectMin = { id: string; identifier: string; name: string };

export function ContractForm({ projects }: { projects: ProjectMin[] }) {
  const [state, formAction] = useActionState(createContract, null);
  const formRef = useRef<HTMLFormElement>(null);
  const [text, setText] = useState("");
  const { push } = useToast();

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;
  const success = state?.ok ? state.data : null;

  useEffect(() => {
    if (success) {
      formRef.current?.reset();
      setText("");
      push({ tone: "success", title: "Vertrag gespeichert + gescannt" });
    }
  }, [success, push]);

  const livePreview = useMemo(() => {
    if (text.trim().length < 30) return null;
    return scanContract(text);
  }, [text]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-5 space-y-5"
    >
      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="title" label="Bezeichnung" required errors={fieldErrors?.title} placeholder="Hauptvertrag BV-2024-014" />
        <SelectField
          id="kind"
          label="Art"
          defaultValue="hauptvertrag"
          options={[
            { value: "hauptvertrag", label: "Hauptvertrag" },
            { value: "nachtragsvertrag", label: "Nachtragsvertrag" },
            { value: "buergschaft", label: "Bürgschaft" },
            { value: "vereinbarung", label: "Vereinbarung" },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          id="projectId"
          label="Projekt"
          defaultValue={projects[0]?.id ?? ""}
          options={projects.map((p) => ({
            value: p.id,
            label: `${p.identifier} · ${p.name}`,
          }))}
        />
        <Field id="signedAt" label="Unterschrieben am" type="date" mono />
        <Field id="partyAg" label="AG (Vertragspartei)" />
      </div>

      <Field id="partyAn" label="AN (Vertragspartei)" />

      <div>
        <label
          htmlFor="contractText"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
        >
          Vertragstext (Volltext einkopieren)
        </label>
        <textarea
          id="contractText"
          name="contractText"
          rows={14}
          required
          minLength={20}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Den vollständigen Vertragstext hier einfügen — wird beim Speichern automatisch auf Risiko-Klauseln gescannt."
          className={
            "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-[13px] text-[color:var(--color-fg)] focus:outline-none transition-colors resize-y font-mono " +
            (fieldErrors?.contractText
              ? "border-[color:var(--color-critical)]"
              : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
          }
        />
        {fieldErrors?.contractText?.[0] ? (
          <p className="mt-1 text-xs text-[color:var(--color-critical)]">
            {fieldErrors.contractText[0]}
          </p>
        ) : null}
        <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
          {text.length} Zeichen
          {livePreview
            ? ` · Live-Scan: ${livePreview.findings.length} Findings, Score ${livePreview.score}/100`
            : ""}
        </p>
      </div>

      {livePreview && livePreview.findings.length > 0 ? (
        <div className="border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] rounded-md p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)] mb-2">
            Live-Scan · Vorschau ({livePreview.findings.length} Findings)
          </p>
          <ul className="space-y-1 text-xs text-[color:var(--color-fg)]">
            {livePreview.findings.slice(0, 3).map((f, i) => (
              <li key={i}>
                <strong>{f.title}</strong> — {f.basis}
              </li>
            ))}
            {livePreview.findings.length > 3 ? (
              <li className="text-[color:var(--color-fg-muted)]">
                + {livePreview.findings.length - 3} weitere — sichtbar nach Speichern
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <Field id="notes" label="Notizen (optional)" type="text" />

      <div className="flex items-center justify-end gap-2">
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
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Scanne + Speichere …" : "Vertrag speichern + scannen"}
    </button>
  );
}
