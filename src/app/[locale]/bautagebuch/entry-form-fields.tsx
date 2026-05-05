"use client";

import { useState } from "react";
import type { BautagebuchEntry } from "@/db/schema";
import { CATEGORY_OPTIONS, WEATHER_OPTIONS } from "./constants";

type Project = { id: string; identifier: string; name: string };

type Defaults = Pick<
  BautagebuchEntry,
  | "projectId"
  | "entryDate"
  | "category"
  | "text"
  | "weatherCondition"
  | "temperatureCelsius"
  | "staffHoursOwn"
  | "staffHoursSubcontractors"
  | "equipment"
  | "attachmentRefs"
>;

const TODAY_ISO = () => {
  const d = new Date();
  return d.toISOString().slice(0, 10);
};

export function EntryFormFields({
  projects,
  defaults,
  fieldErrors,
}: {
  projects: Project[];
  defaults?: Defaults;
  fieldErrors?: Record<string, string[]>;
}) {
  const [advancedOpen, setAdvancedOpen] = useState<boolean>(
    !!(
      defaults?.weatherCondition ||
      defaults?.temperatureCelsius ||
      defaults?.staffHoursOwn ||
      defaults?.staffHoursSubcontractors ||
      defaults?.equipment ||
      defaults?.attachmentRefs
    )
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label
            htmlFor="entryDate"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
          >
            Tagesdatum
          </label>
          <input
            id="entryDate"
            name="entryDate"
            type="date"
            required
            defaultValue={defaults?.entryDate ?? TODAY_ISO()}
            className={
              "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm font-mono text-[color:var(--color-fg)] focus:outline-none transition-colors " +
              (fieldErrors?.entryDate
                ? "border-[color:var(--color-critical)]"
                : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
            }
          />
          {fieldErrors?.entryDate?.[0] ? (
            <p className="mt-1 text-xs text-[color:var(--color-critical)]">
              {fieldErrors.entryDate[0]}
            </p>
          ) : null}
        </div>

        <div>
          <label
            htmlFor="projectId"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
          >
            Projekt
          </label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={defaults?.projectId ?? projects[0]?.id ?? ""}
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
          >
            <option value="">— Kein Projekt —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.identifier} · {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="category"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
          >
            Kategorie
          </label>
          <select
            id="category"
            name="category"
            defaultValue={defaults?.category ?? "allgemein"}
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
            Trigger werden zusätzlich automatisch erkannt
          </p>
        </div>
      </div>

      <div>
        <label
          htmlFor="text"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
        >
          Eintrag
        </label>
        <textarea
          id="text"
          name="text"
          rows={4}
          required
          minLength={10}
          defaultValue={defaults?.text ?? ""}
          aria-invalid={!!fieldErrors?.text || undefined}
          placeholder="Was ist heute auf der Baustelle passiert? — z. B. „Frau Schmitz vom AG sagt: machen Sie da noch eine Steckdose“."
          className={
            "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:outline-none resize-y " +
            (fieldErrors?.text
              ? "border-[color:var(--color-critical)]"
              : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
          }
        />
        {fieldErrors?.text?.[0] ? (
          <p className="mt-1 text-xs text-[color:var(--color-critical)]">
            {fieldErrors.text[0]}
          </p>
        ) : null}
      </div>

      <div className="border-t border-[color:var(--color-border)] pt-3">
        <button
          type="button"
          onClick={() => setAdvancedOpen((v) => !v)}
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors flex items-center gap-2"
        >
          <span aria-hidden>{advancedOpen ? "▾" : "▸"}</span>
          Wetter, Personal, Geräte, Anlagen
          {!advancedOpen ? (
            <span className="text-[color:var(--color-fg-muted)] normal-case tracking-normal text-[11px]">
              · für Beweismittel-Tauglichkeit
            </span>
          ) : null}
        </button>
      </div>

      {advancedOpen ? (
        <div className="space-y-4 pl-1">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="weatherCondition"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
              >
                Witterung
              </label>
              <select
                id="weatherCondition"
                name="weatherCondition"
                defaultValue={defaults?.weatherCondition ?? ""}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
              >
                <option value="">—</option>
                {WEATHER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="temperatureCelsius"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
              >
                Temperatur (°C)
              </label>
              <input
                id="temperatureCelsius"
                name="temperatureCelsius"
                type="number"
                step="1"
                min={-40}
                max={60}
                placeholder="12"
                defaultValue={defaults?.temperatureCelsius ?? ""}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
                Frost-Beweis: Beton ab &lt; +5 °C kritisch
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="staffHoursOwn"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
              >
                Eigene Mannschaft (Stunden)
              </label>
              <input
                id="staffHoursOwn"
                name="staffHoursOwn"
                type="number"
                step="0.5"
                min={0}
                placeholder="80"
                defaultValue={defaults?.staffHoursOwn ?? ""}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="staffHoursSubcontractors"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
              >
                NU-Mannschaft (Stunden)
              </label>
              <input
                id="staffHoursSubcontractors"
                name="staffHoursSubcontractors"
                type="number"
                step="0.5"
                min={0}
                placeholder="32"
                defaultValue={defaults?.staffHoursSubcontractors ?? ""}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="equipment"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
            >
              Eingesetzte Geräte
            </label>
            <input
              id="equipment"
              name="equipment"
              type="text"
              placeholder="z. B. Kran 25 t, 1× Bagger CAT, 2× Rüttelplatte"
              defaultValue={defaults?.equipment ?? ""}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
              Wichtig für Vorhalte-Kosten bei Behinderung
            </p>
          </div>

          <div>
            <label
              htmlFor="attachmentRefs"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2"
            >
              Anlagen-Verweise
            </label>
            <input
              id="attachmentRefs"
              name="attachmentRefs"
              type="text"
              placeholder="z. B. Foto-Ordner: \\Server\Bauakte\BV-2024-014\2026-05-03"
              defaultValue={defaults?.attachmentRefs ?? ""}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
              Verweis auf Foto-/Plan-/E-Mail-Ordner. Echter Datei-Upload folgt separat.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
