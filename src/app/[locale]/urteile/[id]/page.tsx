import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Container } from "@/components/container";
import { getCaseDecisionById } from "@/db/queries";
import { RdgFooterNote } from "@/components/rdg-footer-note";

export const dynamic = "force-dynamic";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

export default async function UrteilDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const decision = await getCaseDecisionById(id);
  if (!decision) notFound();

  return (
    <Container size="narrow">
      <div className="pt-14 pb-16">
        <Link
          href="/urteile"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Alle Urteile
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          {decision.az}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter leading-tight">
          {decision.title}
        </h1>
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            {decision.court}
          </span>
          <span className="text-[color:var(--color-border)]">·</span>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            {formatDate(decision.date)}
          </span>
          {decision.decisionType ? (
            <>
              <span className="text-[color:var(--color-border)]">·</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                {decision.decisionType}
              </span>
            </>
          ) : null}
          {decision.senate ? (
            <>
              <span className="text-[color:var(--color-border)]">·</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                {decision.senate}-Senat
              </span>
            </>
          ) : null}
        </div>

        <section className="mt-10 border-t border-[color:var(--color-border)] pt-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            Volltext
          </p>
          <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
            Der amtliche Volltext (Tatbestand, Entscheidungsgründe, Tenor) liegt
            beim Bundesministerium der Justiz und wird nicht in dieser App
            gespiegelt — Leitsatz und Tenor sind frei (§ 5 UrhG), die
            redaktionelle Kommentierung der Verlagsversionen aber lizenzpflichtig.
          </p>
          <a
            href={decision.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Volltext bei rechtsprechung-im-internet.de
            <ExternalLink size={14} aria-hidden />
          </a>
        </section>

        <section className="mt-10 border-t border-[color:var(--color-border)] pt-8 space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            ECLI-Identifier
          </p>
          <code className="block font-mono text-xs text-[color:var(--color-fg-muted)] break-all bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md p-3">
            {decision.ecli}
          </code>
          <p className="text-[11px] text-[color:var(--color-fg-muted)]">
            ECLI = European Case Law Identifier, eindeutiger EU-weiter Schlüssel
            für Gerichtsentscheidungen.
          </p>
        </section>

        <section className="mt-10 pt-8 border-t border-[color:var(--color-border)]">
          <RdgFooterNote />
          <p className="text-[11px] italic text-[color:var(--color-fg-muted)] mt-2">
            Stand der Erfassung in dieser Datenbank:{" "}
            {formatDate(decision.fetchedAt.toISOString().slice(0, 10))}.
          </p>
        </section>
      </div>
    </Container>
  );
}
