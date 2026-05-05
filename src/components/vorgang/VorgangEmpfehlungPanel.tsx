import type { VorgangAnalysisStep } from "@/db/schema";

type Recommendation = {
  title: string;
  rationale?: string;
};

function parseRecommendations(raw: string): Recommendation[] {
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      return data
        .map((it) => {
          if (typeof it === "string") return { title: it };
          if (it && typeof it === "object" && "title" in it) {
            return {
              title: String((it as { title: unknown }).title ?? ""),
              rationale:
                typeof (it as { rationale?: unknown }).rationale === "string"
                  ? String((it as { rationale: string }).rationale)
                  : undefined,
            };
          }
          return null;
        })
        .filter((x): x is Recommendation => Boolean(x && x.title));
    }
    if (data && typeof data === "object" && Array.isArray(data.recommendations)) {
      return parseRecommendations(JSON.stringify(data.recommendations));
    }
  } catch {
    /* ignore */
  }
  return [];
}

export function VorgangEmpfehlungPanel({
  steps,
}: {
  steps: VorgangAnalysisStep[];
}) {
  const empfehlungen = steps
    .filter((s) => s.kind === "empfehlung")
    .flatMap((s) => parseRecommendations(s.payloadJson));

  if (empfehlungen.length === 0) {
    return (
      <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center">
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Noch keine Empfehlungen. Sobald die KI-Analyse läuft, erscheint hier eine Schritt-für-Schritt-Liste mit Annehmen/Ablehnen-Aktion pro Punkt.
        </p>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {empfehlungen.map((r, i) => (
        <li
          key={i}
          className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-4 flex items-start gap-4"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] shrink-0 mt-0.5">
            #{i + 1}
          </span>
          <div className="flex-1">
            <p className="text-sm font-medium text-[color:var(--color-fg)]">
              {r.title}
            </p>
            {r.rationale ? (
              <p className="mt-1.5 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                {r.rationale}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              disabled
              className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] rounded-sm px-2 py-1 cursor-not-allowed"
              title="In einem späteren Sprint aktivierbar"
            >
              Annehmen
            </button>
            <button
              type="button"
              disabled
              className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] rounded-sm px-2 py-1 cursor-not-allowed"
            >
              Ablehnen
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
