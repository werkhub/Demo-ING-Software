"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import {
  SECURITY_LABELS,
  SECURITY_LEGAL_BASIS,
  SECURITY_TYPICAL_PERCENT,
} from "@/lib/sicherheiten";
import type {
  SecurityKind,
  SecurityReleaseTrigger,
} from "@/db/schema";
import { addSecurity } from "./sicherheiten-actions";

const KIND_OPTIONS: SecurityKind[] = [
  "vertragserfuellung",
  "maengelanspruch",
  "vorauszahlung",
  "bareinbehalt",
  "bauhandwerker",
];

const TRIGGER_LABELS: Record<SecurityReleaseTrigger, string> = {
  bei_abnahme: "Bei Abnahme (aus Projekt-Daten)",
  bei_gewaehrleistungsende: "Bei Gewährleistungsende (aus Projekt-Daten)",
  manuell: "Manueller Termin",
};

const DEFAULT_TRIGGER_FOR: Record<SecurityKind, SecurityReleaseTrigger> = {
  vertragserfuellung: "bei_abnahme",
  maengelanspruch: "bei_gewaehrleistungsende",
  vorauszahlung: "manuell",
  bareinbehalt: "bei_gewaehrleistungsende",
  bauhandwerker: "manuell",
};

export function SecurityForm({
  projectId,
  contractValue,
  defaultRetentionPercent,
}: {
  projectId: string;
  contractValue: number;
  /** projects.securityRetentionPercent — Default für neue Bareinbehalte. */
  defaultRetentionPercent: number | null;
}) {
  const [state, formAction] = useActionState(addSecurity, null);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<SecurityKind>("vertragserfuellung");
  const [trigger, setTrigger] = useState<SecurityReleaseTrigger>(
    DEFAULT_TRIGGER_FOR.vertragserfuellung
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
      push({ tone: "success", title: "Sicherheit erfasst" });
    }
  }, [success, push]);

  // Default-Prozentsatz pro Sicherheits-Art berechnen → daraus Default-Betrag.
  const typicalPercent =
    kind === "bareinbehalt"
      ? defaultRetentionPercent ?? SECURITY_TYPICAL_PERCENT[kind]
      : SECURITY_TYPICAL_PERCENT[kind];
  const defaultAmount =
    typicalPercent !== null && contractValue > 0
      ? Math.round((contractValue * typicalPercent) / 100)
      : "";

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
      >
        + Sicherheit erfassen
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
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="direction" value="provided_to_ag" />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor="kind"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
          >
            Art
          </label>
          <select
            id="kind"
            name="kind"
            value={kind}
            onChange={(e) => {
              const k = e.target.value as SecurityKind;
              setKind(k);
              setTrigger(DEFAULT_TRIGGER_FOR[k]);
            }}
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
          >
            {KIND_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {SECURITY_LABELS[k]}
              </option>
            ))}
          </select>
          <p className="mt-1 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
            {SECURITY_LEGAL_BASIS[kind]}
            {typicalPercent !== null
              ? ` · typisch ${typicalPercent} %`
              : ""}
          </p>
        </div>

        <div>
          <label
            htmlFor="releaseTrigger"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
          >
            Geltungsende
          </label>
          <select
            id="releaseTrigger"
            name="releaseTrigger"
            value={trigger}
            onChange={(e) =>
              setTrigger(e.target.value as SecurityReleaseTrigger)
            }
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
          >
            <option value="bei_abnahme">{TRIGGER_LABELS.bei_abnahme}</option>
            <option value="bei_gewaehrleistungsende">
              {TRIGGER_LABELS.bei_gewaehrleistungsende}
            </option>
            <option value="manuell">{TRIGGER_LABELS.manuell}</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field
          id="amount"
          label="Betrag (€)"
          type="number"
          step="0.01"
          required
          mono
          defaultValue={defaultAmount.toString()}
          errors={fieldErrors?.amount}
        />
        <Field
          id="percentOfContract"
          label="Prozent vom Vertrag (optional)"
          type="number"
          step="0.1"
          mono
          defaultValue={typicalPercent !== null ? String(typicalPercent) : ""}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <DateField id="issuedAt" label="Ausgestellt am (optional)" />
        <DateField id="validFrom" label="Gültig ab (optional)" />
        <DateField
          id="validUntil"
          label={
            trigger === "manuell" ? "Gültig bis" : "Gültig bis (Override)"
          }
          required={trigger === "manuell"}
          errors={fieldErrors?.validUntil}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Field id="provider" label="Bürge / Lieferant" placeholder="z. B. Sparkasse Stadt" />
        <Field id="referenceNumber" label="Bürgschafts-Nr." />
      </div>

      <div>
        <label
          htmlFor="file"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Bürgschafts-PDF (optional)
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
  step,
  mono,
  required,
  placeholder,
  defaultValue,
  errors,
}: {
  id: string;
  label: string;
  type?: string;
  step?: string;
  mono?: boolean;
  required?: boolean;
  placeholder?: string;
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
        type={type}
        step={step}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={
          "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors " +
          (hasError
            ? "border-[color:var(--color-critical)]"
            : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]") +
          (mono ? " font-mono" : "")
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
  errors,
}: {
  id: string;
  label: string;
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
        type="date"
        required={required}
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
