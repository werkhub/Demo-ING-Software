"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSubplaner } from "../actions";

const LEISTUNGSBEREICHE: Array<{ value: string; label: string }> = [
  { value: "tragwerk", label: "Tragwerksplanung" },
  { value: "tga", label: "TGA / HLS" },
  { value: "brandschutz", label: "Brandschutz" },
  { value: "vermessung", label: "Vermessung" },
  { value: "geotechnik", label: "Geotechnik / Baugrund" },
  { value: "schall", label: "Schall- / Wärmeschutz" },
  { value: "sonstiges", label: "Sonstiges" },
];

export function SubplanerForm({ projektId }: { projektId: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createSubplaner, null);

  useEffect(() => {
    if (state?.ok) {
      router.push(`/projekte/${projektId}/subplaner`);
    }
  }, [state, projektId, router]);

  return (
    <form action={action} className="mt-8 space-y-5">
      <input type="hidden" name="projektId" value={projektId} />

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Fachplaner-Name *
          </span>
          <input
            type="text"
            name="fachplanerName"
            required
            placeholder="Tragwerk Müller GmbH"
            className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
          />
          {state?.ok === false && state.fieldErrors?.fachplanerName?.length ? (
            <p className="mt-1 text-xs text-[color:var(--color-danger)]">
              {state.fieldErrors.fachplanerName[0]}
            </p>
          ) : null}
        </label>

        <label className="block">
          <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Leistungsbereich *
          </span>
          <select
            name="leistungsbereich"
            required
            defaultValue="tragwerk"
            className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
          >
            {LEISTUNGSBEREICHE.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Kontakt (E-Mail / Telefon)
        </span>
        <input
          type="text"
          name="fachplanerKontakt"
          placeholder="info@tragwerk-mueller.de"
          className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Vergabedatum
          </span>
          <input
            type="date"
            name="vergabeDatum"
            className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
            Vergabesumme (EUR netto)
          </span>
          <input
            type="text"
            name="vergabeSummeEur"
            inputMode="decimal"
            placeholder="12500.00"
            pattern="\d+([.,]\d{1,2})?"
            className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm font-mono"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Vergebene Leistungsphasen (1–9, kommasepariert)
        </span>
        <input
          type="text"
          name="lpReferenz"
          placeholder="3, 4, 5"
          className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm font-mono"
        />
      </label>

      <label className="block">
        <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Notizen
        </span>
        <textarea
          name="notes"
          rows={3}
          placeholder="Vergabevereinbarung, Konditionen, Termine…"
          className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
        />
      </label>

      {state?.ok === false && state.formError ? (
        <p className="text-sm text-[color:var(--color-danger)]">
          {state.formError}
        </p>
      ) : null}

      <div className="flex gap-3 pt-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-50"
        >
          {pending ? "Speichert…" : "Vergabe anlegen"}
        </button>
      </div>
    </form>
  );
}
