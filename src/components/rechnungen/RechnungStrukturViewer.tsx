"use client";

import { useState, useTransition } from "react";
import type { RechnungPosition } from "@/db/schema";
import { fmtMoney } from "@/lib/utils";
import {
  addRechnungPosition,
  deleteRechnungPosition,
  runAnomalieEngine,
} from "@/app/[locale]/rechnungen/actions";
import type { ActionResult } from "@/lib/action-result";

type AnomalyFlag = {
  kind: string;
  severity: "info" | "warning" | "critical";
  description: string;
};

function parseFlags(raw: string): AnomalyFlag[] {
  try {
    const data = JSON.parse(raw);
    if (Array.isArray(data)) return data as AnomalyFlag[];
  } catch {
    /* ignore */
  }
  return [];
}

function severityClass(s: AnomalyFlag["severity"]): string {
  if (s === "critical")
    return "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]";
  if (s === "warning")
    return "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]";
  return "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]";
}

export function RechnungStrukturViewer({
  rechnungId,
  positions,
}: {
  rechnungId: string;
  positions: RechnungPosition[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [lvPosition, setLvPosition] = useState("");
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nextIndex = positions.length;

  function add() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("rechnungId", rechnungId);
      fd.set("positionIndex", String(nextIndex));
      if (lvPosition) fd.set("lvPosition", lvPosition);
      fd.set("description", description);
      fd.set("quantity", quantity);
      if (unit) fd.set("unit", unit);
      fd.set("unitPrice", unitPrice);
      const q = Number(quantity) || 0;
      const u = Number(unitPrice) || 0;
      fd.set("totalPrice", String(+(q * u).toFixed(2)));
      const res = (await addRechnungPosition(null, fd)) as ActionResult<{ id: string }>;
      if (!res.ok) {
        setError(res.formError ?? "Position konnte nicht angelegt werden.");
        return;
      }
      setLvPosition("");
      setDescription("");
      setQuantity("1");
      setUnit("");
      setUnitPrice("");
      setShowForm(false);
    });
  }

  function remove(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await deleteRechnungPosition(fd);
    });
  }

  function runEngine() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", rechnungId);
      await runAnomalieEngine(fd);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="text-xs font-mono uppercase tracking-[0.18em] rounded-full border border-[color:var(--color-border)] px-3 py-1.5 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
        >
          {showForm ? "Abbrechen" : "Position erfassen"}
        </button>
        <button
          type="button"
          onClick={runEngine}
          disabled={isPending || positions.length === 0}
          className="text-xs font-mono uppercase tracking-[0.18em] rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-3 py-1.5 transition-colors disabled:opacity-50"
        >
          {isPending ? "Prüft…" : "Anomalie-Engine starten"}
        </button>
      </div>

      {showForm ? (
        <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] p-4 grid gap-3 md:grid-cols-6">
          <Field label="LV-Pos." value={lvPosition} onChange={setLvPosition} className="md:col-span-1" placeholder="01.10.20" />
          <Field label="Beschreibung *" value={description} onChange={setDescription} className="md:col-span-3" />
          <Field label="Menge" value={quantity} onChange={setQuantity} className="md:col-span-1" />
          <Field label="Einheit" value={unit} onChange={setUnit} className="md:col-span-1" placeholder="m²" />
          <Field label="Einzelpreis €" value={unitPrice} onChange={setUnitPrice} className="md:col-span-1" />
          <div className="md:col-span-6 flex items-center gap-3">
            <button
              type="button"
              onClick={add}
              disabled={isPending || !description || !unitPrice}
              className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-4 py-2 transition-colors disabled:opacity-50"
            >
              {isPending ? "Speichert…" : "Position speichern"}
            </button>
            {error ? (
              <p className="text-xs text-[color:var(--color-critical)]">{error}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {positions.length === 0 ? (
        <p className="text-sm text-[color:var(--color-fg-muted)] py-6 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
          Keine Positionen erfasst. Du kannst manuell anlegen oder einen ZUGFeRD-Parser anschließen (POC).
        </p>
      ) : (
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[color:var(--color-border)]">
                <Th>#</Th>
                <Th>LV-Pos.</Th>
                <Th>Beschreibung</Th>
                <Th className="text-right">Menge</Th>
                <Th>Einheit</Th>
                <Th className="text-right">Einzelpreis</Th>
                <Th className="text-right">Gesamt</Th>
                <Th>Anomalie</Th>
                <Th></Th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p) => {
                const flags = parseFlags(p.anomalyFlags);
                return (
                  <tr
                    key={p.id}
                    className="border-b border-[color:var(--color-border)]"
                  >
                    <td className="py-2 px-3 align-top text-xs">{p.positionIndex + 1}</td>
                    <td className="py-2 px-3 align-top text-xs font-mono">
                      {p.lvPosition ?? "—"}
                    </td>
                    <td className="py-2 px-3 align-top text-sm">{p.description}</td>
                    <td className="py-2 px-3 align-top text-xs text-right">{p.quantity}</td>
                    <td className="py-2 px-3 align-top text-xs">{p.unit ?? "—"}</td>
                    <td className="py-2 px-3 align-top text-xs text-right">
                      {fmtMoney(p.unitPrice)}
                    </td>
                    <td className="py-2 px-3 align-top text-xs text-right">
                      {fmtMoney(p.totalPrice)}
                    </td>
                    <td className="py-2 px-3 align-top">
                      {flags.length > 0 ? (
                        <ul className="space-y-1">
                          {flags.map((f, i) => (
                            <li key={i}>
                              <span
                                className={`font-mono text-[9px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${severityClass(f.severity)}`}
                                title={f.description}
                              >
                                {f.kind}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[10px] text-[color:var(--color-fg-muted)]">—</span>
                      )}
                    </td>
                    <td className="py-2 px-3 align-top text-right">
                      <button
                        type="button"
                        onClick={() => remove(p.id)}
                        disabled={isPending}
                        className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                        aria-label="Position löschen"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] text-left py-2 px-3 ${className}`}
    >
      {children}
    </th>
  );
}

function Field({
  label,
  value,
  onChange,
  className = "",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2.5 py-1.5 focus:outline-none focus:border-[color:var(--color-accent)]"
      />
    </label>
  );
}
