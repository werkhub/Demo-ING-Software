"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updateHinschgSettings } from "@/app/[locale]/hinschg/actions";

export function HinschgForm({
  enabled,
  contactEmail,
  workspaceId,
}: {
  enabled: boolean;
  contactEmail: string | null;
  workspaceId: string;
}) {
  const [enabledLocal, setEnabledLocal] = useState(enabled);

  return (
    <form action={updateHinschgSettings} className="space-y-4" id="hinschg">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
        HinSchG-Meldestelle
      </p>
      <h2 className="text-xl font-semibold tracking-tight">
        Hinweisgeberstelle
      </h2>
      <p className="text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
        Aktiviert die interne Meldestelle nach §§ 12 ff. HinSchG. Pflicht ab
        50 Beschäftigten — auch unterhalb dieser Schwelle freiwillig nutzbar.
        Sobald aktiv, wird das Modul „Hinweise" in der Sidebar (nur für
        Admins) und die öffentliche URL <code>/hinweis?ws={workspaceId}</code>{" "}
        verfügbar.
      </p>

      <label className="flex items-start gap-2 text-sm cursor-pointer select-none pt-2">
        {/* Tristate-Checkbox: hidden „false" davor → bei unchecked wird false gesendet. */}
        <input type="hidden" name="hinschgEnabled" value="false" />
        <input
          type="checkbox"
          name="hinschgEnabled"
          value="on"
          checked={enabledLocal}
          onChange={(e) => setEnabledLocal(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-[color:var(--color-border)] text-[color:var(--color-accent)] focus:ring-[color:var(--color-accent)]"
        />
        <span>
          <span className="font-medium text-[color:var(--color-fg)]">
            Meldestelle aktivieren
          </span>
          <span className="block text-[11px] text-[color:var(--color-fg-muted)] mt-0.5">
            Schaltet die öffentliche Meldungs-URL frei.
          </span>
        </span>
      </label>

      {enabledLocal ? (
        <div>
          <label
            htmlFor="hinschgOfficeContactEmail"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
          >
            Office-Kontakt-E-Mail (für Eingangs-Benachrichtigung)
          </label>
          <input
            id="hinschgOfficeContactEmail"
            name="hinschgOfficeContactEmail"
            type="email"
            defaultValue={contactEmail ?? ""}
            placeholder="z. B. meldestelle@firma.de"
            className="w-full max-w-md bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
          />
          <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
            Heute nur als Hinweis hinterlegt. Auto-Mail-Versand kommt mit der
            zentralen Mail-Pipeline.
          </p>
        </div>
      ) : null}

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
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60"
    >
      {pending ? "Speichere …" : "Speichern"}
    </button>
  );
}
