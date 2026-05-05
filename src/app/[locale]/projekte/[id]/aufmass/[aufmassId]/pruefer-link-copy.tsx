"use client";

import { useState } from "react";

/**
 * Kleine Client-Komponente: Kopiert eine relative URL absolut in die
 * Zwischenablage. Server kennt den Host nicht, deshalb hier per
 * window.location.origin zur Laufzeit zusammensetzen.
 */
export function PrueferLinkCopy({ path }: { path: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          const url = `${window.location.origin}${path}`;
          await navigator.clipboard.writeText(url);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Fallback: Nichts tun (Browser-Berechtigung fehlt o. Ä.)
        }
      }}
      className="text-[10px] px-2 py-1 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
    >
      {done ? "✓ kopiert" : "URL kopieren"}
    </button>
  );
}
