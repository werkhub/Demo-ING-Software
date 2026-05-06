"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useSpeechRecognition } from "@/lib/bautagebuch/use-speech-recognition";
import {
  parseVoiceTranskript,
  SAMPLE_VOICE_TRANSKRIPT,
} from "@/lib/bautagebuch/voice-parser";
import type {
  Anordnung,
  AnwesenderWithConfidence,
  Arbeit,
  LieferungWithFlags,
  PlausibilityHint,
  ProjectVoiceContext,
  Vorfall,
  VoiceParseResult,
} from "@/lib/bautagebuch/voice-types";
import {
  createBautagebuchEntryFromVoice,
  loadVoiceProjectContext,
} from "./actions";

type Project = { id: string; identifier: string; name: string };

type Step = "rec" | "review";

type FormState = {
  projectId: string;
  authorName: string;
  entryDate: string;
  category: VoiceParseResult["kategorieVorschlag"];
  urgency: VoiceParseResult["urgencyVorschlag"];
  weatherCondition: NonNullable<VoiceParseResult["witterung"]["condition"]> | "";
  temperatureCelsius: number | "";
  staffHoursOwn: number | "";
  staffHoursSubcontractors: number | "";
  text: string;
  anwesende: AnwesenderWithConfidence[];
  arbeiten: Arbeit[];
  lieferungen: LieferungWithFlags[];
  anordnungen: Anordnung[];
  vorfaelle: Vorfall[];
  bedenken: string[];
  behinderungen: string[];
  plausibility: PlausibilityHint[];
  photoFilenames: string[];
  gpsLat: number | null;
  gpsLon: number | null;
  signedBy: string;
};

const URGENCY_TONE: Record<string, string> = {
  critical: "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]",
  warning: "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  info: "border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)]",
};

