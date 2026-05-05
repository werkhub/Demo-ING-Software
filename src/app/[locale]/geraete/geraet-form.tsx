/**
 * Plain-Form für Geräte-Stammdaten. Server-rendered (kein useState), submission
 * via Server Action. Gemeinsam für /new (createGeraet) und /edit (updateGeraet).
 */
import {
  EIGENTUM_LABEL,
  KATEGORIE_LABEL,
  STATUS_LABEL,
} from "@/lib/geraete";
import type {
  Geraet,
  GeraetEigentum,
  GeraetKategorie,
  GeraetStatus,
} from "@/db/schema";

const KATEGORIE_VALUES: GeraetKategorie[] = [
  "kran",
  "bagger",
  "radlader",
  "geruest",
  "handwerk",
  "fahrzeug",
  "sonstiges",
];

const STATUS_VALUES: GeraetStatus[] = [
  "verfuegbar",
  "disponiert",
  "in_wartung",
  "defekt",
  "ausgemustert",
];

const EIGENTUM_VALUES: GeraetEigentum[] = ["eigen", "miete", "leasing"];

function centsToInputValue(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}

export function GeraetForm({
  mode,
  action,
  initial,
}: {
  mode: "create" | "edit";
  action: (formData: FormData) => Promise<void>;
  initial?: Geraet;
}) {
  return (
    <form action={action} className="space-y-8">
      {mode === "edit" && initial ? (
        <input type="hidden" name="id" value={initial.id} />
      ) : null}

      <Section title="Stammdaten">
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            id="bezeichnung"
            label="Bezeichnung"
            required
            defaultValue={initial?.bezeichnung ?? ""}
            placeholder="z. B. Mobilkran Liebherr LTM 1050"
          />
          <SelectField
            id="kategorie"
            label="Kategorie"
            required
            defaultValue={initial?.kategorie ?? "sonstiges"}
            options={KATEGORIE_VALUES.map((k) => ({
              value: k,
              label: KATEGORIE_LABEL[k],
            }))}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            id="inventarNr"
            label="Inventar-Nr."
            mono
            defaultValue={initial?.inventarNr ?? ""}
            placeholder="z. B. INV-2026-021"
          />
          <Field
            id="hersteller"
            label="Hersteller"
            defaultValue={initial?.hersteller ?? ""}
          />
          <Field
            id="baujahr"
            label="Baujahr"
            type="number"
            mono
            defaultValue={initial?.baujahr?.toString() ?? ""}
            placeholder="z. B. 2018"
          />
        </div>
      </Section>

      <Section title="Status">
        <SelectField
          id="status"
          label="Aktueller Status"
          required
          defaultValue={initial?.status ?? "verfuegbar"}
          options={STATUS_VALUES.map((s) => ({
            value: s,
            label: STATUS_LABEL[s],
          }))}
        />
      </Section>

      <Section title="Eigentum / Miete">
        <div className="grid gap-4 md:grid-cols-3">
          <SelectField
            id="eigentum"
            label="Verhältnis"
            required
            defaultValue={initial?.eigentum ?? "eigen"}
            options={EIGENTUM_VALUES.map((e) => ({
              value: e,
              label: EIGENTUM_LABEL[e],
            }))}
          />
          <Field
            id="mietPartner"
            label="Vermieter / Leasinggeber"
            defaultValue={initial?.mietPartner ?? ""}
            placeholder="nur bei Miete/Leasing"
          />
          <Field
            id="mietBisDatum"
            label="Rückgabe / Mietende"
            type="date"
            mono
            defaultValue={initial?.mietBisDatum ?? ""}
          />
        </div>
      </Section>

      <Section title="Buchhaltung">
        <div className="grid gap-4 md:grid-cols-3">
          <Field
            id="kaufdatum"
            label="Kaufdatum"
            type="date"
            mono
            defaultValue={initial?.kaufdatum ?? ""}
          />
          <Field
            id="kaufpreisCents"
            label="Kaufpreis (€ netto)"
            type="number"
            step="0.01"
            mono
            defaultValue={centsToInputValue(initial?.kaufpreisCents)}
          />
          <Field
            id="currentValueCents"
            label="Aktueller Buchwert (€)"
            type="number"
            step="0.01"
            mono
            defaultValue={centsToInputValue(initial?.currentValueCents)}
          />
        </div>
      </Section>

      <Section title="Notizen">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={initial?.notes ?? ""}
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </Section>

      <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] pt-6">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
        >
          {mode === "create" ? "Gerät anlegen" : "Änderungen speichern"}
        </button>
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
    <section className="space-y-4">
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
          "w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors" +
          (mono ? " font-mono" : "")
        }
      />
    </div>
  );
}

function SelectField({
  id,
  label,
  defaultValue,
  options,
  required,
}: {
  id: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
  required?: boolean;
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
        required={required}
        defaultValue={defaultValue}
        className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
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
