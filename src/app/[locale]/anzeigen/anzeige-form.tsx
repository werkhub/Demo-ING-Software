"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  ANZEIGE_KIND_LABEL,
  ANZEIGE_LEGAL_BASIS,
  CAUSED_BY_LABEL,
  CONCERN_ABOUT_LABEL,
  RECIPIENT_ROLE_LABEL,
  defaultBody,
} from "@/lib/anzeigen";
import type {
  AnzeigeCausedBy,
  AnzeigeConcernAbout,
  AnzeigeKind,
  AnzeigeRecipientRole,
} from "@/db/schema";
import { createAnzeige, updateAnzeige } from "./actions";

type ProjectMin = {
  id: string;
  identifier: string;
  name: string;
  ag: string;
};

export type AnzeigePrefill = Partial<{
  projectId: string;
  kind: AnzeigeKind;
  title: string;
  subjectMatter: string;
  bodyMarkdown: string;
  recipientName: string;
  recipientEmail: string;
  recipientRole: AnzeigeRecipientRole;
  obstructionStart: string;
  estimatedDurationDays: number;
  estimatedExtraCost: number;
  causedBy: AnzeigeCausedBy;
  concernAbout: AnzeigeConcernAbout;
  potentialDamage: string;
  proposedSolution: string;
  notes: string;
  sourceBautagebuchEntryId: string;
}>;

