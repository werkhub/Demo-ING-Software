"use client";

import { useEffect } from "react";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";

export function RouteError({
  area,
  backHref,
  backLabel,
  error,
  reset,
}: {
  area: string;
  backHref: string;
  backLabel: string;
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(`[lexbau · ${area}]`, error);
  }, [area, error]);

  return (
    <Container size="narrow">
      <section className="pt-20 pb-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-critical)]">
          Fehler · {area}
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          Diese Ansicht konnte nicht geladen werden.
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Wir konnten die Daten für „{area}“ nicht laden. Versuche es erneut, oder
          kehre zur Übersicht zurück.
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-[color:var(--color-fg-muted)]">
            Fehler-ID: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Erneut versuchen
          </button>
          <Link
            href={backHref}
            className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-4 py-2.5 transition-colors"
          >
            {backLabel}
          </Link>
        </div>
      </section>
    </Container>
  );
}
