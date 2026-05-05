"use client";

import { useMemo, useState } from "react";

type Bestellung = { id: string; bestellnummer: string; lieferantName: string };
type Lieferschein = {
  id: string;
  lsNr: string;
  datum: string;
  bestellungId: string | null;
};
type Rechnung = {
  id: string;
  supplierName: string;
  invoiceDate: string | null;
};

const inputCls =
  "mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";
const labelCls =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";

export function MatchForm({
  projektId,
  bestellungen,
  lieferscheine,
  rechnungen,
  action,
}: {
  projektId: string;
  bestellungen: Bestellung[];
  lieferscheine: Lieferschein[];
  rechnungen: Rechnung[];
  action: (formData: FormData) => Promise<void>;
}) {
  const [bestellungId, setBestellungId] = useState("");
  const [rechnungId, setRechnungId] = useState("");
  const [lsIds, setLsIds] = useState<string[]>([]);

  const matchingLs = useMemo(
    () =>
      lieferscheine.filter(
        (l) =>
          !bestellungId || l.bestellungId === bestellungId || l.bestellungId === null
      ),
    [bestellungId, lieferscheine]
  );

  const lsIdsJson = useMemo(() => JSON.stringify(lsIds), [lsIds]);

  return (
    <form action={action} className="space-y-5 max-w-2xl">
      <input type="hidden" name="projektId" value={projektId} />
      <input type="hidden" name="lsIdsJson" value={lsIdsJson} />

      <div>
        <label className={labelCls}>Bestellung *</label>
        <select
          name="bestellungId"
          required
          value={bestellungId}
          onChange={(e) => setBestellungId(e.target.value)}
          className={inputCls}
        >
          <option value="">— Bestellung wählen —</option>
          {bestellungen.map((b) => (
            <option key={b.id} value={b.id}>
              {b.bestellnummer} · {b.lieferantName}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelCls}>Eingangsrechnung *</label>
        <select
          name="rechnungId"
          required
          value={rechnungId}
          onChange={(e) => setRechnungId(e.target.value)}
          className={inputCls}
        >
          <option value="">— Rechnung wählen —</option>
          {rechnungen.map((r) => (
            <option key={r.id} value={r.id}>
              {r.supplierName} · {r.invoiceDate ?? "—"}
            </option>
          ))}
        </select>
        {rechnungen.length === 0 ? (
          <p className="mt-1 text-xs text-[color:var(--color-warning)]">
            Keine Eingangsrechnung im Status „eingegangen/geprueft" für dieses
            Projekt vorhanden.
          </p>
        ) : null}
      </div>

      <div>
        <label className={labelCls}>Lieferscheine (Mehrfachauswahl)</label>
        <div className="mt-1 max-h-60 overflow-y-auto rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] divide-y divide-[color:var(--color-border)]">
          {matchingLs.length === 0 ? (
            <p className="px-3 py-3 text-xs text-[color:var(--color-fg-muted)]">
              Keine passenden Lieferscheine — Match wird ohne LS-Mengen gegen
              die Bestellmenge geprüft.
            </p>
          ) : (
            matchingLs.map((l) => {
              const checked = lsIds.includes(l.id);
              return (
                <label
                  key={l.id}
                  className="flex items-center gap-3 px-3 py-2 text-xs hover:bg-[color:var(--color-bg-subtle)] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => {
                      setLsIds((prev) =>
                        e.target.checked
                          ? [...prev, l.id]
                          : prev.filter((x) => x !== l.id)
                      );
                    }}
                  />
                  <span className="font-mono">{l.lsNr}</span>
                  <span className="text-[color:var(--color-fg-muted)]">
                    {l.datum}
                  </span>
                  {l.bestellungId === null ? (
                    <span className="font-mono text-[10px] text-[color:var(--color-warning)]">
                      ohne Bestellung
                    </span>
                  ) : null}
                </label>
              );
            })
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Toleranz Menge %</label>
          <input
            name="toleranzPctMenge"
            type="number"
            step="0.1"
            min="0"
            max="100"
            defaultValue={2}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Toleranz Cent</label>
          <input
            name="toleranzCents"
            type="number"
            step="1"
            min="0"
            defaultValue={0}
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 pt-3">
        <button
          type="submit"
          disabled={!bestellungId || !rechnungId}
          className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Match starten
        </button>
        <p className="text-[10px] text-[color:var(--color-fg-muted)]">
          Bei Abweichung wird automatisch ein Vorgang erzeugt.
        </p>
      </div>
    </form>
  );
}
