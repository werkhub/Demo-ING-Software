"use client";

import { Link } from "@/i18n/navigation";
import { useEffect, useState } from "react";
import { getConsent, setConsent } from "@/lib/consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  function accept() {
    setConsent("necessary");
    setVisible(false);
  }

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie-Hinweis"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-[color:var(--color-border)] bg-[color:var(--color-bg)] shadow-lg"
    >
      <div className="mx-auto w-full max-w-[1440px] px-6 md:px-10 lg:px-14 py-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <p className="flex-1 min-w-[260px] text-sm text-[color:var(--color-fg)] leading-relaxed">
          LexBau verwendet ausschließlich technisch notwendige Cookies und Local-Storage-Werte
          (z. B. für Theme und rechtliche Hinweise). Es findet kein Tracking statt. Bis zu
          deiner Zustimmung wird nichts persistiert. Details in der{" "}
          <Link href="/datenschutz" className="underline text-[color:var(--color-accent)]">
            Datenschutzerklärung
          </Link>
          .
        </p>
        <button
          type="button"
          onClick={accept}
          className="font-mono text-[11px] uppercase tracking-[0.18em] rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-4 py-2 transition-colors"
        >
          Notwendige akzeptieren
        </button>
      </div>
    </div>
  );
}
