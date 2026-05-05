"use client";

import { useRef, useState, useTransition } from "react";
import type { VorgangDocument } from "@/db/schema";
import {
  classifyVorgangFromDocument,
  deleteVorgangDocument,
  uploadVorgangDocument,
} from "@/app/[locale]/vorgaenge/actions";

function fmtSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function VorgangDocumentsPanel({
  vorgangId,
  documents,
}: {
  vorgangId: string;
  documents: VorgangDocument[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleUpload(file: File) {
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("vorgangId", vorgangId);
        fd.set("file", file);
        await uploadVorgangDocument(fd);
        if (inputRef.current) inputRef.current.value = "";
      } catch (e) {
        setError(e instanceof Error ? e.message : "Upload fehlgeschlagen.");
      }
    });
  }

  function handleClassify() {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("vorgangId", vorgangId);
      await classifyVorgangFromDocument(fd);
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", id);
      await deleteVorgangDocument(fd);
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-5">
        <div className="flex items-center gap-3 flex-wrap">
          <input
            ref={inputRef}
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
            className="text-sm"
          />
          <button
            type="button"
            onClick={handleClassify}
            disabled={isPending || documents.length === 0}
            className="text-xs font-mono uppercase tracking-[0.18em] rounded-full border border-[color:var(--color-border)] px-3 py-1.5 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors disabled:opacity-50"
            title="Auto-Klassifikation auf Basis des ersten Dokuments"
          >
            Klassifikation auslösen
          </button>
        </div>
        {error ? (
          <p className="text-xs text-[color:var(--color-critical)] mt-2">{error}</p>
        ) : null}
        <p className="text-[11px] text-[color:var(--color-fg-muted)] mt-2 leading-relaxed">
          Dateien werden lokal unter <code>storage/</code> abgelegt. PDF, ZIP, Bilder, E-Mails (.eml). Kein S3, keine Cloud (POC).
        </p>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-[color:var(--color-fg-muted)] py-6 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
          Noch keine Dokumente.
        </p>
      ) : (
        <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
          {documents.map((d) => (
            <li
              key={d.id}
              className="py-3 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-[color:var(--color-fg)] truncate">
                  {d.fileName}
                </p>
                <p className="text-xs text-[color:var(--color-fg-muted)]">
                  {fmtSize(d.fileSize)} · {d.mimeType} ·{" "}
                  {d.uploadedAt.toLocaleString("de-DE")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(d.id)}
                disabled={isPending}
                className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors shrink-0"
              >
                Löschen
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
