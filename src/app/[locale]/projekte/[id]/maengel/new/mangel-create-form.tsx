"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { MANGEL_PRIORITAET_LABEL } from "@/lib/maengel";
import type { MangelPhase, MangelPrioritaet } from "@/db/schema";
import { createMangel } from "../actions";

type AbnahmeOption = { id: string; label: string };
type PhaseOption = { value: MangelPhase; label: string };

const PRIORITIES: MangelPrioritaet[] = [
  "niedrig",
  "mittel",
  "hoch",
  "kritisch",
];

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export function MangelCreateForm({
  projectId,
  defaultPhase,
  defaultAbnahmeId,
  abnahmen,
  phaseOptions,
}: {
  projectId: string;
  defaultPhase: MangelPhase;
  defaultAbnahmeId: string | null;
  abnahmen: AbnahmeOption[];
  phaseOptions: PhaseOption[];
}) {
  const [state, formAction] = useActionState(createMangel, null);
  const [phase, setPhase] = useState<MangelPhase>(defaultPhase);
  const router = useRouter();
  const { push } = useToast();
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;
  const success = state?.ok ? state.data : null;

  useEffect(() => {
    if (success) {
      push({ tone: "success", title: "Mangel angelegt" });
      router.push(`/projekte/${projectId}/maengel/${success.id}`);
    }
  }, [success, projectId, router, push]);

  return (
    <form
      action={formAction}
      className="border border-[color:var(--color-border)] rounded-md p-6 space-y-5 max-w-3xl"
    >
      <input type="hidden" name="projectId" value={projectId} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Select
          name="phase"
          label="Phase"
          value={phase}
          onChange={(v) => setPhase(v as MangelPhase)}
          options={phaseOptions.map((o) => ({ value: o.value, label: o.label }))}
        />
        <DateField name="gemeldetAm" label="Gemeldet am" defaultValue={isoToday()} required />
      </div>

      {phase === "abnahme" && abnahmen.length > 0 ? (
        <Select
          name="abnahmeId"
          label="Verknüpftes Abnahmeprotokoll (optional)"
          defaultValue={defaultAbnahmeId ?? ""}
          options={[
            { value: "", label: "— keines —" },
            ...abnahmen.map((a) => ({ value: a.id, label: a.label })),
          ]}
        />
      ) : null}

      <Textarea
        name="beschreibung"
        label="Beschreibung"
        rows={4}
        required
        minLength={5}
        maxLength={2000}
        placeholder="Kurzbeschreibung in Zeile 1, dann Details (z. B. Maße, Foto-Verweise)."
        errors={fieldErrors?.beschreibung}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Select
          name="prioritaet"
          label="Priorität"
          defaultValue="mittel"
          options={PRIORITIES.map((p) => ({
            value: p,
            label: MANGEL_PRIORITAET_LABEL[p],
          }))}
        />
        <TextField
          name="kategorie"
          label="Kategorie/Gewerk"
          placeholder="z. B. Estrich, Heizung"
        />
        <TextField
          name="ortImBauwerk"
          label="Ort im Bauwerk"
          placeholder="z. B. EG, Raum 1.04"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextField
          name="gemeldetVon"
          label="Gemeldet von"
          placeholder="z. B. AG-Bauleiter Müller"
        />
        <DateField
          name="fristsetzungDatum"
          label="Frist (§ 13 V VOB/B)"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <DateField name="behebungBis" label="Behebung zugesagt bis" />
        <NumberField
          name="kostenGeschaetztCents"
          label="Geschätzte Kosten (€)"
          step="0.01"
          min="0"
        />
      </div>

      <Textarea
        name="notes"
        label="Notizen (intern)"
        rows={2}
        maxLength={2000}
      />

      <div className="flex items-center justify-end gap-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
    >
      {children}
    </label>
  );
}

function TextField({
  name,
  label,
  placeholder,
  errors,
}: {
  name: string;
  label: string;
  placeholder?: string;
  errors?: string[];
}) {
  const hasError = !!errors?.length;
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <input
        id={name}
        name={name}
        type="text"
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
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <input
        id={name}
        name={name}
        type="date"
        required={required}
        defaultValue={defaultValue}
        className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
      />
    </div>
  );
}

function NumberField({
  name,
  label,
  step,
  min,
}: {
  name: string;
  label: string;
  step?: string;
  min?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <input
        id={name}
        name={name}
        type="number"
        step={step}
        min={min}
        className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
      />
    </div>
  );
}

function Select({
  name,
  label,
  defaultValue,
  value,
  onChange,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
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

function Textarea({
  name,
  label,
  rows,
  required,
  minLength,
  maxLength,
  placeholder,
  errors,
}: {
  name: string;
  label: string;
  rows: number;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  placeholder?: string;
  errors?: string[];
}) {
  const hasError = !!errors?.length;
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Speichere …" : "Mangel anlegen"}
    </button>
  );
}
