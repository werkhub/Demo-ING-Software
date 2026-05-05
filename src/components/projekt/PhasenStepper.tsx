"use client";

import type { ProjectStatus } from "@/db/schema";
import { setProjectStatus } from "@/app/[locale]/projekte/actions";

const PHASES: ProjectStatus[] = [
  "Geplant",
  "Bauphase",
  "Abnahme",
  "Gewährleistung",
  "Abgeschlossen",
];

const PHASE_DESCRIPTION: Record<ProjectStatus, string> = {
  Geplant: "Vor Ausführung — Vergabe, Vertrag, NU-Pass-Through prüfen.",
  Bauphase: "Aktive Ausführung — Bautagebuch, Nachträge, Behinderungen.",
  Abnahme:
    "Übergabe-Phase — Mängelliste, Schlussrechnungs-Erwartung, Vertragsstrafen-Vorbehalt.",
  Gewährleistung:
    "Nach Abnahme — Mängel-Geltendmachung, Bürgschaft-Rückgabe, Verjährung.",
  Abgeschlossen: "Vertrag beendet — Archiv, schreibgeschützt.",
};

const PHASE_TONE: Record<ProjectStatus, { active: string; idle: string }> = {
  Geplant: {
    active:
      "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] border-[color:var(--color-info-border)]",
    idle: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  },
  Bauphase: {
    active:
      "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
    idle: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  },
  Abnahme: {
    active:
      "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
    idle: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  },
  Gewährleistung: {
    active:
      "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
    idle: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  },
  Abgeschlossen: {
    active:
      "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg)] border-[color:var(--color-border)]",
    idle: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  },
};

/**
 * Wechsel die einen Confirm-Dialog auslösen sollen, weil sie:
 *   - automatische Daten anlegen (Abnahme: Fristen + warrantyEnd),
 *   - ein Projekt schreibgeschützt machen (Abgeschlossen),
 *   - oder eine bereits durchlaufene Phase rückgängig zu machen versuchen
 *     (Rückwärts-Wechsel — meist Korrektur, soll bewusst sein).
 */
function confirmMessageForTransition(
  from: ProjectStatus,
  to: ProjectStatus
): string | null {
  const fromIdx = PHASES.indexOf(from);
  const toIdx = PHASES.indexOf(to);

  if (to === "Abgeschlossen") {
    return "Projekt auf Abgeschlossen setzen? Archiv-Modus — die Phase ist nicht für laufende Vorgänge gedacht.";
  }
  if (to === "Abnahme" && from !== "Abnahme") {
    return "Wechsel auf Abnahme: Es werden automatisch Abnahme-Datum, Gewährleistungs-Ende und zwei Fristen angelegt (Schlussrechnung § 16 Abs. 3 VOB/B, Gewährleistungs-Vorabwarnung). Fortfahren?";
  }
  if (toIdx < fromIdx) {
    return `Rückwärts-Wechsel von „${from}" zu „${to}" — meist nur als Korrektur sinnvoll. Bereits angelegte Auto-Fristen bleiben bestehen. Fortfahren?`;
  }
  return null;
}

export function PhasenStepper({
  projectId,
  currentStatus,
}: {
  projectId: string;
  currentStatus: ProjectStatus;
}) {
  const currentIndex = PHASES.indexOf(currentStatus);

  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-3">
        Projekt-Lebenszyklus
      </p>
      <ol className="grid grid-cols-2 md:grid-cols-5 gap-1">
        {PHASES.map((phase, idx) => {
          const isCurrent = phase === currentStatus;
          const isPast = idx < currentIndex;
          const tone = PHASE_TONE[phase];
          const confirmMessage = confirmMessageForTransition(currentStatus, phase);
          return (
            <li key={phase}>
              <form
                action={setProjectStatus}
                onSubmit={(e) => {
                  if (confirmMessage && !window.confirm(confirmMessage)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="id" value={projectId} />
                <input type="hidden" name="status" value={phase} />
                <button
                  type="submit"
                  disabled={isCurrent}
                  className={`w-full text-left border rounded-md px-3 py-2.5 transition-colors ${
                    isCurrent
                      ? `${tone.active} cursor-default ring-1 ring-[color:var(--color-fg)]`
                      : isPast
                        ? "bg-[color:var(--color-bg)] text-[color:var(--color-fg)] border-[color:var(--color-border)] hover:border-[color:var(--color-accent)]"
                        : "bg-[color:var(--color-bg)] text-[color:var(--color-fg-muted)] border-dashed border-[color:var(--color-border)] hover:text-[color:var(--color-fg)] hover:border-[color:var(--color-accent)]"
                  }`}
                >
                  <span className="font-mono text-[9px] uppercase tracking-[0.18em] block">
                    Phase {idx + 1}
                  </span>
                  <span className="text-sm font-medium block mt-1">{phase}</span>
                  <span className="text-[10px] text-[color:var(--color-fg-muted)] block mt-1 leading-snug">
                    {PHASE_DESCRIPTION[phase]}
                  </span>
                </button>
              </form>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[11px] text-[color:var(--color-fg-muted)]">
        Status-Wechsel zu <strong>Abnahme</strong> legt automatisch
        Gewährleistungs-Ende, Schlussrechnungs-Frist (§ 16 Abs. 3 VOB/B) und
        Vorabwarnung 60 Tage vor Verjährung an.
      </p>
    </div>
  );
}
