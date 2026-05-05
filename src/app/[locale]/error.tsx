"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/container";
import { Link } from "@/i18n/navigation";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("[lexbau] uncaught error", error);
  }, [error]);

  return (
    <Container size="narrow">
      <section className="pt-24 pb-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-critical)]">
          {t("kicker")}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("description")}
        </p>
        {error.digest ? (
          <p className="mt-3 font-mono text-[11px] text-[color:var(--color-fg-muted)]">
            {t("errorIdLabel")} {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            {t("retry")}
          </button>
          <Link
            href="/"
            className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-4 py-2.5 transition-colors"
          >
            {t("backHome")}
          </Link>
        </div>
      </section>
    </Container>
  );
}
