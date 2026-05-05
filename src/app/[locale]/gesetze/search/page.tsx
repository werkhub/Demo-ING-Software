import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { searchLegal } from "@/db/queries";
import { LEGAL_SOURCE_META, type LegalSource } from "@/db/schema";

export const dynamic = "force-dynamic";

function highlight(text: string, q: string): React.ReactNode {
  if (!q) return text;
  const re = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  return parts.map((p, i) =>
    re.test(p) ? (
      <mark
        key={i}
        className="bg-[color:var(--color-warning-soft)] text-[color:var(--color-fg)] rounded-sm px-0.5"
      >
        {p}
      </mark>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export default async function GesetzeSearch({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const results = query.length >= 2 ? await searchLegal(query) : [];

  return (
    <Container>
      <section className="pt-14 pb-10">
        <Link
          href="/gesetze"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Zurück zur Übersicht
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Volltext-Suche
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          „{query}“
        </h1>
        <p className="mt-4 text-base text-[color:var(--color-fg-muted)]">
          {results.length} {results.length === 1 ? "Treffer" : "Treffer"} in BGB · HOAI · VOB/A · VOB/B · VOB/C
        </p>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-10">
        <form action="/gesetze/search" method="get" className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            name="q"
            type="search"
            defaultValue={query}
            placeholder="z. B. „Vertragsstrafe“, „§ 650b“, „Behinderung“…"
            minLength={2}
            className="flex-1 bg-[color:var(--color-bg-subtle)] border border-transparent rounded-full px-5 py-2.5 text-sm text-[color:var(--color-fg)] placeholder:text-[color:var(--color-fg-muted)] focus:bg-[color:var(--color-bg)] focus:border-[color:var(--color-border)] focus:outline-none transition-colors"
          />
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Suchen <span aria-hidden>→</span>
          </button>
        </form>
      </section>

      <section className="pb-16">
        {query.length < 2 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] py-12 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
            Mindestens 2 Zeichen eingeben.
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] py-12 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
            Keine Treffer für „{query}“.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {results.map((r) => {
              const src = r.source as LegalSource;
              const meta = LEGAL_SOURCE_META[src];
              return (
                <li key={r.id}>
                  <Link
                    href={`/gesetze/${src}/${r.slug}`}
                    className="block py-5 group hover:bg-[color:var(--color-bg-subtle)] -mx-2 px-2 rounded-md transition-colors"
                  >
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                        {meta.title.split(" ")[0]}
                      </span>
                      <span className="text-[color:var(--color-border)]">·</span>
                      <span className="font-mono text-xs font-medium">{r.ref}</span>
                    </div>
                    <h3 className="mt-1 text-base font-medium group-hover:text-[color:var(--color-accent)] transition-colors">
                      {highlight(r.title, query)}
                    </h3>
                    {r.summary && (
                      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
                        {highlight(r.summary, query)}
                      </p>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Container>
  );
}