export function VoiceEntryClient({
  projects,
  workspaceName: _workspaceName,
  defaultAuthorName,
}: {
  projects: Project[];
  workspaceName: string;
  defaultAuthorName: string;
}) {
  void _workspaceName;
  const speech = useSpeechRecognition("de-DE");

  const [step, setStep] = useState<Step>("rec");
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [projectContext, setProjectContext] = useState<ProjectVoiceContext | null>(null);
  const [loadingContext, setLoadingContext] = useState(false);
  const [resolvedFollowUps, setResolvedFollowUps] = useState<Set<string>>(new Set());

  // Unified draft-Text — Voice + manuelles Tippen mischbar.
  // Voice-Hook pusht beim Wachsen `speech.transkript` als Delta in den Draft;
  // der User kann gleichzeitig oder davor / danach selbst tippen.
  const [draftText, setDraftText] = useState("");
  const lastVoiceSyncRef = useRef("");
  const [reparsing, setReparsing] = useState(false);

  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<FormState>(() => ({
    projectId: "",
    authorName: defaultAuthorName,
    entryDate: today,
    category: "allgemein",
    urgency: "info",
    weatherCondition: "",
    temperatureCelsius: "",
    staffHoursOwn: "",
    staffHoursSubcontractors: "",
    text: "",
    anwesende: [],
    arbeiten: [],
    lieferungen: [],
    anordnungen: [],
    vorfaelle: [],
    bedenken: [],
    behinderungen: [],
    plausibility: [],
    photoFilenames: [],
    gpsLat: null,
    gpsLon: null,
    signedBy: defaultAuthorName,
  }));

  // Projekt-Kontext laden bei Wechsel
  useEffect(() => {
    if (!form.projectId) {
      setProjectContext(null);
      return;
    }
    let cancelled = false;
    setLoadingContext(true);
    loadVoiceProjectContext(form.projectId)
      .then((ctx) => {
        if (cancelled) return;
        setProjectContext(ctx);
        setResolvedFollowUps(new Set());
      })
      .finally(() => {
        if (!cancelled) setLoadingContext(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.projectId]);

  // Voice → Draft: nur das *Delta* (neu hinzugekommene Voice-Segmente) anhängen,
  // damit User-Edits zwischen Voice-Pausen erhalten bleiben.
  useEffect(() => {
    const voice = speech.transkript;
    if (!voice) return;
    const last = lastVoiceSyncRef.current;
    if (voice === last) return;
    if (voice.startsWith(last)) {
      const delta = voice.slice(last.length).trim();
      if (delta) {
        setDraftText((prev) => {
          if (!prev) return delta;
          return prev.endsWith(" ") || prev.endsWith("\n") ? prev + delta : prev + " " + delta;
        });
      }
      lastVoiceSyncRef.current = voice;
    } else {
      // Voice wurde extern reset'et — ref ebenfalls neutralisieren.
      lastVoiceSyncRef.current = voice;
    }
  }, [speech.transkript]);

  const liveTranskript = useMemo(
    () => (speech.transkript + (speech.interim ? " " + speech.interim : "")).trim(),
    [speech.transkript, speech.interim]
  );

  function applyParse(parsed: VoiceParseResult) {
    setForm((prev) => ({
      ...prev,
      text: parsed.transkript,
      category: parsed.kategorieVorschlag,
      urgency: parsed.urgencyVorschlag,
      weatherCondition: parsed.witterung.condition ?? prev.weatherCondition,
      temperatureCelsius:
        parsed.witterung.temperatureCelsius ?? prev.temperatureCelsius,
      staffHoursOwn: parsed.staffHoursOwn ?? prev.staffHoursOwn,
      staffHoursSubcontractors:
        parsed.staffHoursSubcontractors ?? prev.staffHoursSubcontractors,
      anwesende: parsed.anwesende,
      arbeiten: parsed.arbeiten,
      lieferungen: parsed.lieferungen,
      anordnungen: parsed.anordnungen,
      vorfaelle: parsed.vorfaelle,
      bedenken: parsed.bedenken,
      behinderungen: parsed.behinderungen,
      plausibility: parsed.plausibility,
    }));
  }

  function onTranskribieren() {
    speech.stop();
    const text = (draftText || liveTranskript || speech.transkript).trim();
    if (!text) return;
    applyParse(parseVoiceTranskript(text, projectContext));
    setSigned(false);
    setStep("review");
  }

  function onSampleLoad() {
    setDraftText(SAMPLE_VOICE_TRANSKRIPT);
    lastVoiceSyncRef.current = "";
    applyParse(parseVoiceTranskript(SAMPLE_VOICE_TRANSKRIPT, projectContext));
    setSigned(false);
    setStep("review");
  }

  /** Erneutes Auswerten nach manueller Edit-Änderung des Transkripts in Step 2. */
  function onReparseFromForm() {
    if (!form.text.trim()) return;
    setReparsing(true);
    try {
      applyParse(parseVoiceTranskript(form.text, projectContext));
    } finally {
      setReparsing(false);
    }
  }

  function toggleFollowUp(id: string) {
    setResolvedFollowUps((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onResetVoice() {
    speech.stop();
    speech.reset();
    setStep("rec");
  }

  function onPhotoSelect(e: ChangeEvent<HTMLInputElement>) {
    const fl = e.target.files;
    if (!fl) return;
    const names: string[] = [];
    for (let i = 0; i < fl.length; i++) {
      const f = fl.item(i);
      if (f) names.push(f.name);
    }
    setForm((prev) => ({ ...prev, photoFilenames: [...prev.photoFilenames, ...names] }));
  }

  function onCaptureGps() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          gpsLat: pos.coords.latitude,
          gpsLon: pos.coords.longitude,
        }));
      },
      () => {
        // ignore — User hat verweigert
      },
      { enableHighAccuracy: false, timeout: 6_000 }
    );
  }

  async function onSubmit() {
    if (!signed) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.set("payload", JSON.stringify(form));
      fd.set("signedAtClientIso", new Date().toISOString());
      await createBautagebuchEntryFromVoice(fd);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="border-t border-[color:var(--color-border)] pt-8 pb-10">
      {/* Step-Tabs */}
      <div className="flex items-center gap-1 mb-6 border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-1 w-fit">
        <button
          type="button"
          onClick={() => setStep("rec")}
          className={`px-4 py-1.5 text-sm rounded transition-colors ${
            step === "rec"
              ? "bg-[color:var(--color-bg)] text-[color:var(--color-fg)] shadow-sm"
              : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          }`}
        >
          1 · Aufnahme
        </button>
        <button
          type="button"
          onClick={() => setStep("review")}
          disabled={!form.text}
          className={`px-4 py-1.5 text-sm rounded transition-colors disabled:opacity-30 ${
            step === "review"
              ? "bg-[color:var(--color-bg)] text-[color:var(--color-fg)] shadow-sm"
              : "text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          }`}
        >
          2 · Review &amp; Signieren
        </button>
      </div>

      {/* === STEP 1: REC === */}
      {step === "rec" && (
        <div className="space-y-6">
          {/* Projekt-Vorauswahl, damit Kontext beim Auswerten schon vorhanden ist */}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Projekt (für Kontext)">
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              >
                <option value="">— ohne Projekt-Kontext —</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.identifier} · {p.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <ProjectContextCard
            ctx={projectContext}
            loading={loadingContext}
            resolvedFollowUps={resolvedFollowUps}
            onToggleFollowUp={toggleFollowUp}
          />

          {!speech.supported && (
            <div className="border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] rounded-md px-4 py-3 text-sm">
              Dein Browser unterstützt die Web Speech API nicht (Firefox /
              älteres iOS). Probier Chrome oder Edge — oder lade unten das
              Beispiel-Transkript.
            </div>
          )}
          {speech.error && (
            <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md px-4 py-3 text-sm">
              Spracherkennung-Fehler: {speech.error} (Mikro-Berechtigung im
              Browser prüfen)
            </div>
          )}

          <div className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg)] p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                Transkript {speech.recording ? "· Aufnahme läuft" : "· editierbar"}
              </p>
              <div className="flex items-center gap-2">
                {speech.recording ? (
                  <button
                    type="button"
                    onClick={speech.stop}
                    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-critical)] text-white px-5 py-2 text-sm hover:opacity-90 transition-opacity"
                  >
                    ■ Stop
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={speech.start}
                    disabled={!speech.supported}
                    className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-5 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    🎤 Aufnahme starten
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    speech.reset();
                    lastVoiceSyncRef.current = "";
                    setDraftText("");
                  }}
                  className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-2 transition-colors"
                >
                  Zurücksetzen
                </button>
              </div>
            </div>

            <textarea
              rows={9}
              value={draftText}
              onChange={(e) => setDraftText(e.target.value)}
              placeholder={
                speech.recording
                  ? "… Spracherkennung läuft, Text erscheint hier. Du kannst während oder nach der Aufnahme tippen / korrigieren."
                  : 'Sprich auf Aufnahme oder tippe direkt: „Heute Dienstag, 18 Grad. Schmitt mit 4 Mann an Trockenbau im EG. Bauleiter Müller hat angeordnet…"'
              }
              className="w-full min-h-[200px] bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md p-4 text-sm text-[color:var(--color-fg)] leading-relaxed whitespace-pre-wrap font-sans resize-y focus:bg-[color:var(--color-bg)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
            />
            {speech.interim && (
              <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] italic">
                Interim: {speech.interim}
              </p>
            )}

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={onTranskribieren}
                disabled={!draftText.trim() && !speech.transkript.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] text-white px-5 py-2 text-sm hover:bg-[color:var(--color-fg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Transkript auswerten <span aria-hidden>→</span>
              </button>
              <button
                type="button"
                onClick={onSampleLoad}
                className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
              >
                Beispiel-Transkript laden
              </button>
              <span className="ml-auto text-[11px] text-[color:var(--color-fg-muted)] font-mono">
                {draftText.length} Zeichen
              </span>
            </div>
          </div>
        </div>
      )}

      {/* === STEP 2: REVIEW === */}
      {step === "review" && (
        <div className="space-y-6">
          <ProjectContextCard
            ctx={projectContext}
            loading={loadingContext}
            resolvedFollowUps={resolvedFollowUps}
            onToggleFollowUp={toggleFollowUp}
          />

          {form.plausibility.length > 0 && (
            <div className="border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] rounded-md p-4 space-y-1.5">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em]">
                Plausibilitäts-Hinweise
              </p>
              {form.plausibility.map((h, i) => (
                <p key={i} className="text-sm">⚠ {h.text}</p>
              ))}
            </div>
          )}

          {/* Header-Felder */}
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Projekt">
              <select
                value={form.projectId}
                onChange={(e) => setForm({ ...form, projectId: e.target.value })}
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
            <Field label="Tagesdatum">
              <input
                type="date"
                value={form.entryDate}
                onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Verfasser">
              <input
                value={form.authorName}
                onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>

            <Field label="Wetter">
              <select
                value={form.weatherCondition}
                onChange={(e) =>
                  setForm({
                    ...form,
                    weatherCondition: e.target.value as FormState["weatherCondition"],
                  })
                }
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              >
                <option value="">—</option>
                <option value="sonnig">sonnig</option>
                <option value="bewoelkt">bewölkt</option>
                <option value="regen">Regen</option>
                <option value="schnee">Schnee</option>
                <option value="frost">Frost</option>
                <option value="sturm">Sturm</option>
                <option value="nebel">Nebel</option>
              </select>
            </Field>
            <Field label="Temperatur (°C)">
              <input
                type="number"
                value={form.temperatureCelsius}
                onChange={(e) =>
                  setForm({
                    ...form,
                    temperatureCelsius: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Kategorie">
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value as FormState["category"] })
                }
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              >
                <option value="allgemein">allgemein</option>
                <option value="anordnung">anordnung</option>
                <option value="behinderung">behinderung</option>
                <option value="mangel">mangel</option>
                <option value="bedenken">bedenken</option>
                <option value="lieferung">lieferung</option>
                <option value="besichtigung">besichtigung</option>
                <option value="personal">personal</option>
              </select>
            </Field>

            <Field label="Stunden eigen">
              <input
                type="number"
                step="0.5"
                value={form.staffHoursOwn}
                onChange={(e) =>
                  setForm({
                    ...form,
                    staffHoursOwn: e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Stunden NU">
              <input
                type="number"
                step="0.5"
                value={form.staffHoursSubcontractors}
                onChange={(e) =>
                  setForm({
                    ...form,
                    staffHoursSubcontractors:
                      e.target.value === "" ? "" : Number(e.target.value),
                  })
                }
                className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2"
              />
            </Field>
            <Field label="Dringlichkeit">
              <span
                className={`inline-block font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-2 py-1.5 ${URGENCY_TONE[form.urgency]}`}
              >
                {form.urgency}
              </span>
            </Field>
          </div>

          {/* Roh-Transkript */}
          <div>
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
                Transkript (editierbar)
              </p>
              <button
                type="button"
                onClick={onReparseFromForm}
                disabled={reparsing || !form.text.trim()}
                className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] disabled:opacity-50 transition-colors"
              >
                {reparsing ? "Wertet aus…" : "↻ Erneut auswerten"}
              </button>
            </div>
            <textarea
              rows={5}
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="w-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-sans resize-y focus:bg-[color:var(--color-bg)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
            />
            <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)]">
              Nach Änderungen am Text auf „Erneut auswerten" klicken — strukturierte
              Felder unten werden dann neu berechnet (Anwesende, Anordnungen,
              Vorfälle, Plausibilitäts-Hinweise).
            </p>
          </div>

          {/* Strukturierte Sektionen */}
          {form.anwesende.length > 0 && (
            <Section title="Anwesende" count={form.anwesende.length}>
              <ul className="space-y-2">
                {form.anwesende.map((a, i) => {
                  const tone =
                    a.matchSource === "subcontractor"
                      ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]"
                      : a.matchSource === "history"
                        ? "border-[color:var(--color-accent-soft)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)]"
                        : "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]";
                  const label =
                    a.matchSource === "subcontractor"
                      ? "✓ NU-Stamm"
                      : a.matchSource === "history"
                        ? "✓ aus Historie"
                        : "neu — bestätigen";
                  return (
                    <li
                      key={i}
                      className="text-sm border border-[color:var(--color-border)] rounded-md px-3 py-2 flex items-baseline justify-between gap-3 flex-wrap"
                    >
                      <div>
                        <span className="font-medium">{a.name}</span>
                        {a.funktion ? <span className="text-[color:var(--color-fg-muted)]"> · {a.funktion}</span> : null}
                        {a.firma && a.firma !== a.name ? <span className="text-[color:var(--color-fg-muted)]"> · {a.firma}</span> : null}
                      </div>
                      <span className={`font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 ${tone}`}>
                        {label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {form.arbeiten.length > 0 && (
            <Section title="Geleistete Arbeiten" count={form.arbeiten.length}>
              <ul className="space-y-2">
                {form.arbeiten.map((a, i) => (
                  <li key={i} className="text-sm border border-[color:var(--color-border)] rounded-md px-3 py-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                      {a.gewerk}
                    </span>
                    {a.bauteil ? (
                      <span className="ml-2 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                        · {a.bauteil}
                      </span>
                    ) : null}
                    <p className="mt-1">{a.beschreibung}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {form.lieferungen.length > 0 && (
            <Section title="Materiallieferungen" count={form.lieferungen.length}>
              <ul className="space-y-2">
                {form.lieferungen.map((l, i) => (
                  <li
                    key={i}
                    className={`text-sm border rounded-md px-3 py-2 flex items-baseline justify-between gap-3 flex-wrap ${
                      l.duplicateLieferscheinNr
                        ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)]"
                        : "border-[color:var(--color-border)]"
                    }`}
                  >
                    <div>
                      <span className="font-medium">{l.material}</span>
                      <span className="text-[color:var(--color-fg-muted)]"> · {l.lieferant}</span>
                      {l.knownLieferant ? (
                        <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-success)]">
                          ✓ bekannter Lieferant
                        </span>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {l.duplicateLieferscheinNr && (
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-warning)]">
                          ⚠ Duplikat-Verdacht
                        </span>
                      )}
                      {l.lieferscheinNr ? (
                        <span className="font-mono text-[10px] text-[color:var(--color-accent)]">
                          Lieferschein {l.lieferscheinNr}
                        </span>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {form.anordnungen.length > 0 && (
            <Section title="AG-/Bauleitung-Anordnungen vor Ort" count={form.anordnungen.length}>
              <ul className="space-y-2">
                {form.anordnungen.map((a, i) => {
                  const krit = a.mehrkostenVorbehaltErforderlich && !a.mehrkostenVorbehaltGesetzt;
                  return (
                    <li
                      key={i}
                      className={`text-sm border rounded-md px-3 py-2 ${krit ? URGENCY_TONE.critical : URGENCY_TONE.warning}`}
                    >
                      <div className="flex items-baseline justify-between gap-2 flex-wrap">
                        <span className="font-medium">{a.erteilerName}</span>
                        {krit ? (
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                            ⚠ Mehrkosten-Vorbehalt fehlt (§ 2 Abs. 5/6 VOB/B)
                          </span>
                        ) : a.mehrkostenVorbehaltGesetzt ? (
                          <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                            ✓ Vorbehalt gesetzt
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1">{a.beschreibung}</p>
                    </li>
                  );
                })}
              </ul>
            </Section>
          )}

          {form.vorfaelle.length > 0 && (
            <Section title="Sicherheitsvorfälle" count={form.vorfaelle.length}>
              <ul className="space-y-2">
                {form.vorfaelle.map((v, i) => (
                  <li
                    key={i}
                    className={`text-sm border rounded-md px-3 py-2 ${v.personenschaden ? URGENCY_TONE.critical : URGENCY_TONE.warning}`}
                  >
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                        {v.art === "unfall" ? "Unfall" : v.art === "beinahe" ? "Beinahe-Unfall" : "Gefährdung"}
                      </span>
                      {v.dguvMeldepflichtig ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">
                          DGUV-Meldepflicht prüfen
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1">{v.beschreibung}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {form.bedenken.length > 0 && (
            <Section title="Bedenken / Hinweise" count={form.bedenken.length}>
              <ul className="space-y-1.5">
                {form.bedenken.map((b, i) => (
                  <li key={i} className="text-sm border-l-2 border-[color:var(--color-warning)] pl-3 py-1">
                    {b}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {form.behinderungen.length > 0 && (
            <Section title="Behinderungen" count={form.behinderungen.length}>
              <ul className="space-y-1.5">
                {form.behinderungen.map((b, i) => (
                  <li key={i} className="text-sm border-l-2 border-[color:var(--color-warning)] pl-3 py-1">
                    {b}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Foto-Platzhalter + GPS */}
          <Section title="Anlagen (Demo: Foto-Upload als Platzhalter)">
            <div className="flex flex-col gap-3">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={onPhotoSelect}
                className="block w-full text-xs text-[color:var(--color-fg-muted)] file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-[color:var(--color-border)] file:bg-[color:var(--color-bg-subtle)] file:text-[color:var(--color-fg)] file:text-xs hover:file:bg-[color:var(--color-bg)] file:cursor-pointer"
              />
              {form.photoFilenames.length > 0 && (
                <ul className="text-xs text-[color:var(--color-fg-muted)] space-y-1">
                  {form.photoFilenames.map((n, i) => (
                    <li key={i}>📷 {n}</li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-[color:var(--color-fg-muted)]">
                In dieser Demo wird nur der Dateiname referenziert — Datei selbst nicht hochgeladen.
              </p>

              <div className="flex items-center gap-3 pt-2 border-t border-[color:var(--color-border)]">
                <button
                  type="button"
                  onClick={onCaptureGps}
                  className="text-xs border border-[color:var(--color-border)] rounded-full px-3 py-1 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
                >
                  📍 GPS erfassen
                </button>
                {form.gpsLat != null && form.gpsLon != null ? (
                  <span className="font-mono text-[11px] text-[color:var(--color-accent)]">
                    {form.gpsLat.toFixed(5)}, {form.gpsLon.toFixed(5)}
                  </span>
                ) : (
                  <span className="text-xs text-[color:var(--color-fg-muted)]">
                    Optional — Vor-Ort-Nachweis
                  </span>
                )}
              </div>
            </div>
          </Section>

          {/* Signatur */}
          <div className="border border-[color:var(--color-accent-soft)] bg-[color:var(--color-bg-subtle)] rounded-md p-5 space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
              Digitale Signatur
            </p>
            <p className="text-xs text-[color:var(--color-fg-muted)]">
              Mit Signieren wird der Eintrag eingefroren — Server berechnet
              SHA-256-Hash über alle Felder. Nachträgliche Änderungen würden
              den Hash brechen und sind in der Liste sichtbar.
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="text"
                value={form.signedBy}
                onChange={(e) => setForm({ ...form, signedBy: e.target.value })}
                placeholder="Name des Bauleiters"
                className="text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 flex-1 min-w-[14rem]"
              />
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={signed}
                  onChange={(e) => setSigned(e.target.checked)}
                />
                Hiermit signiere ich diesen Tageseintrag.
              </label>
            </div>
            <div className="flex items-center gap-3 flex-wrap pt-2 border-t border-[color:var(--color-border)]">
              <button
                type="button"
                onClick={onResetVoice}
                className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors px-2"
              >
                ← Zurück zur Aufnahme
              </button>
              <button
                type="button"
                onClick={onSubmit}
                disabled={!signed || submitting || !form.signedBy.trim()}
                className="ml-auto inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] text-white px-5 py-2 text-sm hover:bg-[color:var(--color-fg)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? "Speichere…" : "Signieren & speichern"} <span aria-hidden>→</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Tiny helpers ---------- */

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

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-2">
        {title}
        {count != null ? ` (${count})` : ""}
      </p>
      {children}
    </div>
  );
}

function ProjectContextCard({
  ctx,
  loading,
  resolvedFollowUps,
  onToggleFollowUp,
}: {
  ctx: ProjectVoiceContext | null;
  loading: boolean;
  resolvedFollowUps: Set<string>;
  onToggleFollowUp: (id: string) => void;
}) {
  if (loading) {
    return (
      <div className="border border-[color:var(--color-accent-soft)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] rounded-md px-4 py-3 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em]">Lädt Projekt-Kontext …</span>
      </div>
    );
  }
  if (!ctx) return null;

  const totalFollowUps = ctx.openAnordnungen.length + ctx.openBedenken.length;

  return (
    <div className="border border-[color:var(--color-accent-soft)] bg-[color:var(--color-bg-subtle)] rounded-md p-5 space-y-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
          Projekt-Kontext
        </p>
        <div className="flex items-center gap-2 text-xs text-[color:var(--color-fg-muted)] flex-wrap">
          {ctx.projectStatus && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] border border-[color:var(--color-border)] rounded-sm px-1.5 py-0.5">
              {ctx.projectStatus}
            </span>
          )}
          <span>{ctx.recentEntries.length} Einträge / 30 T</span>
          <span>·</span>
          <span>{ctx.knownPersons.length} bek. Personen</span>
          <span>·</span>
          <span>{ctx.knownLieferanten.length} Lieferanten</span>
          {totalFollowUps > 0 && (
            <>
              <span>·</span>
              <span className="text-[color:var(--color-warning)]">{totalFollowUps} Follow-Up</span>
            </>
          )}
        </div>
      </div>

      {ctx.recentEntries.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-2">
            Letzte Einträge
          </p>
          <ul className="space-y-1.5">
            {ctx.recentEntries.map((e) => (
              <li key={e.id} className="text-xs flex gap-3">
                <span className="font-mono text-[color:var(--color-fg-muted)] w-20 shrink-0">
                  {e.entryDate}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] w-20 shrink-0">
                  {e.category}
                </span>
                <span className="text-[color:var(--color-fg)] flex-1 min-w-0 truncate">
                  {e.textSnippet}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {totalFollowUps > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-warning)] mb-2">
            Follow-Up nötig
          </p>
          <ul className="space-y-1.5">
            {ctx.openAnordnungen.map((a) => {
              const id = `a:${a.entryId}:${a.beschreibung.slice(0, 20)}`;
              const done = resolvedFollowUps.has(id);
              return (
                <li
                  key={id}
                  className={`text-xs border rounded-md px-3 py-2 flex items-baseline gap-2 ${
                    done
                      ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]"
                      : "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => onToggleFollowUp(id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                      {a.entryDate} · Anordnung ohne Vorbehalt
                    </p>
                    <p className="text-xs mt-0.5">{a.beschreibung}</p>
                  </div>
                </li>
              );
            })}
            {ctx.openBedenken.map((b) => {
              const id = `b:${b.entryId}:${b.text.slice(0, 20)}`;
              const done = resolvedFollowUps.has(id);
              return (
                <li
                  key={id}
                  className={`text-xs border rounded-md px-3 py-2 flex items-baseline gap-2 ${
                    done
                      ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]"
                      : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg-muted)]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={done}
                    onChange={() => onToggleFollowUp(id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em]">
                      {b.entryDate} · offenes Bedenken
                    </p>
                    <p className="text-xs mt-0.5">{b.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {ctx.knownPersons.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-2">
            Bekannte Personen / NUs (werden bevorzugt erkannt)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ctx.knownPersons.slice(0, 12).map((p) => (
              <span
                key={p.name}
                className={`font-mono text-[10px] uppercase tracking-[0.16em] border rounded-full px-2 py-0.5 ${
                  p.source === "subcontractor"
                    ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]"
                    : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] text-[color:var(--color-fg-muted)]"
                }`}
                title={p.source === "subcontractor" ? "NU-Stammdaten" : `${p.occurrences}× in Historie`}
              >
                {p.name}
                {p.funktion ? <span className="opacity-60"> · {p.funktion}</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
