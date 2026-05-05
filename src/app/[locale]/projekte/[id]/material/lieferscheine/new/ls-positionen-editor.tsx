"use client";

import { useEffect, useMemo, useState } from "react";

type Bestellpos = {
  id: string;
  posNr: string;
  bezeichnung: string;
  menge: number;
  einheit: string;
};

type LsPosition = {
  bestellposId: string;
  bezeichnung: string;
  menge: string;
  einheit: string;
  mangelText: string;
};

const inputCls =
  "w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 py-1.5 text-xs text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

export function LsPositionenEditor({
  bestellpositionen,
}: {
  bestellpositionen: Bestellpos[];
}) {
  const [rows, setRows] = useState<LsPosition[]>([]);

  // Beim ersten Mount oder wenn Bestellpos sich ändert: ein Vorschlag-Set
  // mit allen Bestellpositionen anlegen (Menge leer = Übernahme leerlassen).
  useEffect(() => {
    if (bestellpositionen.length === 0) {
      setRows([
        { bestellposId: "", bezeichnung: "", menge: "", einheit: "", mangelText: "" },
      ]);
      return;
    }
    setRows(
      bestellpositionen.map((bp) => ({
        bestellposId: bp.id,
        bezeichnung: bp.bezeichnung,
        menge: String(bp.menge),
        einheit: bp.einheit,
        mangelText: "",
      }))
    );
  }, [bestellpositionen]);

  const json = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter((r) => r.bezeichnung.trim().length > 0 && Number(r.menge) > 0)
          .map((r) => ({
            bestellposId: r.bestellposId || undefined,
            bezeichnung: r.bezeichnung,
            menge: Number(r.menge.replace(",", ".")) || 0,
            einheit: r.einheit,
            mangelText: r.mangelText || undefined,
          }))
      ),
    [rows]
  );

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        Positionen ({rows.length})
      </p>

      <div className="border border-[color:var(--color-border)] rounded-md overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
            <tr>
              <th className="px-2 py-2 text-left">Bezeichnung</th>
              <th className="px-2 py-2 text-right w-20">Menge</th>
              <th className="px-2 py-2 text-left w-20">Einheit</th>
              <th className="px-2 py-2 text-left">Mangel/Notiz</th>
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
                    value={r.mangelText}
                    onChange={(e) => {
                      const v = e.target.value;
                      setRows((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, mangelText: v } : x))
                      );
                    }}
                    className={inputCls}
                    placeholder="optional"
                  />
                </td>
                <td className="px-2 py-1.5 text-center">
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={() =>
          setRows((prev) => [
            ...prev,
            { bestellposId: "", bezeichnung: "", menge: "", einheit: "Stk", mangelText: "" },
          ])
        }
        className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-[10px] uppercase tracking-wider hover:bg-[color:var(--color-bg-subtle)] transition-colors"
      >
        + Position
      </button>

      <input type="hidden" name="positionenJson" value={json} />
    </div>
  );
}
