"use client";

import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { checkAbschlag } from "@/lib/abschlag/check";
import { SAMPLE_ABSCHLAG_INPUT } from "@/lib/abschlag/sample";
import type {
  AbschlagInput,
  AbschlagPosition,
  CheckCategory,
} from "@/lib/abschlag/types";
import {
  savePruefung,
  createVorgangFromPruefung,
  loadAbschlagProjectContext,
  type ProjectContextResult,
} from "./actions";

type Project = { id: string; identifier: string; name: string };
type Subcontractor = {
  id: string;
  name: string;
  organization: string | null;
  freistellungBis: string | null;
};

const CATEGORY_LABEL: Record<CheckCategory, string> = {
  lv_match: "LV-Match",
  aufmass: "Aufmaß",
  kumulativ: "Kumulativ",
  sicherheit: "Sicherheit",
  skonto: "Skonto",
  ust: "USt § 13b",
  bauabzug: "Bauabzug § 48",
  frist: "Frist § 16",
  form: "Form",
  vertragsstrafe: "Vertragsstrafe",
};

const LEVEL_TONE: Record<string, string> = {
  high: "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]",
  medium:
    "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  info: "border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)]",
};

const POS_STATUS_TONE: Record<string, string> = {
  ok: "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]",
  warn: "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  err: "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]",
};

const DECISION_LABEL: Record<string, string> = {
  freigeben: "Freigeben",
  kuerzen: "Kürzen",
  ablehnen: "Ablehnen",
};

function fmtEur(n: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(n);
}

function emptyInput(): AbschlagInput {
  const today = new Date().toISOString().slice(0, 10);
  return {
    rechnungsNr: "",
    rechnungsdatum: today,
    rechnungseingangsdatum: today,
    lieferant: "",
    abschlagNr: 1,
    auftragssummeNetto: 0,
    vertragsstrafeOffenEur: 0,
    istBauleistungNu: false,
    ustSatz: 19,
    freistellungsbescheinigungVorhanden: false,
    bisherGezahltBrutto: 0,
    sicherheitseinbehaltVebProzent: 5,
    sicherheitseinbehaltGlbProzent: 0,
    skontoFristTage: null,
    skontoProzent: null,
    positionen: [],
  };
}

function emptyPosition(): AbschlagPosition {
  return {
    oz: "",
    beschreibung: "",
    einheit: "m²",
    menge: 0,
    einheitspreis: 0,
    lvEinheitspreis: null,
    lvMengeMax: null,
    aufmassMengeIst: null,
  };
}

