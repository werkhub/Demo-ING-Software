import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getLegalChunksBySource } from "@/db/queries";
import { LEGAL_SOURCE_META, type LegalSource } from "@/db/schema";

export const dynamic = "force-dynamic";

const VALID_SOURCES: LegalSource[] = [
  "bgb",
  "hoai",
  "vob_a",
  "vob_b",
  "vob_c",
];

function isLegalSource(value: string): value is LegalSource {
  return (VALID_SOURCES as string[]).includes(value);
}

function sourceLabel(source: LegalSource) {
  if (source === "vob_a") return "VOB/A";
  if (source === "vob_b") return "VOB/B";
  if (source === "vob_c") return "VOB/C";
  return source.toUpperCase();
}

export default async function GesetzSource({
  params,
}: {
  params: Promise<{ source: string }>;
}) {
  const { source } = await params;
  if (!isLegalSource(source)) notFound();

  const meta = LEGAL_SOURCE_META[source];
  const chunks = await getLegalChunksBySource(source);

  return (
    <Container>
      <section className="pt-14 pb-8">
        <Link
          href="/gesetze"
          className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
        >
          ← Gesetze
        </Link>
        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          {sourceLabel(source)} ·{" "}
          {meta.status === "frei" ? "Frei nutzbar" : "Lizenziert"}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {meta.title}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {meta.subtitle}
        </p>
        <p className="mt-3 text-xs text-[color:var(--color-fg-muted)]">
          {meta.basis}
        </p>
      </section>

      <section className="pb-16 border-t border-[color:var(--color-border)]">
        {chunks.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] py-12 text-center border border-dashed border-[color:var(--color-border)] rounded-md mt-8">
            Noch keine Paragraphen hinterlegt.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)]">
            {chunks.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/gesetze/${source}/${c.slug}`}
                  className="grid grid-cols-[auto_1fr_auto] items-baseline gap-6 py-5 group"
                >
                  <span className="font-mono text-xs uppercase tracking-[0.18em] text-[color:var(--color-accent)] w-28 shrink-0">
                    {c.ref}
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                      {c.title}
                    </p>
                    {c.summary ? (
                      <p className="mt-1.5 text-sm text-[color:var(--color-fg-muted)] leading-relaxed line-clamp-2">
                        {c.summary}
                      </p>
                    ) : null}
                  </div>
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-accent)] transition-colors shrink-0">
                    Lesen →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Container>
  );
}
