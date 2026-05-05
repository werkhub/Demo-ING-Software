"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import {
  CERTIFICATE_LABELS,
  CERTIFICATE_LEGAL_BASIS,
  CERTIFICATE_TYPICAL_VALIDITY_DAYS,
} from "@/lib/compliance/nu";
import type { SubcontractorCertificateKind } from "@/db/schema";
import { addCertificate } from "./actions";

const KIND_OPTIONS: SubcontractorCertificateKind[] = [
  "freistellung_48b",
  "unbedenklich_finanzamt",
  "soka_bau",
  "unbedenklich_kk",
  "bg_bau",
  "mindestlohn",
  "a1_entsendung",
  "gewerbeanmeldung",
  "haftpflicht",
];

function defaultValidUntil(kind: SubcontractorCertificateKind): string {
  const days = CERTIFICATE_TYPICAL_VALIDITY_DAYS[kind];
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function CertForm({
  subcontractorId,
  presetKind,
}: {
  subcontractorId: string;
  /** Wenn gesetzt: Form öffnet vorbereitet für genau diese Bescheinigungs-Art. */
  presetKind?: SubcontractorCertificateKind;
}) {
  const [state, formAction] = useActionState(addCertificate, null);
  const [open, setOpen] = useState(!!presetKind);
  const [kind, setKind] = useState<SubcontractorCertificateKind>(
    presetKind ?? "freistellung_48b"
  );
  const formRef = useRef<HTMLFormElement>(null);
  const { push } = useToast();
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;
  const success = state?.ok ? state.data : null;

  useEffect(() => {
    if (success) {
      formRef.current?.reset();
      setOpen(false);
      push({ tone: "success", title: "Bescheinigung gespeichert" });
    }
  }, [success, push]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
      >
        + Bescheinigung erfassen
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      encType="multipart/form-data"
      className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-5 space-y-4"
    >
      <input type="hidden" name="subcontractorId" value={subcontractorId} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="kind"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Bescheinigungs-Art
        </label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(e) =>
            setKind(e.target.value as SubcontractorCertificateKind)
          }
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        >
          {KIND_OPTIONS.map((k) => (
            <option key={k} value={k}>
              {CERTIFICATE_LABELS[k]}
            </option>
          ))}
        </select>
        <p className="mt-1 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
          Rechtsgrundlage: {CERTIFICATE_LEGAL_BASIS[kind]}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <DateField
          id="issuedAt"
          label="Ausgestellt am (optional)"
          errors={fieldErrors?.issuedAt}
        />
        <DateField
          id="validUntil"
          label="Gültig bis"
          required
          defaultValue={defaultValidUntil(kind)}
          key={kind} /* erzwingt Re-Render bei Kind-Wechsel */
          errors={fieldErrors?.validUntil}
        />
      </div>

      <Field id="issuer" label="Aussteller (optional)" placeholder="z. B. Finanzamt München" />

      <div>
        <label
          htmlFor="status"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          defaultValue="gueltig"
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        >
          <option value="gueltig">Gültig</option>
          <option value="angefordert">Angefordert (noch nicht eingegangen)</option>
          <option value="abgelaufen">Abgelaufen</option>
          <option value="fehlt">Fehlt</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="file"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          PDF / Bild (optional, max. 25 MB)
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.heic,.webp"
          className="w-full text-sm text-[color:var(--color-fg-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--color-bg)] file:text-[color:var(--color-fg)] file:px-3 file:py-1.5 file:text-xs file:cursor-pointer file:hover:bg-[color:var(--color-accent-soft)]"
        />
      </div>

      <div>
        <label
          htmlFor="notes"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Notizen (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={2000}
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
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
  placeholder,
  errors,
}: {
  id: string;
  label: string;
  type?: string;
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

function DateField({
  id,
  label,
  required,
  defaultValue,
  errors,
}: {
  id: string;
  label: string;
  required?: boolean;
  defaultValue?: string;
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
        type="date"
        required={required}
        defaultValue={defaultValue}
        className={
          "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm font-mono focus:outline-none transition-colors " +
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
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Speichere …" : "Speichern"}
    </button>
  );
}
