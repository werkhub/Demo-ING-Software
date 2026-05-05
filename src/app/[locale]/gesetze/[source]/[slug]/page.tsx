import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { Honorartafel } from "@/components/honorartafel";
import { VobDeepLinks } from "@/components/vob-deep-links";
import { getLegalChunk, getLegalChunksBySource } from "@/db/queries";
import { LEGAL_SOURCE_META, type LegalSource } from "@/db/schema";
import { getCurrentWorkspace } from "@/lib/session";
import { parseHoaiBlocks, type HoaiBlock } from "@/lib/legal/hoai-table-parser";
import { resolveVobView } from "@/lib/legal/vob-resolver";

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

export default async function GesetzDetail({
  params,
}: {
  params: Promise<{ source: string; slug: string }>;
}) {
  const { source, slug } = await params;
  if (!isLegalSource(source)) notFound();

  const [chunk, allInSource] = await Promise.all([
    getLegalChunk(source, slug),
    getLegalChunksBySource(source),
  ]);
  if (!chunk) notFound();

  const meta = LEGAL_SOURCE_META[source];
  const idx = allInSource.findIndex((c) => c.slug === slug);
  const prev = idx > 0 ? allInSource[idx - 1] : null;
  const next = idx >= 0 && idx < allInSource.length - 1 ? allInSource[idx + 1] : null;

  // VOB (Teile A, B, C) hat lizenzrechtliche Besonderheiten → Resolver entscheidet die Anzeige.
  // BGB/HOAI sind amtliche Werke (§ 5 UrhG) und werden direkt gerendert.
  const isVob = source === "vob_a" || source === "vob_b" || source === "vob_c";
  const workspace = isVob ? await getCurrentWorkspace() : null;
  const view =
    isVob && workspace ? resolveVobView(chunk, workspace, source) : null;

  return (
    <Container>
      <section className="pt-14 pb-8">
        <nav className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          <Link
            href="/gesetze"
            className="hover:text-[color:var(--color-accent)] transition-colors"
          >
            Gesetze
          </Link>
          <span aria-hidden>/</span>
          <Link
            href={`/gesetze/${source}`}
            className="hover:text-[color:var(--color-accent)] transition-colors"
          >
            {sourceLabel(source)}
          </Link>
          <span aria-hidden>/</span>
          <span className="text-[color:var(--color-fg)]">{chunk.ref}</span>
        </nav>

        <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          {chunk.ref}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {chunk.title}
        </h1>
        {chunk.summary && !isVob ? (
          <p className="mt-5 max-w-3xl text-base text-[color:var(--color-fg-muted)] leading-relaxed">
            {chunk.summary}
          </p>
        ) : null}
        {isVob ? (
          <div className="mt-5 inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] rounded-sm px-2 py-1">
            {view?.mode === "fulltext"
              ? `Volltext · ${view.sourceLabel}`
              : "Paraphrasierte Zusammenfassung"}
          </div>
        ) : null}
      </section>

      {!isVob ? (
        <section className="pb-10 border-t border-[color:var(--color-border)] pt-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-5">
            Volltext
          </p>
          {source === "hoai" ? (
            <HoaiContent
              content={chunk.content}
              caption={`${chunk.ref} · ${chunk.title}`}
            />
          ) : (
            <article className="max-w-3xl whitespace-pre-wrap text-[15px] leading-[1.75] text-[color:var(--color-fg)] font-serif">
              {chunk.content}
            </article>
          )}
          <p className="mt-8 pt-5 border-t border-[color:var(--color-border)] text-xs text-[color:var(--color-fg-muted)] max-w-3xl">
            Quelle: {meta.basis}
          </p>
        </section>
      ) : null}

      {isVob && view?.mode === "paraphrase" ? (
        <>
          <section className="pb-10 border-t border-[color:var(--color-border)] pt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-5">
              Zusammenfassung
            </p>
            <article className="max-w-3xl whitespace-pre-wrap text-[15px] leading-[1.75] text-[color:var(--color-fg)] font-serif">
              {view.paraphraseContent}
            </article>
            <p className="mt-6 text-[12px] italic text-[color:var(--color-fg-muted)] max-w-3xl">
              {view.disclaimer}
            </p>
          </section>

          <section className="pb-10 max-w-3xl">
            <VobDeepLinks links={view.deepLinks} paragraphRef={view.ref} />
          </section>
        </>
      ) : null}

      {isVob && view?.mode === "fulltext" ? (
        <>
          <section className="pb-10 border-t border-[color:var(--color-border)] pt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-5">
              Volltext · {view.sourceLabel}
            </p>
            <article className="max-w-3xl whitespace-pre-wrap text-[15px] leading-[1.75] text-[color:var(--color-fg)] font-serif">
              {view.fulltextContent}
            </article>
            <p className="mt-8 pt-5 border-t border-[color:var(--color-border)] text-xs text-[color:var(--color-fg-muted)] max-w-3xl">
              {meta.basis}
            </p>
          </section>

          <section className="pb-10 border-t border-[color:var(--color-border)] pt-8 max-w-3xl">
            <details>
              <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors">
                Eigene Zusammenfassung anzeigen
              </summary>
              <article className="mt-4 whitespace-pre-wrap text-[14px] leading-[1.7] text-[color:var(--color-fg-muted)]">
                {view.paraphraseContent}
              </article>
            </details>
          </section>
        </>
      ) : null}

      <section className="pb-16 border-t border-[color:var(--color-border)] pt-8">
        <div className="grid grid-cols-2 gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)]">
          <div className="bg-[color:var(--color-bg)] p-5">
            {prev ? (
              <Link href={`/gesetze/${source}/${prev.slug}`} className="group">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-accent)] transition-colors">
                  ← {prev.ref}
                </p>
                <p className="mt-2 text-sm font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                  {prev.title}
                </p>
              </Link>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                Erster Paragraph
              </p>
            )}
          </div>
          <div className="bg-[color:var(--color-bg)] p-5 text-right">
            {next ? (
              <Link href={`/gesetze/${source}/${next.slug}`} className="group block">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-accent)] transition-colors">
                  {next.ref} →
                </p>
                <p className="mt-2 text-sm font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                  {next.title}
                </p>
              </Link>
            ) : (
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                Letzter Paragraph
              </p>
            )}
          </div>
        </div>
      </section>
    </Container>
  );
}

