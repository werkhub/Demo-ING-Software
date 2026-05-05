"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { RDG_SHORT } from "@/lib/legal/rdg";
import { getConsent } from "@/lib/consent";
import { useHasConsent } from "./use-consent";

const STORAGE_KEY = "lexbau-rdg-ack";

export function RdgBanner() {
  const [visible, setVisible] = useState(false);
  const hasConsent = useHasConsent();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (getConsent() === null) {
      setVisible(true);
      return;
    }
    const ack = window.localStorage.getItem(STORAGE_KEY);
    if (!ack) setVisible(true);
  }, [hasConsent]);

  if (!visible) return null;

  function dismiss() {
    if (typeof window !== "undefined" && hasConsent) {
      window.localStorage.setItem(STORAGE_KEY, new Date().toISOString());
    }
    setVisible(false);
  }

  return (
    <div
      role="note"
      className="border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-fg)] rounded-md px-4 py-3 flex flex-wrap items-start gap-3 text-sm"
    >
      <span
        aria-hidden
        className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)] mt-1"
      >
        Hinweis
      </span>
      <div className="flex-1 min-w-[260px]">
        <p>{RDG_SHORT}</p>
        <Link
          href="/rdg-hinweis"
          className="font-mono text-[11px] uppercase tracking-wider underline text-[color:var(--color-accent)] mt-1 inline-block"
        >
          Mehr lesen
        </Link>
      </div>
      <button
        type="button"
        onClick={dismiss}
        className="font-mono text-[10px] uppercase tracking-[0.18em] rounded-full border border-[color:var(--color-border)] px-3 py-1 hover:bg-[color:var(--color-bg)] transition-colors"
      >
        Verstanden
      </button>
    </div>
  );
}