export function AnzeigeForm({
  projects,
  prefill,
  mode,
  anzeigeId,
}: {
  projects: ProjectMin[];
  prefill?: AnzeigePrefill;
  mode: "create" | "edit";
  /** Bei mode=edit erforderlich. */
  anzeigeId?: string;
}) {
  const initialKind: AnzeigeKind = prefill?.kind ?? "behinderung";
  const initialProjectId = prefill?.projectId ?? projects[0]?.id ?? "";

  const [kind, setKind] = useState<AnzeigeKind>(initialKind);
  const [projectId, setProjectId] = useState<string>(initialProjectId);
  const [subjectMatter, setSubjectMatter] = useState<string>(
    prefill?.subjectMatter ?? ""
  );
  const [causedBy, setCausedBy] = useState<AnzeigeCausedBy | "">(
    prefill?.causedBy ?? ""
  );
  const [obstructionStart, setObstructionStart] = useState<string>(
    prefill?.obstructionStart ?? ""
  );
  const [estimatedDurationDays, setEstimatedDurationDays] = useState<string>(
    prefill?.estimatedDurationDays !== undefined
      ? String(prefill.estimatedDurationDays)
      : ""
  );
  const [estimatedExtraCost, setEstimatedExtraCost] = useState<string>(
    prefill?.estimatedExtraCost !== undefined
      ? String(prefill.estimatedExtraCost)
      : ""
  );
  const [concernAbout, setConcernAbout] = useState<AnzeigeConcernAbout | "">(
    prefill?.concernAbout ?? ""
  );
  const [potentialDamage, setPotentialDamage] = useState<string>(
    prefill?.potentialDamage ?? ""
  );
  const [proposedSolution, setProposedSolution] = useState<string>(
    prefill?.proposedSolution ?? ""
  );
  const [bodyMarkdown, setBodyMarkdown] = useState<string>(
    prefill?.bodyMarkdown ?? ""
  );
  const [bodyManuallyEdited, setBodyManuallyEdited] = useState<boolean>(
    !!prefill?.bodyMarkdown
  );

  const project = useMemo(
    () => projects.find((p) => p.id === projectId),
    [projects, projectId]
  );

  // Auto-Generation des Bodies, solange der User ihn nicht manuell editiert hat.
  useEffect(() => {
    if (bodyManuallyEdited) return;
    if (!project) return;
    if (subjectMatter.trim().length < 10) return;
    const generated = defaultBody(
      kind,
      {
        projectIdentifier: project.identifier,
        projectName: project.name,
        agName: project.ag,
      },
      {
        subjectMatter,
        causedBy: causedBy === "" ? null : (causedBy as AnzeigeCausedBy),
        obstructionStart: obstructionStart || null,
        estimatedDurationDays: estimatedDurationDays
          ? Number(estimatedDurationDays)
          : null,
        estimatedExtraCost: estimatedExtraCost
          ? Number(estimatedExtraCost)
          : null,
        concernAbout:
          concernAbout === "" ? null : (concernAbout as AnzeigeConcernAbout),
        potentialDamage: potentialDamage || null,
        proposedSolution: proposedSolution || null,
      }
    );
    setBodyMarkdown(generated);
  }, [
    bodyManuallyEdited,
    project,
    kind,
    subjectMatter,
    causedBy,
    obstructionStart,
    estimatedDurationDays,
    estimatedExtraCost,
    concernAbout,
    potentialDamage,
    proposedSolution,
  ]);

  const action = mode === "create" ? createAnzeige : null;
  const [state, createFormAction] = useActionState(action ?? createAnzeige, null);
  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;

  const handleEditAction = updateAnzeige;

  return (
    <form
      action={mode === "create" ? createFormAction : handleEditAction}
      className="space-y-8"
    >
      {mode === "edit" && anzeigeId ? (
        <input type="hidden" name="id" value={anzeigeId} />
      ) : null}
      {prefill?.sourceBautagebuchEntryId ? (
        <input
          type="hidden"
          name="sourceBautagebuchEntryId"
          value={prefill.sourceBautagebuchEntryId}
        />
      ) : null}

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm">
          {formError}
        </div>
      ) : null}

      <Section title="Grundlagen">
        <div className="grid gap-4 md:grid-cols-2">
          <SelectField
            id="projectId"
            label="Projekt"
            value={projectId}
            onChange={setProjectId}
            required
            options={projects.map((p) => ({
              value: p.id,
              label: `${p.identifier} · ${p.name}`,
            }))}
          />
          <SelectField
            id="kind"
            label="Anzeige-Art"
            value={kind}
            onChange={(v) => setKind(v as AnzeigeKind)}
            required
            disabled={mode === "edit"}
            options={[
              {
                value: "behinderung",
                label: `${ANZEIGE_KIND_LABEL.behinderung} (${ANZEIGE_LEGAL_BASIS.behinderung})`,
              },
              {
                value: "bedenken",
                label: `${ANZEIGE_KIND_LABEL.bedenken} (${ANZEIGE_LEGAL_BASIS.bedenken})`,
              },
            ]}
          />
        </div>
        <Field
          id="title"
          label="Kurztitel (intern)"
          required
          defaultValue={prefill?.title ?? ""}
          placeholder={
            kind === "behinderung"
              ? "z. B. Stillstand wegen fehlender TGA-Pläne"
              : "z. B. Bedenken Estrich-Aufbau Erdgeschoss"
          }
          errors={fieldErrors?.title}
        />
        <TextareaField
          id="subjectMatter"
          label="Sachverhalt (kurz, 1–3 Sätze)"
          required
          rows={3}
          maxLength={2000}
          value={subjectMatter}
          onChange={setSubjectMatter}
          placeholder={
            kind === "behinderung"
              ? "Was ist passiert? Welche Leistung ist betroffen? Seit wann?"
              : "Was ist bedenklich? Wogegen genau richtet sich der Einwand?"
          }
          errors={fieldErrors?.subjectMatter}
        />
      </Section>

      {kind === "behinderung" ? (
        <Section title="Behinderung — § 6 Abs. 1 VOB/B">
          <div className="grid gap-4 md:grid-cols-2">
            <SelectField
              id="causedBy"
              label="Ursache"
              required
              value={causedBy}
              onChange={(v) => setCausedBy(v as AnzeigeCausedBy | "")}
              options={[
                { value: "", label: "(bitte wählen)" },
                ...(Object.keys(CAUSED_BY_LABEL) as AnzeigeCausedBy[]).map((k) => ({
                  value: k,
                  label: CAUSED_BY_LABEL[k],
                })),
              ]}
              errors={fieldErrors?.causedBy}
            />
            <DateField
              id="obstructionStart"
              label="Beginn der Behinderung"
              required
              value={obstructionStart}
              onChange={setObstructionStart}
              errors={fieldErrors?.obstructionStart}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field
              id="estimatedDurationDays"
              label="Geschätzte Dauer (Werktage)"
              type="number"
              mono
              value={estimatedDurationDays}
              onChange={setEstimatedDurationDays}
              placeholder="z. B. 14"
            />
            <Field
              id="estimatedExtraCost"
              label="Geschätzte Mehrkosten (€ netto)"
              type="number"
              step="0.01"
              mono
              value={estimatedExtraCost}
              onChange={setEstimatedExtraCost}
              placeholder="optional — Schätzung gem. § 6 Abs. 6 VOB/B"
            />
          </div>
        </Section>
      ) : (
        <Section title="Bedenken — § 4 Abs. 3 VOB/B">
          <SelectField
            id="concernAbout"
            label="Bedenken-Gegenstand"
            required
            value={concernAbout}
            onChange={(v) => setConcernAbout(v as AnzeigeConcernAbout | "")}
            options={[
              { value: "", label: "(bitte wählen)" },
              ...(Object.keys(CONCERN_ABOUT_LABEL) as AnzeigeConcernAbout[]).map(
                (k) => ({ value: k, label: CONCERN_ABOUT_LABEL[k] })
              ),
            ]}
            errors={fieldErrors?.concernAbout}
          />
          <TextareaField
            id="potentialDamage"
            label="Mögliche Folgen (optional, aber empfohlen)"
            rows={3}
            maxLength={2000}
            value={potentialDamage}
            onChange={setPotentialDamage}
            placeholder="Welche Mängel/Schäden drohen, wenn die Vorgabe so umgesetzt wird?"
          />
          <TextareaField
            id="proposedSolution"
            label="Lösungsvorschlag (optional)"
            rows={3}
            maxLength={2000}
            value={proposedSolution}
            onChange={setProposedSolution}
            placeholder="Wie könnte das Problem aus AN-Sicht gelöst werden?"
          />
        </Section>
      )}

      <Section title="Empfänger">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            id="recipientName"
            label="Name"
            defaultValue={prefill?.recipientName ?? ""}
          />
          <Field
            id="recipientEmail"
            label="E-Mail"
            type="email"
            defaultValue={prefill?.recipientEmail ?? ""}
            errors={fieldErrors?.recipientEmail}
          />
          <SelectField
            id="recipientRole"
            label="Rolle"
            defaultValue={prefill?.recipientRole ?? ""}
            options={[
              { value: "", label: "(nicht festgelegt)" },
              ...(Object.keys(RECIPIENT_ROLE_LABEL) as AnzeigeRecipientRole[]).map(
                (r) => ({ value: r, label: RECIPIENT_ROLE_LABEL[r] })
              ),
            ]}
          />
        </div>
      </Section>

      <Section
        title="Volltext (Markdown)"
        action={
          bodyManuallyEdited ? (
            <button
              type="button"
              onClick={() => {
                setBodyManuallyEdited(false);
              }}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
            >
              ↺ Aus Vorlage neu generieren
            </button>
          ) : (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              Auto aus Vorlage — bei manueller Änderung wird nicht überschrieben
            </span>
          )
        }
      >
        <textarea
          id="bodyMarkdown"
          name="bodyMarkdown"
          rows={18}
          required
          maxLength={50_000}
          value={bodyMarkdown}
          onChange={(e) => {
            setBodyMarkdown(e.target.value);
            setBodyManuallyEdited(true);
          }}
          className={
            "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm font-mono leading-relaxed focus:outline-none transition-colors " +
            (fieldErrors?.bodyMarkdown
              ? "border-[color:var(--color-critical)]"
              : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
          }
        />
        {fieldErrors?.bodyMarkdown ? (
          <p className="mt-1 text-xs text-[color:var(--color-critical)]">
            {fieldErrors.bodyMarkdown[0]}
          </p>
        ) : null}
      </Section>

      <Section title="Notizen (intern, nicht im Versand)">
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
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          {title}
        </p>
        {action}
      </div>
      {children}
    </section>
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
  value,
  onChange,
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
  value?: string;
  onChange?: (v: string) => void;
  errors?: string[];
}) {
  const hasError = !!errors?.length;
  const controlled = value !== undefined && onChange !== undefined;
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
        {...(controlled
          ? { value, onChange: (e) => onChange(e.target.value) }
          : { defaultValue })}
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
  value,
  onChange,
  errors,
}: {
  id: string;
  label: string;
  required?: boolean;
  value?: string;
  onChange?: (v: string) => void;
  errors?: string[];
}) {
  const hasError = !!errors?.length;
  const controlled = value !== undefined && onChange !== undefined;
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
        {...(controlled
          ? { value, onChange: (e) => onChange(e.target.value) }
          : {})}
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

function TextareaField({
  id,
  label,
  rows,
  maxLength,
  required,
  value,
  onChange,
  placeholder,
  errors,
}: {
  id: string;
  label: string;
  rows: number;
  maxLength: number;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
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
      <textarea
        id={id}
        name={id}
        rows={rows}
        required={required}
        maxLength={maxLength}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
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
  value,
  onChange,
  options,
  required,
  disabled,
  errors,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  value?: string;
  onChange?: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
  errors?: string[];
}) {
  const hasError = !!errors?.length;
  const controlled = value !== undefined && onChange !== undefined;
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
        required={required}
        disabled={disabled}
        {...(controlled
          ? { value, onChange: (e) => onChange(e.target.value) }
          : { defaultValue })}
        className={
          "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors " +
          (hasError
            ? "border-[color:var(--color-critical)]"
            : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]") +
          (disabled ? " opacity-60 cursor-not-allowed" : "")
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
          ? "Als Entwurf anlegen"
          : "Änderungen speichern"}
    </button>
  );
}
