import type { VorgangAnalysisStep, VorgangCitationKind } from "@/db/schema";
import { CitationBadge } from "./CitationBadge";

const KIND_LABEL: Record<VorgangAnalysisStep["kind"], string> = {
  klassifikation: "Klassifikation",
  recherche: "Recherche",
  empfehlung: "Empfehlung",
};

type CitationRef = {
  kind: VorgangCitationKind;
  ref: string;
  snippet?: string | null;
};

function parseCitations(raw: string): CitationRef[] {
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data as CitationRef[];
  } catch {
    /* ignore */
  }
  return [];
}

function summarizePayload(kind: VorgangAnalysisStep["kind"], raw: string): string {
  try {
    const data = JSON.parse(raw);
    if (kind === "klassifikation") {
      const cat = (data.category as string) ?? "—";
      const conf = typeof data.confidence === "number" ? Math.round(data.confidence * 100) : null;
      const terms = Array.isArray(data.matchedTerms) ? data.matchedTerms.join(", ") : "";
      return `Kategorie: ${cat}${conf !== null ? ` · ${conf} % Confidence` : ""}${terms ? ` · Treffer: ${terms}` : ""}`;
    }
    if (typeof data.summary === "string") return data.summary;
  } catch {
    /* ignore */
  }
  return "—";
}

export function VorgangAnalysePanel({
  steps,
}: {
  steps: VorgangAnalysisStep[];
}) {
  if (steps.length === 0) {
    return (
      <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center">
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Noch keine Analyse-Steps. Klassifikation kann auf der Übersicht angestoßen werden.
        </p>
      </div>
    );
  }

  return (
    <ol className="space-y-4">
      {steps.map((s, idx) => {
        const cites = parseCitations(s.citations);
        return (
          <li
            key={s.id}
            className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-5"
          >
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                Schritt {idx + 1} · {KIND_LABEL[s.kind]}
              </p>
              <p className="text-[11px] text-[color:var(--color-fg-muted)]">
                {s.createdAt.toLocaleString("de-DE")}
              </p>
            </div>
            <p className="text-sm text-[color:var(--color-fg)] leading-relaxed">
              {summarizePayload(s.kind, s.payloadJson)}
            </p>
            {cites.length > 0 ? (
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {cites.map((c, i) => (
                  <CitationBadge
                    key={`${c.kind}_${c.ref}_${i}`}
                    kind={c.kind}
                    cite={c.ref}
                    snippet={c.snippet}
                  />
                ))}
              </div>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
