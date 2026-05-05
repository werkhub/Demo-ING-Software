"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { Check } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { ALL_EXTERNAL_PROVIDERS } from "@/lib/legal/external-providers";
import type { VobPreferredExternalProvider } from "@/db/schema";
import { updateVobSettings } from "./actions";

const OPTION_LABELS: Record<VobPreferredExternalProvider, string> = {
  all: "Alle Anbieter gleichberechtigt",
  juris: "juris",
  din_media: "DIN Media (VOBcenter)",
  beck_online: "beck-online",
};

const ALL_OPTIONS: VobPreferredExternalProvider[] = [
  "all",
  "juris",
  "din_media",
  "beck_online",
];

export function VobSettingsForm({
  current,
  hasLicense,
}: {
  current: VobPreferredExternalProvider;
  hasLicense: boolean;
}) {
  const [state, formAction] = useActionState(updateVobSettings, null);
  const { push } = useToast();
  const success = state?.ok ? state.data : null;

  useEffect(() => {
    if (success) {
      push({
        tone: "success",
        title: "VOB-Einstellung gespeichert",
        body: `Bevorzugter Anbieter: ${OPTION_LABELS[success.provider as VobPreferredExternalProvider] ?? success.provider}.`,
      });
    }
  }, [success, push]);

  return (
    <form action={formAction} id="vob" className="space-y-6 scroll-mt-24">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          VOB · Externe Anbieter
        </p>
        <h2 className="mt-2 text-xl font-semibold tracking-tight">
          Bevorzugter Anbieter für VOB-Volltexte
        </h2>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl leading-relaxed">
          Die VOB ist urheberrechtlich bei DIN Media und in dieser App nur als
          eigene Zusammenfassung enthalten. Wähle, bei welchem Anbieter du
          Volltexte abrufen möchtest — der Button taucht dann prominent auf den
          VOB-Seiten auf. „Alle gleichberechtigt“ zeigt alle drei zur Wahl.
        </p>
      </div>

      {hasLicense ? (
        <div className="border border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] rounded-md px-4 py-3 text-sm">
          <p className="font-medium text-[color:var(--color-success)]">
            Plattform-Lizenz aktiv
          </p>
          <p className="mt-1 text-[color:var(--color-fg-muted)]">
            VOB-Volltexte werden direkt in der App angezeigt. Die Anbieter-Auswahl
            unten bleibt verfügbar als Backup-Verweis.
          </p>
        </div>
      ) : null}

      <fieldset className="space-y-2">
        <legend className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-3">
          Auswahl
        </legend>
        {ALL_OPTIONS.map((option) => {
          const provider =
            option === "all"
              ? null
              : ALL_EXTERNAL_PROVIDERS.find((p) => p.id === option);
          return (
            <label
              key={option}
              className="flex items-start gap-3 border border-[color:var(--color-border)] rounded-md p-4 cursor-pointer hover:border-[color:var(--color-accent)] transition-colors has-[input:checked]:border-[color:var(--color-accent)] has-[input:checked]:bg-[color:var(--color-bg-subtle)]"
            >
              <input
                type="radio"
                name="vobPreferredExternalProvider"
                value={option}
                defaultChecked={option === current}
                className="mt-1 accent-[color:var(--color-accent)]"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[color:var(--color-fg)]">
                    {OPTION_LABELS[option]}
                  </span>
                  {option === current ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-success)] inline-flex items-center gap-1">
                      <Check size={10} aria-hidden /> aktuell
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                  {option === "all"
                    ? "Auf VOB-Seiten erscheinen alle drei Buttons gleichberechtigt. Empfehlung, wenn das Team verschiedene Anbieter nutzt."
                    : provider?.description}
                </p>
              </div>
            </label>
          );
        })}
      </fieldset>

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
      {pending ? "Wird gespeichert …" : "Einstellung speichern"}
    </button>
  );
}
