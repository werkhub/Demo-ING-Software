"use client";

import { useRef, useState, useTransition } from "react";
import {
  classifyEingang,
  VORGANG_CATEGORY_LABEL,
} from "@/lib/vorgang";
import { createVorgangFromUpload } from "@/app/[locale]/vorgaenge/new/actions";

type ProjectOption = { id: string; identifier: string; name: string };

export function VorgangCreateDropzone({
  projects,
}: {
  projects: ProjectOption[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Vorschau-Klassifikation rein client-seitig (auf Basis des Dateinamens, kein OCR)
  const previewClassification = file
    ? classifyEingang({ fileName: file.name })
    : null;

  function handleFileSelected(f: File) {
    setFile(f);
    setError(null);
    if (!title) {
      setTitle(f.name.replace(/\.[^.]+$/, "").slice(0, 200));
    }
  }

  function submit() {
    if (!file) {
      setError("Bitte zuerst eine Datei auswählen oder ablegen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("file", file);
        if (title) fd.set("title", title);
        if (projectId) fd.set("projectId", projectId);
        await createVorgangFromUpload(fd);
      } catch (e) {
        // redirect wirft NEXT_REDIRECT — das ignorieren wir, alle anderen Fehler zeigen
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) return;
        setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) handleFileSelected(f);
        }}
        className={`block rounded-md border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]"
            : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] hover:border-[color:var(--color-accent)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelected(f);
          }}
        />
        {file ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-1">
              Bereit
            </p>
            <p className="text-base font-medium text-[color:var(--color-fg)] break-all">
              {file.name}
            </p>
            <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
              {Math.round(file.size / 1024)} KB · {file.type || "unbekannter Typ"}
            </p>
            <p className="text-xs text-[color:var(--color-fg-muted)] mt-3 italic">
              Andere Datei wählen? Klick oder ziehen.
            </p>
          </div>
        ) : (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-2">
              Eingangsdokument hier ablegen
            </p>
            <p className="text-base text-[color:var(--color-fg)]">
              Drag-and-Drop oder klicken zum Auswählen
            </p>
            <p className="text-xs text-[color:var(--color-fg-muted)] mt-2">
              PDF, Bilder, E-Mails (.eml), Office-Dokumente.
            </p>
          </div>
        )}
      </label>

      {previewClassification ? (
        <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            Auto-Klassifikation (Vorschau)
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg)]">
            Kategorie:{" "}
            <span className="font-medium">
              {VORGANG_CATEGORY_LABEL[previewClassification.category]}
            </span>
            {" · "}
            <span className="font-mono text-xs text-[color:var(--color-fg-muted)]">
              {Math.round(previewClassification.confidence * 100)} % Confidence
            </span>
          </p>
          {previewClassification.matchedTerms.length > 0 ? (
            <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
              Treffer: {previewClassification.matchedTerms.join(", ")}
            </p>
          ) : (
            <p className="text-xs text-[color:var(--color-fg-muted)] mt-1 italic">
              Keine Schlagwort-Treffer — Kategorie bleibt zunächst „Sonstiges".
            </p>
          )}
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
            Titel (optional, sonst Dateiname)
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 focus:outline-none focus:border-[color:var(--color-accent)]"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
            Projekt (optional)
          </span>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 focus:outline-none focus:border-[color:var(--color-accent)]"
          >
            <option value="">— ohne Projektzuordnung —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.identifier} · {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error ? (
        <p className="text-sm text-[color:var(--color-critical)]">{error}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={!file || isPending}
          className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-5 py-2.5 transition-colors disabled:opacity-50"
        >
          {isPending ? "Lege an…" : "Vorgang anlegen"}
        </button>
        <p className="text-[11px] text-[color:var(--color-fg-muted)]">
          Status startet immer auf „Offen". Du kannst Kategorie und Frist nach der Anlage anpassen.
        </p>
      </div>
    </div>
  );
}
