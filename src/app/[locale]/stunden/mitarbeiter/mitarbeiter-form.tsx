import type { Mitarbeiter } from "@/db/schema";
import { createMitarbeiterRedirect, updateMitarbeiter } from "../actions";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";
const inputClass =
  "mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

async function updateAction(formData: FormData) {
  "use server";
  await updateMitarbeiter(null, formData);
}

export function MitarbeiterForm({
  mode,
  ma,
}: {
  mode: "new" | "edit";
  ma?: Mitarbeiter;
}) {
  const action = mode === "new" ? createMitarbeiterRedirect : updateAction;
  const fmtCents = (c: number | null | undefined) =>
    c === null || c === undefined || c === 0 ? "" : (c / 100).toFixed(2);

  return (
    <form action={action} className="space-y-5 max-w-2xl">
      {mode === "edit" && ma ? (
        <input type="hidden" name="id" value={ma.id} />
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Name *</label>
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            defaultValue={ma?.name ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Personalnummer</label>
          <input
            name="personalnummer"
            maxLength={40}
            defaultValue={ma?.personalnummer ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Gewerk</label>
          <input
            name="gewerk"
            maxLength={80}
            placeholder="z.B. Maurer, Trockenbau, Polier"
            defaultValue={ma?.gewerk ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Kostenstelle</label>
          <input
            name="kostenstelle"
            maxLength={40}
            defaultValue={ma?.kostenstelle ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Lohnart *</label>
          <select
            name="lohnart"
            defaultValue={ma?.lohnart ?? "stunden"}
            className={inputClass}
          >
            <option value="stunden">Stundenlohn</option>
            <option value="monat">Monatsgehalt</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>Stundensatz €/h</label>
          <input
            name="stundensatzCents"
            type="number"
            step="0.01"
            min="0"
            defaultValue={fmtCents(ma?.stundensatzCents)}
            className={inputClass}
            placeholder="z.B. 45.00"
          />
          <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
            Bei Lohnart &quot;Stunden&quot;
          </p>
        </div>
        <div>
          <label className={labelClass}>Monatsgehalt €</label>
          <input
            name="monatsgehaltCents"
            type="number"
            step="0.01"
            min="0"
            defaultValue={fmtCents(ma?.monatsgehaltCents)}
            className={inputClass}
            placeholder="z.B. 4000.00"
          />
          <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
            Bei Lohnart &quot;Monat&quot;
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Soll-Stunden / Monat</label>
          <input
            name="monatsSollStunden"
            type="number"
            step="0.01"
            min="1"
            max="300"
            defaultValue={ma?.monatsSollStunden ?? 173.33}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Eintritt</label>
          <input
            name="eintrittDatum"
            type="date"
            defaultValue={ma?.eintrittDatum ?? ""}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Austritt</label>
          <input
            name="austrittDatum"
            type="date"
            defaultValue={ma?.austrittDatum ?? ""}
            className={inputClass}
          />
        </div>
      </div>

      {mode === "edit" ? (
        <div>
          <label className="flex items-center gap-2">
            <input
              name="aktiv"
              type="checkbox"
              defaultChecked={ma?.aktiv ?? true}
              className="h-4 w-4"
            />
            <span className="text-sm">Aktiv</span>
          </label>
        </div>
      ) : null}

      <div>
        <label className={labelClass}>Notizen</label>
        <textarea
          name="notes"
          rows={3}
          maxLength={2000}
          defaultValue={ma?.notes ?? ""}
          className={inputClass}
        />
      </div>

      <div className="flex items-center gap-3 pt-3">
        <button
          type="submit"
          className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
        >
          {mode === "new" ? "Anlegen" : "Speichern"}
        </button>
      </div>
    </form>
  );
}
