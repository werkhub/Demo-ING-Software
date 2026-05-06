import { Container } from "@/components/container";
import { RdgBanner } from "@/components/rdg-banner";
import { RgbWissenClient } from "./rgb-client";

export const dynamic = "force-dynamic";

export default function RgbWissenPage() {
  return (
    <Container>
      <section className="pt-14 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Werkzeuge · Wissen · Demo
        </p>
        <div className="mt-4 flex items-baseline gap-3 flex-wrap">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter">
            RGB-Wissensdatenbank
          </h1>
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] rounded-sm px-1.5 py-0.5">
            Demo
          </span>
        </div>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Interne Wissensdatenbank des RGB-Systems. Stelle eine Frage zu
          Prozessen, Standards oder internem Know-how — die Antwort wird
          ausschließlich angezeigt und nirgends gespeichert.
        </p>
        <div className="mt-6">
          <RdgBanner />
        </div>
      </section>

      <RgbWissenClient />

      <section className="pb-16">
        <div className="border-l-2 border-[color:var(--color-warning)] pl-5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
            Status
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
            Demo ohne Persistenz. Fragen und Antworten werden nicht gespeichert
            und verlassen den Browser-Tab nicht. Anbindung an die reale
            RGB-Wissensbasis (Embeddings + RAG) folgt in Phase 1.
          </p>
        </div>
      </section>
    </Container>
  );
}
