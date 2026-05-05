import type { HoaiHonorartafel } from "@/lib/legal/hoai-table-parser";

const numberFormatter = new Intl.NumberFormat("de-DE");
const decimalFormatter = new Intl.NumberFormat("de-DE", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatBasis(value: number, unit: "ha" | "EUR"): string {
  if (unit === "ha") {
    return `${decimalFormatter.format(value)} ha`;
  }
  return `${numberFormatter.format(value)} €`;
}

function formatEuro(value: number): string {
  return numberFormatter.format(value);
}

/**
 * Honorartafel der HOAI 2021 — strukturierte Darstellung.
 *
 * Layout:
 * - Sticky Bezugsgrößen-Spalte links (auf Mobile horizontal scrollbar).
 * - Zonen-Gruppenheader (z. B. „Honorarzone I sehr geringe Anforderungen")
 *   spannt zwei Sub-Spalten „von" / „bis".
 * - Werte rechtsbündig mit `tabular-nums` für saubere Tausender-Trennung.
 *
 * Quelle: amtliches Werk · § 5 UrhG (gemeinfrei). Werte werden zur Render-Zeit
 * aus dem Volltext-Content der HOAI extrahiert und gegen die Invariante
 * v(i+1) = b(i) validiert (siehe lib/legal/hoai-table-parser.ts).
 */
export function Honorartafel({
  table,
  caption,
}: {
  table: HoaiHonorartafel;
  caption?: string;
}) {
  return (
    <figure className="my-6 not-prose">
      <div className="overflow-x-auto border border-[color:var(--color-border)] rounded-sm">
        <table className="w-full border-collapse text-[13px] tabular-nums">
          {caption ? (
            <caption className="caption-top text-left px-4 pt-4 pb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
              {caption}
            </caption>
          ) : null}

          <thead>
            <tr className="bg-[color:var(--color-bg-subtle)]">
              <th
                rowSpan={2}
                scope="col"
                className="sticky left-0 z-10 bg-[color:var(--color-bg-subtle)] border-r border-b border-[color:var(--color-border)] px-3 py-3 text-left align-bottom font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] min-w-[7rem]"
              >
                {table.basis.label}
              </th>
              {table.zones.map((zone) => (
                <th
                  key={zone.roman}
                  colSpan={2}
                  scope="colgroup"
                  className="border-l border-b border-[color:var(--color-border)] px-3 py-2 text-center align-top"
                >
                  <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                    Honorarzone&nbsp;{zone.roman}
                  </span>
                  <span className="mt-1 block text-[11px] font-normal text-[color:var(--color-fg-muted)] leading-snug">
                    {zone.label}
                  </span>
                </th>
              ))}
            </tr>
            <tr className="bg-[color:var(--color-bg-subtle)]">
              {table.zones.map((zone) => (
                <Subhead key={zone.roman} romanKey={zone.roman} />
              ))}
            </tr>
          </thead>

          <tbody>
            {table.rows.map((row, i) => (
              <tr
                key={`${row.basis}-${i}`}
                className="hover:bg-[color:var(--color-accent-soft)] transition-colors"
              >
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-[color:var(--color-bg)] border-r border-t border-[color:var(--color-border)] px-3 py-2 text-right font-mono text-[12px] font-medium text-[color:var(--color-fg)]"
                >
                  {formatBasis(row.basis, table.basis.unit)}
                </th>
                {row.zones.map((zone, k) => (
                  <Cells
                    key={`${i}-${k}`}
                    von={zone.von}
                    bis={zone.bis}
                    isFirst={k === 0}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <figcaption className="mt-3 text-[11px] text-[color:var(--color-fg-muted)] leading-relaxed">
        „von&ldquo; = Basishonorarsatz · „bis&ldquo; = oberer Honorarsatz.
        Werte in&nbsp;€ netto, gemäß HOAI&nbsp;2021. Zwischenstufen sind nach
        §&nbsp;14 HOAI durch lineare Interpolation zu ermitteln.
      </figcaption>
    </figure>
  );
}

function Subhead({ romanKey }: { romanKey: string }) {
  return (
    <>
      <th
        scope="col"
        className="border-l border-b border-[color:var(--color-border)] px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] font-normal"
        aria-label={`Honorarzone ${romanKey} – Basishonorarsatz`}
      >
        von
      </th>
      <th
        scope="col"
        className="border-b border-[color:var(--color-border)] px-3 py-2 text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] font-normal"
        aria-label={`Honorarzone ${romanKey} – oberer Honorarsatz`}
      >
        bis
      </th>
    </>
  );
}

function Cells({
  von,
  bis,
  isFirst,
}: {
  von: number;
  bis: number;
  isFirst: boolean;
}) {
  return (
    <>
      <td
        className={`${isFirst ? "border-l" : "border-l border-[color:var(--color-border)]/50"} border-t border-[color:var(--color-border)] px-3 py-2 text-right text-[color:var(--color-fg)]`}
      >
        {formatEuro(von)}
      </td>
      <td className="border-t border-[color:var(--color-border)] px-3 py-2 text-right text-[color:var(--color-fg)]">
        {formatEuro(bis)}
      </td>
    </>
  );
}
