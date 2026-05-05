"use client";

import { useActionState, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { defaultDueDate } from "@/lib/ausgangsrechnungen";
import { fmtMoney } from "@/lib/utils";
import { createAusgangsrechnung } from "../ar-actions";

export type AufmassMin = {
  id: string;
  name: string;
  totalApprovedNet: number;
  status: string;
};

type Kind = "abschlag" | "schluss";

export function NewArForm({
  projectId,
  defaultPartyAg,
  defaultSecurityRetentionPercent,
  aufmasse,
}: {
  projectId: string;
  defaultPartyAg: string;
  defaultSecurityRetentionPercent: number | null;
  aufmasse: AufmassMin[];
}) {
  const [state, formAction] = useActionState(createAusgangsrechnung, null);
  const [kind, setKind] = useState<Kind>("abschlag");
  const today = new Date().toISOString().slice(0, 10);
  const [invoiceDate, setInvoiceDate] = useState(today);

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;

  const dueDateDefault = useMemo(() => defaultDueDate(invoiceDate), [invoiceDate]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="projectId" value={projectId} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm">
          {formError}
        </div>
      ) : null}

      <Section title="Art der Rechnung">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label
              htmlFor="kind"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Rechnungs-Art
            </label>
            <select
              id="kind"
              name="kind"
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            >
              <option value="abschlag">Abschlagsrechnung (§ 16 I VOB/B)</option>
              <option value="schluss">Schlussrechnung (§ 14 VOB/B)</option>
            </select>
          </div>
          {kind === "abschlag" ? (
            <Field
              id="abschlagNo"
              label="Abschlags-Nr."
              type="number"
              defaultValue=""
              placeholder="1, 2, 3 …"
              mono
            />
          ) : null}
        </div>
        {aufmasse.length > 0 ? (
          <div>
            <label
              htmlFor="aufmassId"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Aufmaß-Bezug (optional, übernimmt Positionen automatisch)
            </label>
            <select
              id="aufmassId"
              name="aufmassId"
              defaultValue=""
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            >
              <option value="">— ohne Aufmaß-Bezug —</option>
              {aufmasse.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} · {fmtMoney(a.totalApprovedNet)} netto · {a.status}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
              Nur freigegebene Aufmaße sind abrechenbar. Gekürzte Zeilen
              fließen mit anerkannter Menge ein, bestrittene werden
              übersprungen.
            </p>
          </div>
        ) : null}
      </Section>

      <Section title="Daten + Zeitraum">
        <div className="grid gap-3 md:grid-cols-3">
          <DateField
            id="invoiceDate"
            label="Rechnungsdatum"
            required
            value={invoiceDate}
            onChange={setInvoiceDate}
            errors={fieldErrors?.invoiceDate}
          />
          <DateField
            id="serviceStart"
            label="Leistung von"
          />
          <DateField
            id="serviceEnd"
            label="Leistung bis"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <Field
            id="dueDate"
            label="Zahlungsziel"
            type="date"
            mono
            defaultValue={dueDateDefault}
          />
          <Field
            id="skontoPercent"
            label="Skonto %"
            type="number"
            step="0.1"
            mono
            placeholder="z. B. 2"
          />
          <Field
            id="skontoDays"
            label="Skonto-Tage"
            type="number"
            mono
            placeholder="z. B. 10"
          />
        </div>
      </Section>

      <Section title="Beträge">
        <div className="grid gap-3 md:grid-cols-3">
          <Field
            id="vatPercent"
            label="MwSt %"
            type="number"
            step="0.1"
            defaultValue="19"
            mono
          />
          <Field
            id="previousAbschlaegeNet"
            label="Vorherige Abschläge (€ netto)"
            type="number"
            step="0.01"
            mono
            defaultValue="0"
            placeholder="manuell — auto in Phase 2.x"
          />
          <Field
            id="securityRetentionPercent"
            label="Sicherheitseinbehalt %"
            type="number"
            step="0.1"
            mono
            defaultValue={
              defaultSecurityRetentionPercent !== null
                ? String(defaultSecurityRetentionPercent)
                : ""
            }
            placeholder="z. B. 5"
          />
        </div>
      </Section>

      <Section title="Stammdaten (Snapshot)">
        <div>
          <label
            htmlFor="subjectLine"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
          >
            Betreff (auto bei leer)
          </label>
          <input
            id="subjectLine"
            name="subjectLine"
            type="text"
            maxLength={200}
            placeholder="z. B. 1. Abschlagsrechnung — BV-2026-001"
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            id="partyAg"
            label="Auftraggeber"
            defaultValue={defaultPartyAg}
          />
          <Field
            id="partyAgAddress"
            label="AG-Anschrift"
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field id="partyAn" label="Auftragnehmer (Sie)" />
          <Field id="partyAnAddress" label="AN-Anschrift" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field id="partyAnTaxId" label="Steuernummer (§ 14 IV UStG)" />
          <Field id="partyAnVatId" label="USt-IdNr." />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field
            id="buyerReference"
            label="Käufer-Referenz / Leitweg-ID (XRechnung BT-10)"
            placeholder="z. B. 04011000-1234512345-06"
            mono
          />
          <Field
            id="purchaseOrderRef"
            label="Bestellnummer AG (BT-13)"
            placeholder="optional"
            mono
          />
        </div>
      </Section>

      <Section title="Notizen (intern)">
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={2000}
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </Section>

      <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] pt-6">
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
    <section className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
        {title}
      </p>
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
}: {
  id: string;
  label: string;
  type?: string;
  step?: string;
  mono?: boolean;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
}) {
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
          "w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none " +
          (mono ? "font-mono" : "")
        }
      />
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

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60"
    >
      {pending ? "Erstelle …" : "Rechnung anlegen"}
    </button>
  );
}
