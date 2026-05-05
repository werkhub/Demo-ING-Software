"use client";

import { useMemo, useState } from "react";

type LvOption = { id: string; oz: string | null; shortText: string };

type Position = {
  posNr: string;
  bezeichnung: string;
  menge: string;
  einheit: string;
  einzelpreis: string;
  lvPositionId: string;
};

const empty = (i: number): Position => ({
  posNr: String(i + 1).padStart(2, "0"),
  bezeichnung: "",
  menge: "",
  einheit: "Stk",
  einzelpreis: "",
  lvPositionId: "",
});

const inputCls =
  "w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 py-1.5 text-xs text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

export function PositionenEditor({ lvOptions }: { lvOptions: LvOption[] }) {
  const [rows, setRows] = useState<Position[]>([empty(0)]);

  const json = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((r) => r.bezeichnung.trim().length > 0)
          .map((r) => {
            const menge = Number(r.menge.replace(",", ".")) || 0;
            const ep = Number(r.einzelpreis.replace(",", ".")) || 0;
            return {
              posNr: r.posNr,
              bezeichnung: r.bezeichnung,
              menge,
              einheit: r.einheit,
              einzelpreisCents: Math.round(ep * 100),
              gesamtpreisCents: Math.round(menge * ep * 100),
              lvPositionId: r.lvPositionId || undefined,
            };
          })
      ),
    [rows]
  );

  const summeCents = rows.reduce((s, r) => {
    const menge = Number(r.menge.replace(",", ".")) || 0;
    const ep = Number(r.einzelpreis.replace(",", ".")) || 0;
    return s + Math.round(menge * ep * 100);
  }, 0);

  const summeFmt = new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(summeCents / 100);

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          Positionen ({rows.length})
        </p>
        <span className="font-mono text-xs">Summe: {summeFmt}</span>
      </div>

      <div className="border border-[color:var(--color-border)] rounded-md overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
            <tr>
              <th className="px-2 py-2 text-left w-16">Pos</th>
              <th className="px-2 py-2 text-left">Bezeichnung</th>
              <th className="px-2 py-2 text-right w-20">Menge</th>
              <th className="px-2 py-2 text-left w-20">Einheit</th>
              <th className="px-2 py-2 text-right w-24">EP €</th>
              <th className="px-2 py-2 text-left w-48">LV-Pos. (optional)</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => (
              <tr
                key={idx}
                className="border-t border-[color:var(--color-border)]"
              >
                <td className="px-2 py-1.5">
                  <input
                    value={r.posNr}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, posNr: v } : x))
                      );
                    }}
                    className={inputCls}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.bezeichnung}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, bezeichnung: v } : x))
                      );
                    }}
                    className={inputCls}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.menge}
                    inputMode="decimal"
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, menge: v } : x))
                      );
                    }}
                    className={`${inputCls} text-right font-mono`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.einheit}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, einheit: v } : x))
                      );
                    }}
                    className={inputCls}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <input
                    value={r.einzelpreis}
                    inputMode="decimal"
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, einzelpreis: v } : x))
                      );
                    }}
                    className={`${inputCls} text-right font-mono`}
                  />
                </td>
                <td className="px-2 py-1.5">
                  <select
                    value={r.lvPositionId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, lvPositionId: v } : x))
                      );
                    }}
                    className={inputCls}
                  >
                    <option value="">— ohne —</option>
                    {lvOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.oz ? `${o.oz} · ` : ""}
                        {o.shortText.slice(0, 50)}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-1.5 text-center">
                  {rows.length > 1 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setRows((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)]"
                      aria-label="Position entfernen"
                    >
                      ✕
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, empty(prev.length)])}
        className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-[10px] uppercase tracking-wider hover:bg-[color:var(--color-bg-subtle)] transition-colors"
      >
        + Position
      </button>

      <input type="hidden" name="positionenJson" value={json} />
      <input
        type="hidden"
        name="summeNettoCents"
        value={String(summeCents)}
      />
    </div>
  );
}