export function AbschlagClient({
  projects,
  subcontractors,
}: {
  projects: Project[];
  subcontractors: Subcontractor[];
}) {
  const [projectId, setProjectId] = useState("");
  const [subcontractorId, setSubcontractorId] = useState("");
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [input, setInput] = useState<AbschlagInput>(emptyInput);
  const [showLvCols, setShowLvCols] = useState(true);
  const [tab, setTab] = useState<"input" | "result">("input");
  const [letterCopied, setLetterCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [projectContext, setProjectContext] = useState<ProjectContextResult | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);

  // Bei Projekt-/NU-Wechsel Kontext laden und Felder + Positionen vorbefüllen.
  // Eine Race-Condition-Sicherung über `cancelled` verhindert, dass alte
  // Antworten neuere überschreiben, wenn schnell hintereinander gewechselt wird.
  useEffect(() => {
    if (!projectId) {
      setProjectContext(null);
      return;
    }
    let cancelled = false;
    setLoadingContext(true);
    loadAbschlagProjectContext(projectId, subcontractorId || null)
      .then((ctx) => {
        if (cancelled) return;
        setProjectContext(ctx);
        if (!ctx.loaded) return;

        setInput((prev) => {
          const next: AbschlagInput = { ...prev };

          // Auftragssumme + Sicherheit aus Projekt-Stammdaten — nur wenn der
          // User noch nicht selbst getippt hat (Werte nahe Default).
          if (ctx.project?.value && next.auftragssummeNetto === 0) {
            next.auftragssummeNetto = ctx.project.value;
          }
          if (
            ctx.project?.securityRetentionPercent != null &&
            next.sicherheitseinbehaltVebProzent === 5
          ) {
            next.sicherheitseinbehaltVebProzent = ctx.project.securityRetentionPercent;
          }
          if (next.bisherGezahltBrutto === 0) {
            next.bisherGezahltBrutto = ctx.bisherGezahltBrutto;
          }
          if (
            ctx.bisherigeAbschlaegeAnzahl > 0 &&
            next.abschlagNr === 1
          ) {
            next.abschlagNr = ctx.bisherigeAbschlaegeAnzahl + 1;
          }

          // LV-Positionen mappen: wenn bereits Positionen mit gleicher OZ
          // existieren, nur LV-Sollwerte + Aufmaß ergänzen (User-Mengen nicht
          // überschreiben). Sonst LV als leere Demo-Vorlage übernehmen.
          if (next.positionen.length === 0 && ctx.lvPositionen.length > 0) {
            next.positionen = ctx.lvPositionen.map((p) => ({
              oz: p.oz,
              beschreibung: p.beschreibung,
              einheit: p.einheit,
              menge: 0,
              einheitspreis: p.einheitspreis,
              lvEinheitspreis: p.einheitspreis,
              lvMengeMax: p.menge,
              aufmassMengeIst: ctx.aufmassMengenByOz[p.oz] ?? null,
            }));
          } else if (next.positionen.length > 0) {
            next.positionen = next.positionen.map((pos) => {
              const lvMatch = ctx.lvPositionen.find((l) => l.oz === pos.oz);
              const aufmass = ctx.aufmassMengenByOz[pos.oz] ?? null;
              return {
                ...pos,
                lvEinheitspreis: pos.lvEinheitspreis ?? lvMatch?.einheitspreis ?? null,
                lvMengeMax: pos.lvMengeMax ?? lvMatch?.menge ?? null,
                aufmassMengeIst: pos.aufmassMengeIst ?? aufmass,
              };
            });
          }

          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, subcontractorId]);

  const result = useMemo(
    () =>
      input.positionen.length > 0 || input.rechnungsNr
        ? checkAbschlag(input)
        : null,
    [input]
  );

  function update<K extends keyof AbschlagInput>(key: K, value: AbschlagInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }));
  }

  function updatePosition(idx: number, patch: Partial<AbschlagPosition>) {
    setInput((prev) => ({
      ...prev,
      positionen: prev.positionen.map((p, i) => (i === idx ? { ...p, ...patch } : p)),
    }));
  }

  function addPosition() {
    setInput((prev) => ({ ...prev, positionen: [...prev.positionen, emptyPosition()] }));
  }

  function removePosition(idx: number) {
    setInput((prev) => ({
      ...prev,
      positionen: prev.positionen.filter((_, i) => i !== idx),
    }));
  }

  function loadSample() {
    setInput(SAMPLE_ABSCHLAG_INPUT);
    setTab("result");
    setPdfFilename(null);
  }

  function clearAll() {
    setInput(emptyInput());
    setTab("input");
    setPdfFilename(null);
  }

  function onPdfUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPdfFilename(file.name);
    // Demo: keine echte Extraktion. Hinweis statt Auto-Befüllung.
    if (input.positionen.length === 0) {
      setInput((prev) => ({
        ...prev,
        rechnungsNr: prev.rechnungsNr || file.name.replace(/\.[^.]+$/, ""),
      }));
    }
  }

  function onSubcontractorChange(id: string) {
    setSubcontractorId(id);
    if (!id) return;
    const s = subcontractors.find((x) => x.id === id);
    if (!s) return;
    const heute = new Date().toISOString().slice(0, 10);
    const istGueltig = !!(s.freistellungBis && s.freistellungBis >= heute);
    setInput((prev) => ({
      ...prev,
      lieferant: s.organization || s.name,
      istBauleistungNu: true,
      ustSatz: 0,
      freistellungsbescheinigungVorhanden: istGueltig,
    }));
  }

  function copyLetter() {
    if (!result) return;
    navigator.clipboard.writeText(result.letterDraftMarkdown).then(() => {
      setLetterCopied(true);
      setTimeout(() => setLetterCopied(false), 2000);
    });
  }

  async function onSave() {
    if (!result) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("subcontractorId", subcontractorId);
      fd.set("inputJson", JSON.stringify(input));
      fd.set("resultJson", JSON.stringify(result));
      fd.set("source", pdfFilename ? "pdf" : "manual");
      if (pdfFilename) fd.set("sourceFilename", pdfFilename);
      await savePruefung(fd);
    } finally {
      setSaving(false);
    }
  }

  async function onCreateVorgang() {
    if (!result) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("projectId", projectId);
      fd.set("subcontractorId", subcontractorId);
      fd.set("inputJson", JSON.stringify(input));
      fd.set("resultJson", JSON.stringify(result));
      await createVorgangFromPruefung(fd);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="border-t border-[color:var(--color-border)] pt-8 pb-10">
      {/* Top-Tabs */}
      <div className="flex items-center gap-1 mb-6 border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-1 w-fit">
        <button
          type="button"
          onClick={() => setTab("input")}
          className={`px-4 py-1.5 text-sm rounded transition-colors ${
            tab === "input"
              ? "bg-[color:var(--color-bg)] text-[color:var(--color-fg)] shadow-sm"
              : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          }`}
        >
          Eingabe
        </button>
        <button
          type="button"
          onClick={() => setTab("result")}
          disabled={!result}
          className={`px-4 py-1.5 text-sm rounded transition-colors disabled:opacity-30 ${
            tab === "result"
              ? "bg-[color:var(--color-bg)] text-[color:var(--color-fg)] shadow-sm"
              : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          }`}
        >
          Prüfung {result ? `· Score ${result.score}/100` : ""}
        </button>
        <span className="ml-3 flex items-center gap-2">
          <button
            type="button"
            onClick={loadSample}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors px-2"
          >
            Beispiel laden
          </button>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors px-2"
          >
            Leeren
          </button>
        </span>
      </div>

      {/* === EINGABE === */}
      {tab === "input" && (
        <div className="space-y-8">
          {/* Projekt-Kontext-Hint — zeigt was aus DB übernommen wurde */}
          {(loadingContext || (projectContext?.loaded && projectContext.hints.length > 0)) && (
            <div className="border border-[color:var(--color-accent-soft)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] rounded-md px-4 py-3 flex items-center gap-3 flex-wrap">
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] shrink-0">
                {loadingContext ? "Lädt …" : "Projekt-Kontext"}
              </span>
              {!loadingContext && projectContext?.hints.map((h, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 bg-[color:var(--color-bg)] rounded-full border border-[color:var(--color-accent-soft)]"
                >
                  {h}
                </span>
              ))}
              {!loadingContext &&
                projectContext?.loaded &&
                projectContext.lvPositionen.length === 0 &&
                projectContext.bisherigeAbschlaegeAnzahl === 0 && (
                  <span className="text-xs italic text-[color:var(--color-fg-muted)]">
                    Kein LV / keine Vorrechnungen am Projekt — Felder bitte manuell befüllen.
                  </span>
                )}
            </div>
          )}

          {/* Header-Grid */}
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Projekt">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              >
                <option value="">— kein Projekt —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.identifier} · {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nachunternehmer (optional)">
              <select
                value={subcontractorId}
                onChange={(e) => onSubcontractorChange(e.target.value)}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              >
                <option value="">— keiner —</option>
                {subcontractors.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.organization || s.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="PDF (optional)">
              <input
                type="file"
                accept="application/pdf,image/*"
                onChange={onPdfUpload}
                className="block w-full text-xs text-[color:var(--color-fg-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-[color:var(--color-border)] file:bg-[color:var(--color-bg-subtle)] file:text-[color:var(--color-fg)] file:text-xs hover:file:bg-[color:var(--color-bg)] file:cursor-pointer"
              />
              {pdfFilename ? (
                <p className="text-[11px] text-[color:var(--color-fg-muted)] mt-1">
                  {pdfFilename} (Demo: nur Dateiname genutzt)
                </p>
              ) : null}
            </Field>

            <Field label="Rechnungs-Nr.">
              <input
                value={input.rechnungsNr}
                onChange={(e) => update("rechnungsNr", e.target.value)}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Lieferant">
              <input
                value={input.lieferant}
                onChange={(e) => update("lieferant", e.target.value)}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Abschlag-Nr.">
              <input
                type="number"
                min={1}
                value={input.abschlagNr}
                onChange={(e) => update("abschlagNr", Number(e.target.value))}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>

            <Field label="Rechnungsdatum">
              <input
                type="date"
                value={input.rechnungsdatum}
                onChange={(e) => update("rechnungsdatum", e.target.value)}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Eingangsdatum">
              <input
                type="date"
                value={input.rechnungseingangsdatum}
                onChange={(e) => update("rechnungseingangsdatum", e.target.value)}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Auftragssumme netto (€)">
              <input
                type="number"
                value={input.auftragssummeNetto || ""}
                onChange={(e) => update("auftragssummeNetto", Number(e.target.value))}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>

            <Field label="Bisher gezahlt (brutto, €)">
              <input
                type="number"
                value={input.bisherGezahltBrutto || ""}
                onChange={(e) => update("bisherGezahltBrutto", Number(e.target.value))}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="USt-Satz (%)">
              <input
                type="number"
                step="0.1"
                value={input.ustSatz}
                onChange={(e) => update("ustSatz", Number(e.target.value))}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Bauleistung NU (§ 13b)">
              <label className="flex items-center gap-2 text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.istBauleistungNu}
                  onChange={(e) => update("istBauleistungNu", e.target.checked)}
                />
                <span>Reverse-Charge greift</span>
              </label>
            </Field>

            <Field label="Sicherheit VEB (%)">
              <input
                type="number"
                step="0.5"
                value={input.sicherheitseinbehaltVebProzent}
                onChange={(e) =>
                  update("sicherheitseinbehaltVebProzent", Number(e.target.value))
                }
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Sicherheit GLB (%)">
              <input
                type="number"
                step="0.5"
                value={input.sicherheitseinbehaltGlbProzent}
                onChange={(e) =>
                  update("sicherheitseinbehaltGlbProzent", Number(e.target.value))
                }
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Freistellung § 48b vorhanden">
              <label className="flex items-center gap-2 text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={input.freistellungsbescheinigungVorhanden}
                  onChange={(e) =>
                    update("freistellungsbescheinigungVorhanden", e.target.checked)
                  }
                />
                <span>Gültig (sonst 15 % Bauabzug)</span>
              </label>
            </Field>

            <Field label="Skonto-Frist (Tage)">
              <input
                type="number"
                value={input.skontoFristTage ?? ""}
                onChange={(e) =>
                  update("skontoFristTage", e.target.value === "" ? null : Number(e.target.value))
                }
                placeholder="z. B. 14"
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Skonto (%)">
              <input
                type="number"
                step="0.1"
                value={input.skontoProzent ?? ""}
                onChange={(e) =>
                  update("skontoProzent", e.target.value === "" ? null : Number(e.target.value))
                }
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Vertragsstrafe offen (€)">
              <input
                type="number"
                value={input.vertragsstrafeOffenEur ?? ""}
                onChange={(e) =>
                  update("vertragsstrafeOffenEur", e.target.value === "" ? null : Number(e.target.value))
                }
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
          </div>

          {/* Positionen-Tabelle */}
          <div>
            <div className="flex items-baseline justify-between gap-3 mb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                Positionen ({input.positionen.length})
              </p>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 text-xs text-[color:var(--color-fg-muted)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLvCols}
                    onChange={(e) => setShowLvCols(e.target.checked)}
                  />
                  LV/Aufmaß-Vergleich anzeigen
                </label>
                <button
                  type="button"
                  onClick={addPosition}
                  className="text-xs text-[color:var(--color-accent)] hover:text-[color:var(--color-fg)] transition-colors"
                >
                  + Position
                </button>
              </div>
            </div>

            {input.positionen.length === 0 ? (
              <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center text-sm text-[color:var(--color-fg-muted)]">
                Noch keine Positionen. „+ Position" klicken oder „Beispiel laden"
                oben rechts.
              </div>
            ) : (
              <div className="overflow-x-auto border border-[color:var(--color-border)] rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-[color:var(--color-bg-subtle)] border-b border-[color:var(--color-border)]">
                    <tr className="text-left">
                      <Th>OZ</Th>
                      <Th className="min-w-[14rem]">Beschreibung</Th>
                      <Th>Einh.</Th>
                      <Th className="text-right">Menge</Th>
                      <Th className="text-right">EP €</Th>
                      <Th className="text-right">Summe €</Th>
                      {showLvCols && (
                        <>
                          <Th className="text-right text-[color:var(--color-fg-muted)]">LV-EP</Th>
                          <Th className="text-right text-[color:var(--color-fg-muted)]">LV-Soll</Th>
                          <Th className="text-right text-[color:var(--color-fg-muted)]">Aufmaß-Ist</Th>
                        </>
                      )}
                      <Th />
                    </tr>
                  </thead>
                  <tbody>
                    {input.positionen.map((p, idx) => {
                      const summe = p.menge * p.einheitspreis;
                      return (
                        <tr key={idx} className="border-b border-[color:var(--color-border)] last:border-b-0">
                          <Td>
                            <Cell value={p.oz} onChange={(v) => updatePosition(idx, { oz: v })} />
                          </Td>
                          <Td>
                            <Cell
                              value={p.beschreibung}
                              onChange={(v) => updatePosition(idx, { beschreibung: v })}
                            />
                          </Td>
                          <Td>
                            <Cell
                              value={p.einheit}
                              onChange={(v) => updatePosition(idx, { einheit: v })}
                              className="w-12"
                            />
                          </Td>
                          <Td className="text-right">
                            <NumCell
                              value={p.menge}
                              onChange={(v) => updatePosition(idx, { menge: v ?? 0 })}
                            />
                          </Td>
                          <Td className="text-right">
                            <NumCell
                              value={p.einheitspreis}
                              onChange={(v) =>
                                updatePosition(idx, { einheitspreis: v ?? 0 })
                              }
                            />
                          </Td>
                          <Td className="text-right font-mono tabular-nums">
                            {summe.toFixed(2)}
                          </Td>
                          {showLvCols && (
                            <>
                              <Td className="text-right">
                                <NumCell
                                  value={p.lvEinheitspreis ?? null}
                                  onChange={(v) => updatePosition(idx, { lvEinheitspreis: v })}
                                  optional
                                />
                              </Td>
                              <Td className="text-right">
                                <NumCell
                                  value={p.lvMengeMax ?? null}
                                  onChange={(v) => updatePosition(idx, { lvMengeMax: v })}
                                  optional
                                />
                              </Td>
                              <Td className="text-right">
                                <NumCell
                                  value={p.aufmassMengeIst ?? null}
                                  onChange={(v) => updatePosition(idx, { aufmassMengeIst: v })}
                                  optional
                                />
                              </Td>
                            </>
                          )}
                          <Td>
                            <button
                              type="button"
                              onClick={() => removePosition(idx)}
                              aria-label="Position entfernen"
                              className="text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] px-1"
                            >
                              ✕
                            </button>
                          </Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setTab("result")}
              disabled={!result}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Prüfung anzeigen <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      )}

      {/* === ERGEBNIS === */}
      {tab === "result" && result && (
        <div className="space-y-7">
          {/* Hero */}
          <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-4">
            <div className="bg-[color:var(--color-bg)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
                Empfehlung
              </p>
              <span
                className={`mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-2 py-1 ${
                  result.decision === "freigeben"
                    ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]"
                    : result.decision === "kuerzen"
                      ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]"
                      : "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]"
                }`}
              >
                {DECISION_LABEL[result.decision]}
              </span>
            </div>
            <div className="bg-[color:var(--color-bg)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
                Score
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight">
                {result.score} / 100
              </p>
            </div>
            <div className="bg-[color:var(--color-bg)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
                Empfohlene Auszahlung
              </p>
              <p className="mt-3 text-xl font-semibold tracking-tight font-mono tabular-nums">
                {fmtEur(result.empfohleneZahlungBrutto)}
              </p>
            </div>
            <div className="bg-[color:var(--color-bg)] p-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
                Kürzung
              </p>
              <p className="mt-3 text-xl font-semibold tracking-tight font-mono tabular-nums text-[color:var(--color-warning)]">
                {fmtEur(result.empfohleneKuerzungBrutto)}
              </p>
            </div>
          </div>

          {/* Summen-Aufschlüsselung */}
          <div className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
              Berechnung
            </p>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm font-mono tabular-nums">
              <Row label="Rechnerische Nettosumme" value={fmtEur(result.rechnerischeNettosumme)} />
              <Row label="Rechnerische Bruttosumme" value={fmtEur(result.rechnerischeBruttosumme)} />
              <Row label="− Empfohlene Kürzung" value={fmtEur(result.empfohleneKuerzungBrutto)} tone="warn" />
              <Row label="− Sicherheitseinbehalt" value={fmtEur(result.sicherheitseinbehaltEur)} />
              <Row label="− Bauabzug § 48 EStG" value={fmtEur(result.bauabzugsEinbehaltEur)} />
              <Row label="Bisher gezahlt (kumulativ)" value={fmtEur(result.bereitsGezahltBrutto)} muted />
              <Row label="= Auszahlung jetzt" value={fmtEur(result.empfohleneZahlungBrutto)} bold />
              {result.skontoMoeglichBis && (
                <Row
                  label={`Skonto bis ${result.skontoMoeglichBis}`}
                  value={result.skontoBetragEur != null ? fmtEur(result.skontoBetragEur) : "—"}
                  muted
                />
              )}
            </dl>
          </div>

          {/* Per-Position-Status */}
          {result.positions.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                Positionen
              </p>
              <div className="overflow-x-auto border border-[color:var(--color-border)] rounded-md">
                <table className="w-full text-xs">
                  <thead className="bg-[color:var(--color-bg-subtle)] border-b border-[color:var(--color-border)] text-left">
                    <tr>
                      <Th>OZ</Th>
                      <Th>Status</Th>
                      <Th>Anmerkungen</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.positions.map((p) => (
                      <tr key={p.oz} className="border-b border-[color:var(--color-border)] last:border-b-0">
                        <Td className="font-mono">{p.oz}</Td>
                        <Td>
                          <span
                            className={`inline-grid place-items-center w-5 h-5 rounded-full text-xs ${POS_STATUS_TONE[p.status]}`}
                          >
                            {p.status === "ok" ? "✓" : p.status === "warn" ? "!" : "✗"}
                          </span>
                        </Td>
                        <Td className="text-[color:var(--color-fg-muted)]">
                          {p.notes.length > 0 ? p.notes.join(" · ") : "—"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Findings */}
          {result.findings.length > 0 && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                Befunde ({result.findings.length})
              </p>
              <ul className="space-y-2">
                {result.findings.map((f, i) => (
                  <li key={i} className={`border rounded-md px-4 py-3 ${LEVEL_TONE[f.level]}`}>
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold">
                        {f.title}
                        {f.oz ? (
                          <span className="ml-2 font-mono text-[10px] opacity-70">Pos. {f.oz}</span>
                        ) : null}
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">
                          {CATEGORY_LABEL[f.category]}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                          {f.level}
                        </span>
                      </div>
                    </div>
                    <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
                      {f.detail}
                    </p>
                    <p className="mt-1 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                      Basis · {f.basis}
                      {f.kuerzungNettoEur != null
                        ? ` · Kürzung ${fmtEur(f.kuerzungNettoEur)} netto`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Anschreiben */}
          <div>
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                Anschreiben-Entwurf
              </p>
              <button
                type="button"
                onClick={copyLetter}
                className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
              >
                {letterCopied ? "✓ Kopiert" : "In Zwischenablage kopieren"}
              </button>
            </div>
            <pre className="text-sm text-[color:var(--color-fg)] leading-relaxed whitespace-pre-wrap font-sans bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md p-5">
              {result.letterDraftMarkdown}
            </pre>
          </div>

          {/* Persistenz */}
          <div className="border border-[color:var(--color-accent-soft)] bg-[color:var(--color-bg-subtle)] rounded-md p-5 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
              Persistieren
            </p>
            <p className="text-xs text-[color:var(--color-fg-muted)]">
              Speichert Eingabe + Ergebnis in der DB. „In Vorgang" zusätzlich
              einen Vorgang mit Audit-Eintrag, Citations und Antwort-Entwurf.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={onSave}
                disabled={saving || !result}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-4 py-1.5 text-xs hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] disabled:opacity-50 transition-colors"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={onCreateVorgang}
                disabled={saving || !result}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] text-white px-5 py-1.5 text-xs hover:bg-[color:var(--color-fg)] disabled:opacity-50 transition-colors"
              >
                In Vorgang überführen <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Tiny Form Helpers ---------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-2 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-[color:var(--color-fg-muted)] font-medium ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-2 py-1.5 align-top ${className}`}>{children}</td>;
}

function Cell({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-transparent border-0 text-xs px-1 py-0.5 focus:bg-[color:var(--color-bg-subtle)] focus:outline-none rounded ${className}`}
    />
  );
}

function NumCell({
  value,
  onChange,
  optional = false,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  optional?: boolean;
}) {
  const display = value == null ? "" : String(value);
  return (
    <input
      type="number"
      step="any"
      value={display}
      onChange={(e) =>
        onChange(e.target.value === "" ? (optional ? null : 0) : Number(e.target.value))
      }
      className="w-full bg-transparent border-0 text-xs text-right tabular-nums px-1 py-0.5 focus:bg-[color:var(--color-bg-subtle)] focus:outline-none rounded"
      placeholder={optional ? "—" : ""}
    />
  );
}

function Row({
  label,
  value,
  bold,
  muted,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
  tone?: "warn";
}) {
  return (
    <>
      <dt className={`text-xs ${muted ? "text-[color:var(--color-fg-muted)]" : "text-[color:var(--color-fg)]"}`}>
        {label}
      </dt>
      <dd
        className={`text-right ${bold ? "font-bold" : ""} ${tone === "warn" ? "text-[color:var(--color-warning)]" : muted ? "text-[color:var(--color-fg-muted)]" : "text-[color:var(--color-fg)]"}`}
      >
        {value}
      </dd>
    </>
  );
}
