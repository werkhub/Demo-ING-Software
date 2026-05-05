"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/toast";
import { enrichBautagebuchWithWeather } from "./actions";

export function WetterSyncButton({
  eintragId,
  projectId,
  hasCoordinates,
  source,
}: {
  eintragId: string;
  projectId: string;
  hasCoordinates: boolean;
  source: string | null;
}) {
  const [pending, start] = useTransition();
  const { push } = useToast();

  if (!hasCoordinates) {
    return (
      <span
        title="Projekt hat keine Koordinaten — auf der Projekt-Bearbeitungsseite ergänzen."
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]"
      >
        Wetter: keine Koordinaten
      </span>
    );
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          const fd = new FormData();
          fd.set("eintragId", eintragId);
          fd.set("projectId", projectId);
          const r = await enrichBautagebuchWithWeather(fd);
          if (r.ok) {
            if (r.data.vorgangId) {
              push({
                tone: "warning",
                title: "Witterungsbehinderung erkannt",
                body: "Vorgang nach § 6 VOB/B angelegt — siehe Vorgangs-Liste.",
                durationMs: 6000,
              });
            } else {
              push({ tone: "success", title: "Wetter aktualisiert" });
            }
          } else {
            push({
              tone: "critical",
              title: "Wetter-Sync fehlgeschlagen",
              body: r.formError ?? "Unbekannter Fehler.",
            });
          }
        });
      }}
      className="rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-3 py-1 text-[11px] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors disabled:opacity-60"
    >
      {pending ? "Synchronisiere..." : source === "api" ? "Wetter neu laden" : "Wetter laden"}
    </button>
  );
}
