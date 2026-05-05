import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { getLegalSourceCounts } from "@/db/queries";
import { LEGAL_SOURCE_META, type LegalSource } from "@/db/schema";

export const dynamic = "force-dynamic";

const ORDER: LegalSource[] = ["bgb", "hoai", "vob_a", "vob_b", "vob_c"];

function sourceLabel(source: LegalSource) {
  if (source === "vob_a") return "VOB/A";
  if (source === "vob_b") return "VOB/B";
  if (source === "vob_c") return "VOB/C";
  return source.toUpperCase();
}

export default async function Gesetze() {
  const [counts, t, tLicense] = await Promise.all([
    getLegalSourceCounts(),
    getTranslations("modules.gesetze"),
    getTranslations("modules.gesetze.license"),
  ]);

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
      </section>

      <section className="pb-10">
        <form action="/gesetze/search" method="get" className="flex flex-col gap-3 md:flex-row md:items-center">
          <label
            htmlFor="q"
            className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] md:w-32 shrink-0"
          >
            {t("searchLabel")}
          </label>
          <input
            id="q"
            name="q"
            type="search"
            placeholder={t("searchPlaceholder")}
            minLength={2}
            className="flex-1 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-4 py-2.5 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:border-[color:var(--color-accent)] focus:outline-none"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            {t("searchSubmit")} <span aria-hidden>→</span>
          </button>
        </form>
      </section>

      <section className="pb-10">
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3">
          {ORDER.map((source) => {
            const meta = LEGAL_SOURCE_META[source];
            const count = counts[source];
            return (
              <Link
                key={source}
                href={`/gesetze/${source}`}
                className="bg-[color:var(--color-bg)] p-8 group hover:bg-[color:var(--color-bg-subtle)] transition-colors"
              >
                <div className="flex items-baseline justify-between mb-5">
                  <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                    {sourceLabel(source)}
                  </p>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 ${
                      meta.status === "frei"
                        ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]"
                        : "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]"
                    }`}
                  >
                    {meta.status === "frei" ? tLicense("free") : tLicense("licensed")}
                  </span>
                </div>
                <h2 className="text-2xl font-semibold tracking-tighter group-hover:text-[color:var(--color-accent)] transition-colors">
                  {meta.title}
                </h2>
                <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
                  {meta.subtitle}
                </p>
                <div className="mt-6 pt-4 border-t border-[color:var(--color-border)] flex items-baseline justify-between">
                  <p className="text-xs text-[color:var(--color-fg-muted)]">
                    {count}{" "}
                    {source === "vob_c" ? t("countAtv") : t("countParagraphs")}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-accent)] transition-colors">
                    {t("openCard")}
                  </p>
                </div>
                <p className="mt-4 text-[11px] text-[color:var(--color-fg-muted)] leading-relaxed">
                  {meta.basis}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="pb-16">
        <div className="border-l-2 border-[color:var(--color-info)] pl-5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-info)]">
            {t("vobNoticeKicker")}
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
            {t("vobNoticeBody")}
          </p>
        </div>
      </section>
    </Container>
  );
}
