"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ABNAHME_BEURTEILUNG_LABEL,
  ABNAHME_KIND_LABEL,
  ABNAHME_KIND_LEGAL_BASIS,
} from "@/lib/abnahme";
import type {
  AbnahmeBeurteilung,
  AbnahmeKind,
} from "@/db/schema";
import { createAbnahme, updateAbnahme } from "./abnahme-actions";

const KIND_OPTIONS: AbnahmeKind[] = [
  "foermlich",
  "teilabnahme",
  "fiktiv",
  "konkludent",
  "verweigert",
];

const BEURTEILUNG_OPTIONS: AbnahmeBeurteilung[] = [
  "mangelfrei",
  "mit_unwesentlichen_maengeln",
  "mit_wesentlichen_maengeln",
  "verweigert",
];

export type AbnahmePrefill = Partial<{
  kind: AbnahmeKind;
  abnahmeDate: string;
  abnahmeOrt: string;
  scope: string;
  gesamtbeurteilung: AbnahmeBeurteilung;
  attendees: string;
  vertragsstrafeAgreed: boolean;
  vertragsstrafeReserved: boolean;
  vertragsstrafeReservationText: string;
  handoverComplete: boolean;
  handoverNotes: string;
  notes: string;
}>;

export function AbnahmeForm({
  projectId,
  mode,
  abnahmeId,
  prefill,
}: {
  projectId: string;
  mode: "create" | "edit";
  abnahmeId?: string;
  prefill?: AbnahmePrefill;
}) {
  const [kind, setKind] = useState<AbnahmeKind>(prefill?.kind ?? "foermlich");
  const [vertragsstrafeAgreed, setVertragsstrafeAgreed] = useState<boolean>(
    prefill?.vertragsstrafeAgreed ?? false
  );
  const [vertragsstrafeReserved, setVertragsstrafeReserved] = useState<boolean>(
    prefill?.vertragsstrafeReserved ?? false
  );

  const [state, createFormAction] = useActionState(createAbnahme, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;

  const showVertragsstrafeWarning =
    vertragsstrafeAgreed &&
    !vertragsstrafeReserved &&
    kind !== "verweigert";

  return (
    <form
      action={mode === "create" ? createFormAction : updateAbnahme}
      className="space-y-8"
    >
      <input type="hidden" name="projectId" value={projectId} />
      {mode === "edit" && abnahmeId ? (
        <input type="hidden" name="id" value={abnahmeId} />
      ) : null}

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm">
          {formError}
        </div>
      ) : null}

      <Section title="Abnahme-Art">
        <div className="grid gap-4 md:grid-cols-2">
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
              onChange={(e) => setKind(e.target.value as AbnahmeKind)}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            >
              {KIND_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {ABNAHME_KIND_LABEL[k]}
                </option>
              ))}
            </select>
            <p className="mt-1 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
              {ABNAHME_KIND_LEGAL_BASIS[kind]}
            </p>
          </div>
          <DateField
            id="abnahmeDate"
            label="Datum"
            required
            defaultValue={prefill?.abnahmeDate ?? new Date().toISOString().slice(0, 10)}
            errors={fieldErrors?.abnahmeDate}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="abnahmeOrt"
            label="Ort (optional)"
            placeholder="z. B. Baustelle vor Ort"
            defaultValue={prefill?.abnahmeOrt ?? ""}
          />
          {kind === "teilabnahme" ? (
            <Field
              id="scope"
              label="Umfang (Bauteil/Gewerk)"
              placeholder="z. B. Rohbau Erdgeschoss"
              defaultValue={prefill?.scope ?? ""}
            />
          ) : (
            <SelectField
              id="gesamtbeurteilung"
              label="Beurteilung"
              defaultValue={prefill?.gesamtbeurteilung ?? "mit_unwesentlichen_maengeln"}
              options={BEURTEILUNG_OPTIONS.map((b) => ({
                value: b,
                label: ABNAHME_BEURTEILUNG_LABEL[b],
              }))}
            />
          )}
        </div>
        {kind === "teilabnahme" ? (
          <SelectField
            id="gesamtbeurteilung"
            label="Beurteilung"
            defaultValue={prefill?.gesamtbeurteilung ?? "mit_unwesentlichen_maengeln"}
            options={BEURTEILUNG_OPTIONS.map((b) => ({
              value: b,
              label: ABNAHME_BEURTEILUNG_LABEL[b],
            }))}
          />
        ) : null}
      </Section>

      <Section title="Teilnehmer">
        <textarea
          id="attendees"
          name="attendees"
          rows={4}
          maxLength={20_000}
          defaultValue={prefill?.attendees ?? ""}
          placeholder={`Ein Teilnehmer pro Zeile. Optional Rolle nach Mittelpunkt:
Max Mustermann · Bauleiter AN
Dr. Brahms · AG-Vertreter`}
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none font-mono"
        />
      </Section>

      <Section
        title="Vertragsstrafe — § 11 Abs. 4 VOB/B"
        warning={showVertragsstrafeWarning}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <CheckboxField
            id="vertragsstrafeAgreed"
            label="Vertragsstrafe vereinbart"
            help="War im Hauptvertrag eine Vertragsstrafe geregelt?"
            checked={vertragsstrafeAgreed}
            onChange={setVertragsstrafeAgreed}
          />
          <CheckboxField
            id="vertragsstrafeReserved"
            label="Vorbehalt erklärt"
            help="Wurde im Abnahmeprotokoll der Vorbehalt der Vertragsstrafe AUSDRÜCKLICH aufgenommen?"
            checked={vertragsstrafeReserved}
            onChange={setVertragsstrafeReserved}
            disabled={!vertragsstrafeAgreed}
          />
        </div>
        {showVertragsstrafeWarning ? (
          <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-md px-3 py-2 text-sm text-[color:var(--color-critical)]">
            <strong>Achtung:</strong> Ohne Vorbehalt verfällt die Vertragsstrafe
            mit der Abnahme — § 11 Abs. 4 VOB/B. Bei Speichern wird ein
            kritischer Vorgang mit Frist heute angelegt.
          </div>
        ) : null}
        {vertragsstrafeAgreed && vertragsstrafeReserved ? (
          <div>
            <label
              htmlFor="vertragsstrafeReservationText"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Wortlaut des Vorbehalts (optional, aber empfohlen)
            </label>
            <textarea
              id="vertragsstrafeReservationText"
              name="vertragsstrafeReservationText"
              rows={3}
              maxLength={2000}
              defaultValue={prefill?.vertragsstrafeReservationText ?? ""}
              placeholder='z. B.: "Der AG behält sich die Geltendmachung der vereinbarten Vertragsstrafe in Höhe von … gem. § 11 Abs. 4 VOB/B ausdrücklich vor."'
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>
        ) : null}
      </Section>

      <Section title="Übergabeunterlagen">
        <CheckboxField
          id="handoverComplete"
          label="Vollständig übergeben"
          help="Wartungsanleitungen, Konformitätserklärungen, Materialnachweise, Bestandspläne etc."
          defaultChecked={prefill?.handoverComplete ?? false}
        />
        <textarea
          id="handoverNotes"
          name="handoverNotes"
          rows={2}
          maxLength={2000}
          defaultValue={prefill?.handoverNotes ?? ""}
          placeholder="Was fehlt noch? Wer liefert nach? Bis wann?"
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </Section>

      <Section title="Interne Notizen">
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={2000}
          defaultValue={prefill?.notes ?? ""}
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </Section>

      <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] pt-6">
        <SubmitButton mode={mode} />
      </div>
    </form>
  );
}

