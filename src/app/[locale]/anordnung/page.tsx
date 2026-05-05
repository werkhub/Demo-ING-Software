"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Container } from "@/components/container";
import { RdgBanner } from "@/components/rdg-banner";
import { analyzeAnordnung, type AnordnungLevel } from "@/lib/anordnung-analyze";

const SAMPLE = `Sehr geehrter Herr Müller,

ich war heute auf der Baustelle und habe gesehen, dass die Türen DIN 18101 noch nicht eingebaut sind. Wir möchten doch lieber breitere Türen DIN 18101-XL haben — der Möbeltransport wird sonst schwierig.

Bitte tauschen Sie die Türen aus. Die geänderte Bestellung läuft schon, Lieferung Donnerstag. Bis nächste Woche sollten die Türen eingebaut sein.

Mit freundlichen Grüßen
B. Schmitz · AG Stadt Lüdenscheid`;

const LEVEL_TONE: Record<AnordnungLevel, string> = {
  ja: "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]",
  wahrscheinlich:
    "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  fraglich:
    "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  nein: "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]",
};

export default function AnordnungsPage() {
  const t = useTranslations("modules.anordnung");
  const [text, setText] = useState("");

  const analysis = useMemo(() => {
    if (text.trim().length < 20) return null;
    return analyzeAnordnung(text);
  }, [text]);

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("intro")}
        </p>
        <div className="mt-6">
          <RdgBanner />
        </div>
      </section>

      <section className="grid gap-10 md:grid-cols-3 border-t border-[color:var(--color-border)] pt-10 pb-10">
        <div className="md:col-span-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            {t("inputKicker")}
          </p>
          <textarea
            rows={16}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("inputPlaceholder")}
            className="mt-4 w-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:bg-[color:var(--color-bg)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors resize-y font-sans"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setText(SAMPLE)}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
            >
              {t("loadSample")}
            </button>
            {text ? (
              <button
                type="button"
                onClick={() => setText("")}
                className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
              >
                {t("clear")}
              </button>
            ) : null}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          {!analysis ? (
            <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                {t("minCharsHint")}
              </p>
            </div>
          ) : (
            <>
              <div
                className={`border rounded-md px-5 py-4 ${LEVEL_TONE[analysis.level]}`}
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
                    {t("ratingKicker")}
                  </p>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                    {t("scoreLabel", { score: analysis.score })}
                  </span>
                </div>
                <p className="mt-2 text-base font-semibold">
                  {t(`level.${analysis.level}`)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {analysis.isGeaendert ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] rounded-sm px-1.5 py-0.5">
                      {t("badgeChanged")}
                    </span>
                  ) : null}
                  {analysis.isMehrleistung ? (
                    <span className="font-mono text-[9px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] bg-[color:var(--color-bg)] rounded-sm px-1.5 py-0.5">
                      {t("badgeAdditional")}
                    </span>
                  ) : null}
                </div>
              </div>

              <section>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                  {t("checksKicker")}
                </p>
                <ul className="space-y-2">
                  {analysis.checks.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 border-b border-[color:var(--color-border)] pb-2"
                    >
                      <span
                        className={
                          c.detected
                            ? "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] shrink-0 w-12"
                            : "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] shrink-0 w-12"
                        }
                      >
                        {c.detected ? "✓" : "—"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p
                          className={
                            c.detected
                              ? "text-sm text-[color:var(--color-fg)]"
                              : "text-sm text-[color:var(--color-fg-muted)]"
                          }
                        >
                          {c.label}
                        </p>
                        {c.basis ? (
                          <p className="font-mono text-[10px] text-[color:var(--color-fg-muted)] mt-0.5">
                            {c.basis}
                          </p>
                        ) : null}
                      </div>
                      <span className="font-mono text-[10px] text-[color:var(--color-fg-muted)] shrink-0">
                        {c.weight > 0 ? "+" : ""}
                        {c.weight}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>

              {analysis.recommendations.length > 0 ? (
                <section>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                    {t("recommendationsKicker", { count: analysis.recommendations.length })}
                  </p>
                  <ol className="space-y-3">
                    {analysis.recommendations.map((r, i) => (
                      <li
                        key={i}
                        className="border border-[color:var(--color-border)] rounded-md p-4 bg-[color:var(--color-bg-subtle)]"
                      >
                        <div className="flex items-baseline justify-between gap-3 flex-wrap">
                          <p className="text-sm font-medium">
                            {i + 1}. {r.title}
                          </p>
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-warning)]">
                            {t("deadlineDays", { days: r.deadline_days })}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                          {r.detail}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              ) : null}

              {analysis.risks.length > 0 ? (
                <section>
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)] mb-3">
                    {t("risksKicker")}
                  </p>
                  <ul className="space-y-2">
                    {analysis.risks.map((r, i) => (
                      <li
                        key={i}
                        className="border-l-2 border-[color:var(--color-warning)] pl-3 text-sm text-[color:var(--color-fg-muted)] leading-relaxed"
                      >
                        {r}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <p className="text-[11px] italic text-[color:var(--color-fg-muted)] pt-3 border-t border-[color:var(--color-border)]">
                {t("rdgFooter")}
              </p>
            </>
          )}
        </div>
      </section>
    </Container>
  );
}