/**
 * HOAI-Volltext mit Block-Struktur.
 *
 * `parseHoaiBlocks` zerlegt den XML-Roh-Text in Paragraphen, Listen und
 * Honorartafel. Listen-Marker (Verklumpung „1.2.3.…N.") werden gesplittet,
 * Reihenfolge „Liste vor Intro" wird korrigiert. Bei sauberem Split wird
 * eine echte `<ol>` gerendert, sonst ein hervorgehobener Quote-Block — der
 * Inhalt geht in keinem Fall verloren.
 */
function HoaiContent({ content, caption }: { content: string; caption: string }) {
  const { blocks } = parseHoaiBlocks(content);

  return (
    <article className="max-w-3xl text-[15px] leading-[1.75] text-[color:var(--color-fg)]">
      {blocks.map((b, i) => (
        <HoaiBlockRender key={i} block={b} caption={caption} />
      ))}
    </article>
  );
}

function HoaiBlockRender({
  block,
  caption,
}: {
  block: HoaiBlock;
  caption: string;
}) {
  if (block.kind === "table") {
    // Tafel darf breiter sein als Prosa — eigener max-Container.
    return (
      <div className="-mx-2 sm:mx-0 max-w-5xl">
        <Honorartafel table={block.table} caption={caption} />
      </div>
    );
  }

  if (block.kind === "paragraph") {
    return <ParagraphBlock marker={block.marker} text={block.text} />;
  }

  // Liste — Items kommen sauber aus dem XML, kein Splitting mehr nötig.
  return (
    <div className="my-3 flex gap-4">
      <MarkerColumn marker={null} />
      <ol className="flex-1 min-w-0 list-decimal pl-6 space-y-1.5 font-serif marker:text-[color:var(--color-fg-muted)] marker:font-mono marker:text-[12px]">
        {block.items.map((item, i) => (
          <li key={i} className="pl-1">
            {item}
          </li>
        ))}
      </ol>
    </div>
  );
}

function ParagraphBlock({
  marker,
  text,
}: {
  marker: string | null;
  text: string;
}) {
  return (
    <div className="my-4 flex gap-4">
      <MarkerColumn marker={marker} />
      <p className="flex-1 min-w-0 font-serif whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function MarkerColumn({ marker }: { marker: string | null }) {
  return (
    <span
      aria-hidden={marker ? undefined : true}
      className="shrink-0 w-10 pt-[3px] text-right font-mono text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-fg-muted)] select-none"
    >
      {marker ?? ""}
    </span>
  );
}
