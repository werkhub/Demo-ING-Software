"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import {
  CLIENT_FOCUS_LABEL,
  DISCIPLINE_LABEL,
  SUBPROFILE_DEFAULTS,
  SUBPROFILE_DESCRIPTION,
  SUBPROFILE_LABEL,
  detectSubprofile,
} from "@/lib/workspace/disciplines";
import {
  CLIENT_FOCUS,
  DISCIPLINES,
  DISCIPLINE_SUBPROFILES,
  type ClientFocus,
  type Discipline,
  type DisciplineSubprofile,
} from "@/db/schema/types";
import { updateWorkspaceDisciplines } from "./actions";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-2";
const inputClass =
  "w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

const SUBPROFILE_ORDER: DisciplineSubprofile[] = [
  "hochbau_klassisch",
  "tiefbau_infrastruktur",
  "generalplanung",
  "tga_spezialist",
  "tragwerk_spezialist",
  "pruefingenieur",
  "custom",
];

export type DisciplinesFormProps = {
  current: {
    disciplines: Discipline[];
    subprofile: DisciplineSubprofile;
    clientFocus: ClientFocus;
    companySize: number | null;
  };
};

export function DisciplinesForm({ current }: DisciplinesFormProps) {
  const [state, formAction] = useActionState(updateWorkspaceDisciplines, null);
  const { push } = useToast();
  const success = state?.ok ? state.data : null;

  const [selected, setSelected] = useState<Set<Discipline>>(
    new Set(current.disciplines)
  );
  const [subprofile, setSubprofile] = useState<DisciplineSubprofile>(
    current.subprofile
  );
  const [clientFocus, setClientFocus] = useState<ClientFocus>(current.clientFocus);
  const [companySize, setCompanySize] = useState<string>(
    current.companySize?.toString() ?? ""
  );

  useEffect(() => {
    if (success) {
      push({
        tone: "success",
        title: "Fachprofil gespeichert",
        body: `Profil: ${SUBPROFILE_LABEL[success.subprofile]} · ${success.disciplinesCount} Disziplin(en).`,
      });
    }
  }, [success, push]);

  // Bei Subprofil-Wechsel: Disziplinen + clientFocus aus Preset übernehmen.
  function applySubprofile(sp: DisciplineSubprofile) {
    setSubprofile(sp);
    if (sp === "custom") return;
    const def = SUBPROFILE_DEFAULTS[sp];
    setSelected(new Set(def.disciplines));
    setClientFocus(def.clientFocus);
  }

  // Bei manueller Disziplin-Änderung: Subprofil auf "custom" zurückfallen,
  // sobald die Auswahl von einem Preset abweicht.
  function toggleDiscipline(d: Discipline) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      const detected = detectSubprofile(Array.from(next));
      setSubprofile(detected);
      return next;
    });
  }

  const detectedSubprofile = useMemo(
    () => detectSubprofile(Array.from(selected)),
    [selected]
  );

  // hidden field als JSON-Array — die Action akzeptiert das per zod.preprocess.
  const disciplinesPayload = useMemo(
    () => JSON.stringify(Array.from(selected)),
    [selected]
  );

  return (
    <form action={formAction} id="fachprofil" className="space-y-8 scroll-mt-24">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          Workspace · Fachprofil
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          Fachdisziplinen und Auftraggeber-Schwerpunkt
        </h2>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl leading-relaxed">
          Diese Auswahl steuert HOAI-Rechner-Tafeln, Vorlagen-Vorbelegung,
          Recht-Assistent-Perspektive und welche Module in der Sidebar
          erscheinen. Du kannst jederzeit ein Preset auswählen und einzelne
          Disziplinen abschalten — die Auswahl springt dann auf „Eigene Auswahl".
        </p>
      </div>

      {/* Subprofile */}
      <fieldset className="grid gap-3 md:grid-cols-2">
        <legend className="sr-only">Schnell-Profil wählen</legend>
        {SUBPROFILE_ORDER.map((sp) => {
          const isCurrent = sp === subprofile;
          return (
            <label
              key={sp}
              className="flex items-start gap-3 border border-[color:var(--color-border)] rounded-md p-4 cursor-pointer hover:border-[color:var(--color-accent)] transition-colors has-[input:checked]:border-[color:var(--color-accent)] has-[input:checked]:bg-[color:var(--color-bg-subtle)]"
            >
              <input
                type="radio"
                name="disciplineSubprofile"
                value={sp}
                checked={isCurrent}
                onChange={() => applySubprofile(sp)}
                className="mt-1 accent-[color:var(--color-accent)]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[color:var(--color-fg)]">
                    {SUBPROFILE_LABEL[sp]}
                  </span>
                  {isCurrent ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-success)] inline-flex items-center gap-1">
                      <Check size={10} aria-hidden /> aktiv
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                  {SUBPROFILE_DESCRIPTION[sp]}
                </p>
              </div>
            </label>
          );
        })}
      </fieldset>

      {/* Disziplinen */}
      <div>
        <p className={labelClass}>Disziplinen (mehrfach)</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {DISCIPLINES.map((d) => {
            const active = selected.has(d);
            return (
              <label
                key={d}
                className="flex items-center gap-3 border border-[color:var(--color-border)] rounded-md px-3 py-2.5 cursor-pointer hover:border-[color:var(--color-accent)] transition-colors has-[input:checked]:border-[color:var(--color-accent)] has-[input:checked]:bg-[color:var(--color-bg-subtle)]"
              >
                <input
                  type="checkbox"
                  checked={active}
                  onChange={() => toggleDiscipline(d)}
                  className="accent-[color:var(--color-accent)]"
                />
                <span className="text-sm">{DISCIPLINE_LABEL[d]}</span>
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)]">
          {selected.size} ausgewählt · Erkanntes Profil:{" "}
          <span className="font-medium text-[color:var(--color-fg)]">
            {SUBPROFILE_LABEL[detectedSubprofile]}
          </span>
        </p>
        <input type="hidden" name="disciplines" value={disciplinesPayload} />
      </div>

      {/* ClientFocus */}
      <fieldset>
        <legend className={labelClass}>Auftraggeber-Schwerpunkt</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {CLIENT_FOCUS.map((cf) => (
            <label
              key={cf}
              className="flex items-center gap-3 border border-[color:var(--color-border)] rounded-md px-3 py-2.5 cursor-pointer hover:border-[color:var(--color-accent)] transition-colors has-[input:checked]:border-[color:var(--color-accent)] has-[input:checked]:bg-[color:var(--color-bg-subtle)]"
            >
              <input
                type="radio"
                name="clientFocus"
                value={cf}
                checked={clientFocus === cf}
                onChange={() => setClientFocus(cf)}
                className="accent-[color:var(--color-accent)]"
              />
              <span className="text-sm">{CLIENT_FOCUS_LABEL[cf]}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)] leading-relaxed">
          Schaltet künftige Vergabe-, Förderprojekt- und Honorarprüfungs-Module
          frei — gemischt und öffentlich sehen sie, privat blendet sie aus.
        </p>
      </fieldset>

      {/* CompanySize */}
      <div>
        <label className={labelClass} htmlFor="company-size-input">
          Bürogröße (Mitarbeiter, optional)
        </label>
        <input
          id="company-size-input"
          name="companySize"
          type="number"
          min={1}
          max={100000}
          step={1}
          value={companySize}
          onChange={(e) => setCompanySize(e.target.value)}
          className={inputClass + " font-mono max-w-[160px]"}
          placeholder="—"
        />
        <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)] leading-relaxed">
          HinSchG-Pflicht ab 50 MA (§ 12 HinSchG). Leer lassen, wenn unbekannt
          — keine Größenfilter werden dann angewendet.
          {DISCIPLINE_SUBPROFILES.length > 0 ? null : null}
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Wird gespeichert …" : "Fachprofil speichern"}
    </button>
  );
}
