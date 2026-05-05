import { ExternalLink } from "lucide-react";
import type { DeepLink } from "@/lib/legal/external-providers";

export function VobDeepLinks({
  links,
  paragraphRef,
  variant = "card",
}: {
  links: DeepLink[];
  paragraphRef: string;
  variant?: "card" | "inline";
}) {
  const preferred = links.find((l) => l.isPreferred);
  const others = links.filter((l) => !l.isPreferred);

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {links.map((l) => (
          <a
            key={l.provider.id}
            href={l.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1"
          >
            {l.provider.shortLabel}
            <ExternalLink size={10} aria-hidden />
          </a>
        ))}
      </div>
    );
  }

  return (
    <div className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
        Volltext bei externem Anbieter
      </p>
      <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
        Der Volltext der VOB/B ist urheberrechtlich geschützt (DIN Media). Wenn
        du dort ein Abo hast, öffne <strong>{paragraphRef}</strong> direkt bei
        deinem Anbieter:
      </p>

      {preferred ? (
        <div className="mt-4">
          <a
            href={preferred.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            {paragraphRef} bei {preferred.provider.shortLabel} öffnen
            <ExternalLink size={14} aria-hidden />
          </a>
          <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)]">
            Bevorzugter Anbieter — anpassbar in den{" "}
            <a
              href="/workspace#vob"
              className="underline hover:text-[color:var(--color-accent)]"
            >
              Workspace-Einstellungen
            </a>
            .
          </p>
        </div>
      ) : null}

      <ul className={`${preferred ? "mt-4 pt-4 border-t border-[color:var(--color-border)]" : "mt-4"} grid gap-2 sm:grid-cols-${preferred ? "2" : "3"}`}>
        {(preferred ? others : links).map((l) => (
          <li key={l.provider.id}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block border border-[color:var(--color-border)] bg-[color:var(--color-bg)] rounded-md p-3 hover:border-[color:var(--color-accent)] transition-colors group"
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[11px] font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                  {l.provider.shortLabel}
                </span>
                <ExternalLink
                  size={12}
                  className="text-[color:var(--color-fg-muted)] group-hover:text-[color:var(--color-accent)] transition-colors"
                  aria-hidden
                />
              </div>
              <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)] leading-snug">
                {l.provider.description}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
