"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { evaluateFormula } from "@/lib/aufmass/formula";
import { addAufmassZeile } from "./aufmass-actions";

export type LvItemMin = {
  id: string;
  oz: string | null;
  shortText: string;
  unit: string | null;
  unitPrice: number | null;
};

export function ZeileForm({
  aufmassId,
  lvItems,
}: {
  aufmassId: string;
  lvItems: LvItemMin[];
}) {
  const [state, formAction] = useActionState(addAufmassZeile, null);
  const [open, setOpen] = useState(false);
  const [lvItemId, setLvItemId] = useState<string>("");
  const [formula, setFormula] = useState<string>("");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [unit, setUnit] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);
  const { push } = useToast();

  const fieldErrors = state && !state.ok ? state.fieldErrors : undefined;
  const formError = state && !state.ok ? state.formError : undefined;
  const success = state?.ok ? state.data : null;

  const selectedItem = useMemo(
    () => lvItems.find((i) => i.id === lvItemId) ?? null,
    [lvItems, lvItemId]
  );

  // Bei LV-Item-Wechsel: Snapshot ins Form übernehmen
  useEffect(() => {
    if (selectedItem) {
      setUnit(selectedItem.unit ?? "");
      setUnitPrice(
        selectedItem.unitPrice !== null ? String(selectedItem.unitPrice) : ""
      );
    }
  }, [selectedItem]);

  // Live-Auswertung
  const evalResult = useMemo(() => {
    if (!formula.trim()) return null;
    return evaluateFormula(formula);
  }, [formula]);

  const previewQuantity = evalResult?.ok ? evalResult.value : null;
  const previewTotal = useMemo(() => {
    if (previewQuantity === null) return null;
    const p = parseFloat(unitPrice.replace(",", "."));
    if (!Number.isFinite(p)) return null;
    return Math.round(previewQuantity * p * 100) / 100;
  }, [previewQuantity, unitPrice]);

  useEffect(() => {
    if (success) {
      formRef.current?.reset();
      setOpen(false);
      setLvItemId("");
      setFormula("");
      setUnit("");
      setUnitPrice("");
      push({ tone: "success", title: "Zeile erfasst" });
    }
  }, [success, push]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
      >
        + Aufmaßzeile erfassen
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-5 space-y-4"
    >
      <input type="hidden" name="aufmassId" value={aufmassId} />

      {formError ? (
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-3 py-2 text-sm">
          {formError}
        </div>
      ) : null}

      <div>
        <label
          htmlFor="lvItemId"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          LV-Position (optional, mit Snapshot von EH und EP)
        </label>
        <select
          id="lvItemId"
          name="lvItemId"
          value={lvItemId}
          onChange={(e) => setLvItemId(e.target.value)}
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        >
          <option value="">— freie Zeile (ohne LV-Bezug) —</option>
          {lvItems.map((it) => (
            <option key={it.id} value={it.id}>
              {it.oz ? `${it.oz}  ` : ""}
              {it.shortText.slice(0, 80)}
              {it.unit ? `  ·  ${it.unit}` : ""}
              {it.unitPrice !== null ? `  ·  ${it.unitPrice} €` : ""}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label
          htmlFor="ozOverride"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          OZ-Override (optional)
        </label>
        <input
          id="ozOverride"
          name="ozOverride"
          type="text"
          maxLength={200}
          placeholder="nur ausfüllen wenn von LV-Position abweichend"
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="description"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Beschreibung
        </label>
        <input
          id="description"
          name="description"
          type="text"
          required
          minLength={1}
          maxLength={2000}
          placeholder="z. B. Treppenhaus EG, Putz Wand"
          className={
            "w-full bg-[color:var(--color-bg)] border rounded-md px-3 py-2 text-sm focus:outline-none transition-colors " +
            (fieldErrors?.description
              ? "border-[color:var(--color-critical)]"
              : "border-[color:var(--color-border)] focus:border-[color:var(--color-accent)]")
          }
        />
      </div>

      <div>
        <label
          htmlFor="formula"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          REB-Formel
        </label>
        <input
          id="formula"
          name="formula"
          type="text"
          maxLength={2000}
          value={formula}
          onChange={(e) => setFormula(e.target.value)}
          placeholder='z. B. 3,50 * 2,80 - 0,90 * 2,10'
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
        />
        {evalResult ? (
          evalResult.ok ? (
            <p className="mt-1 text-xs text-[color:var(--color-success)] font-mono">
              = {previewQuantity?.toLocaleString("de-DE")} {unit}
              {previewTotal !== null
                ? ` · ${previewTotal.toLocaleString("de-DE")} €`
                : ""}
            </p>
          ) : (
            <p className="mt-1 text-xs text-[color:var(--color-critical)]">
              Formel-Fehler: {evalResult.error}
            </p>
          )
        ) : (
          <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
            Komma als Dezimaltrennzeichen, Klammern erlaubt. Beispiel:
            (1,2 + 0,8) * 3,5
          </p>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label
            htmlFor="unit"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
          >
            Einheit
          </label>
          <input
            id="unit"
            name="unit"
            type="text"
            maxLength={20}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="m², Stk, psch …"
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
        <div>
          <label
            htmlFor="unitPrice"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
          >
            EP (€) — Snapshot zur Zeit der Erfassung
          </label>
          <input
            id="unitPrice"
            name="unitPrice"
            type="number"
            step="0.01"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="notes"
          className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
        >
          Notizen (intern, optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          maxLength={2000}
          className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-3 py-1.5 transition-colors"
        >
          Abbrechen
        </button>
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors disabled:opacity-60 disabled:cursor-wait"
    >
      {pending ? "Speichere …" : "Zeile speichern"}
    </button>
  );
}