function Section({
  title,
  children,
  warning,
}: {
  title: string;
  children: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <section className="space-y-4">
      <p
        className={`font-mono text-[10px] uppercase tracking-[0.22em] ${
          warning
            ? "text-[color:var(--color-critical)]"
            : "text-[color:var(--color-accent)]"
        }`}
      >
        {title}
      </p>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  placeholder,
  defaultValue,
  errors,
}: {
  id: string;
  label: string;
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
        type="text"
        placeholder={placeholder}
        defaultValue={defaultValue}
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

function CheckboxField({
  id,
  label,
  help,
  defaultChecked,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  help?: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
}) {
  const controlled = checked !== undefined && onChange !== undefined;
  return (
    <label
      htmlFor={id}
      className={
        "flex items-start gap-2 text-sm select-none " +
        (disabled ? "opacity-50" : "cursor-pointer")
      }
    >
      <input
        id={id}
        name={id}
        type="checkbox"
        disabled={disabled}
        {...(controlled
          ? { checked, onChange: (e) => onChange(e.target.checked) }
          : { defaultChecked })}
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

function SubmitButton({ mode }: { mode: "create" | "edit" }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending
        ? "Speichere …"
        : mode === "create"
          ? "Abnahmeprotokoll anlegen"
          : "Änderungen speichern"}
    </button>
  );
}
