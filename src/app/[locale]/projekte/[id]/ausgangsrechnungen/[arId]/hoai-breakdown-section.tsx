import type { HoaiBreakdownRow } from "@/lib/hoai/schlussrechnung";
import { LP_LABEL } from "@/lib/hoai/leistungsphasen";
import { fmtMoney } from "@/lib/utils";

/**
 * Zeigt die HOAI-Aufschlüsselung pro Leistungsphase in der AR-Detail-Page.
 * Snapshot — die Werte stammen aus dem Zeitpunkt der AR-Erstellung
 * (nicht aus dem Live-Calculator).
 */
export function HoaiBreakdownSection({
  breakdownJson,
}: {
  breakdownJson: string | null;
}) {
  if (!breakdownJson) return null;

  let rows: HoaiBreakdownRow[];
  try {
    const parsed = JSON.parse(breakdownJson);
    if (!Array.isArray(parsed)) return null;
    rows = parsed as HoaiBreakdownRow[];
  } catch {
    return null;
  }
  if (rows.length === 0) return null;

  const sollSumme = rows.reduce((s, r) => s + r.sollCents, 0);
  const vorherSumme = rows.reduce((s, r) => s + r.vorherCents, 0);
  const jetztSumme = rows.reduce((s, r) => s + r.jetztCents, 0);

  return (
    <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
        HOAI-Aufschlüsselung (Snapshot)
      </p>
      <p className="text-xs text-[color:var(--color-fg-muted)] mb-4 max-w-2xl">
        Soll = HOAI-Honorar pro Leistungsphase. Vorher = bereits in voherigen
        Rechnungen abgerechnet. Jetzt = mit dieser Schlussrechnung.
      </p>
      <div className="border border-[color:var(--color-border)] rounded-md overflow-hidden">
        <div className="grid grid-cols-12 gap-2 bg-[color:var(--color-bg-subtle)] border-b border-[color:var(--color-border)] py-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          <div className="col-span-1">LP</div>
          <div className="col-span-4">Phase</div>
          <div className="col-span-2 text-right">Soll</div>
          <div className="col-span-2 text-right">Vorher</div>
          <div className="col-span-2 text-right">Jetzt</div>
          <div className="col-span-1 text-right">%</div>
        </div>
        <div className="divide-y divide-[color:var(--color-border)]">
          {rows.map((r) => {
            const jetztPct = r.jetztPct - r.vorherPct;
            return (
              <div
                key={r.lp}
                className="grid grid-cols-12 gap-2 py-2 px-3 text-sm items-center"
              >
                <div className="col-span-1 font-mono text-xs">LP{r.lp}</div>
                <div className="col-span-4 text-xs">
                  {LP_LABEL[r.lp as keyof typeof LP_LABEL] ?? `LP ${r.lp}`}
                </div>
                <div className="col-span-2 text-right font-mono text-xs">
                  {fmtMoney(r.sollCents / 100)}
                </div>
                <div className="col-span-2 text-right font-mono text-xs text-[color:var(--color-fg-muted)]">
                  {fmtMoney(r.vorherCents / 100)}
                </div>
                <div className="col-span-2 text-right font-mono text-xs">
                  {fmtMoney(r.jetztCents / 100)}
                </div>
                <div className="col-span-1 text-right font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                  +{(jetztPct * 100).toFixed(0)}
                </div>
              </div>
            );
          })}
          {/* Summenzeile */}
          <div className="grid grid-cols-12 gap-2 py-2 px-3 text-sm items-center bg-[color:var(--color-bg-subtle)] font-medium">
            <div className="col-span-1 font-mono text-xs">Σ</div>
            <div className="col-span-4 text-xs">Summe HOAI-Honorar</div>
            <div className="col-span-2 text-right font-mono text-xs">
              {fmtMoney(sollSumme / 100)}
            </div>
            <div className="col-span-2 text-right font-mono text-xs text-[color:var(--color-fg-muted)]">
              {fmtMoney(vorherSumme / 100)}
            </div>
            <div className="col-span-2 text-right font-mono text-xs">
              {fmtMoney(jetztSumme / 100)}
            </div>
            <div className="col-span-1 text-right font-mono text-[10px] text-[color:var(--color-fg-muted)]">
              {sollSumme > 0
                ? ((jetztSumme / sollSumme) * 100).toFixed(0)
                : "0"}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
