"use client";

import { useFormStatus } from "react-dom";
import { updateWorkspaceBusiness } from "./business-actions";

type BusinessDefaults = {
  iban: string | null;
  bic: string | null;
  bankName: string | null;
  taxId: string | null;
  vatId: string | null;
  address: string | null;
  email: string | null;
  phone: string | null;
};

export function BusinessForm({
  defaults,
}: {
  defaults: BusinessDefaults;
}) {
  return (
    <form action={updateWorkspaceBusiness} className="space-y-4" id="business">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
        Geschäfts-Stammdaten
      </p>
      <h2 className="text-xl font-semibold tracking-tight">
        Stammdaten für Ausgangsrechnungen
      </h2>
      <p className="text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
        Werden in jede Ausgangsrechnung übernommen (Snapshot pro Beleg) und
        sind Pflichtangaben für XRechnung (§ 14 UStG, EN 16931).
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="taxId" label="Steuernummer (§ 14 IV Nr. 2 UStG)" defaultValue={defaults.taxId ?? ""} />
        <Field id="vatId" label="USt-IdNr." defaultValue={defaults.vatId ?? ""} mono />
      </div>

      <div>
        <label
          htmlFor="address"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Geschäftsanschrift (mehrzeilig)
        </label>
        <textarea
          id="address"
          name="address"
          rows={3}
          maxLength={500}
          defaultValue={defaults.address ?? ""}
          placeholder={`Musterstraße 1\n12345 Musterstadt\nDE`}
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
          Erste Zeile = Straße, zweite Zeile = „PLZ Ort", optional dritte Zeile = Land-Code (DE/AT/CH).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field id="email" label="E-Mail" type="email" defaultValue={defaults.email ?? ""} />
        <Field id="phone" label="Telefon" defaultValue={defaults.phone ?? ""} />
      </div>

      <div className="border-t border-[color:var(--color-border)] pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-3">
          Bankverbindung (für XRechnung-Zahlungsangaben)
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          <Field id="iban" label="IBAN" defaultValue={defaults.iban ?? ""} mono />
          <Field id="bic" label="BIC" defaultValue={defaults.bic ?? ""} mono />
          <Field id="bankName" label="Bankname" defaultValue={defaults.bankName ?? ""} />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  defaultValue,
  mono,
}: {
  id: string;
  label: string;
  type?: string;
  defaultValue?: string;
  mono?: boolean;
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
        defaultValue={defaultValue}
        className={
          "w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none " +
          (mono ? "font-mono" : "")
        }
      />
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60"
    >
      {pending ? "Speichere …" : "Speichern"}
    </button>
  );
}
