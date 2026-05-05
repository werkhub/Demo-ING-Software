"use client";

import { useState, useTransition } from "react";
import type { VorgangDraft } from "@/db/schema";
import {
  saveVorgangDraft,
  sendVorgangDraft,
  discardVorgangDraft,
} from "@/app/[locale]/vorgaenge/actions";
import type { ActionResult } from "@/lib/action-result";

export function VorgangEntwurfEditor({
  vorgangId,
  draft,
}: {
  vorgangId: string;
  draft: VorgangDraft | null;
}) {
  const [recipientEmail, setRecipientEmail] = useState(draft?.recipientEmail ?? "");
  const [subject, setSubject] = useState(draft?.subject ?? "");
  const [body, setBody] = useState(draft?.bodyMarkdown ?? "");
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const isSent = draft?.status === "gesendet";
  const isDiscarded = draft?.status === "verworfen";
  const readOnly = isSent || isDiscarded;

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("vorgangId", vorgangId);
      fd.set("recipientEmail", recipientEmail);
      fd.set("subject", subject);
      fd.set("bodyMarkdown", body);
      const res = (await saveVorgangDraft(null, fd)) as ActionResult<{ id: string }>;
      if (!res.ok) {
        setError(res.formError ?? "Speichern fehlgeschlagen.");
      }
    });
  }

  async function handleSend() {
    if (!draft) return;
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", draft.id);
      try {
        await sendVorgangDraft(fd);
        setShowConfirm(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Versand fehlgeschlagen.");
      }
    });
  }

  async function handleDiscard() {
    if (!draft) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("id", draft.id);
      await discardVorgangDraft(fd);
    });
  }

  return (
    <div className="space-y-4">
      {isSent ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-success)] border border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] rounded-sm px-3 py-2 inline-block">
          Versendet · {draft?.sentAt?.toLocaleString("de-DE")}
        </p>
      ) : isDiscarded ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] rounded-sm px-3 py-2 inline-block">
          Verworfen
        </p>
      ) : null}

      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
          Empfänger E-Mail
        </label>
        <input
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
          placeholder="empfaenger@beispiel.de"
          disabled={readOnly}
          className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 focus:outline-none focus:border-[color:var(--color-accent)] disabled:opacity-60"
        />
      </div>

      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
          Betreff
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          maxLength={300}
          disabled={readOnly}
          className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 focus:outline-none focus:border-[color:var(--color-accent)] disabled:opacity-60"
        />
      </div>

      <div>
        <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
          Nachricht (Markdown möglich)
        </label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={14}
          maxLength={50_000}
          disabled={readOnly}
          className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 font-mono leading-relaxed focus:outline-none focus:border-[color:var(--color-accent)] disabled:opacity-60"
        />
      </div>

      {error ? (
        <p className="text-xs text-[color:var(--color-critical)]">{error}</p>
      ) : null}

      {!readOnly ? (
        <div className="flex items-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="text-sm rounded-full border border-[color:var(--color-border)] px-4 py-2 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors disabled:opacity-50"
          >
            {isPending ? "Speichert…" : "Entwurf speichern"}
          </button>
          {draft ? (
            <>
              <a
                href={`/vorgaenge/${vorgangId}/draft/${draft.id}/eml`}
                download
                className="text-sm rounded-full border border-[color:var(--color-border)] px-4 py-2 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1.5"
                title="Als .eml-Datei herunterladen — in Outlook/Thunderbird/Apple Mail öffnen und versenden"
              >
                ↓ .eml
              </a>
              <a
                href={`mailto:${encodeURIComponent(recipientEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}
                className="text-sm rounded-full border border-[color:var(--color-border)] px-4 py-2 hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1.5"
                title="In Standard-Mailprogramm öffnen (mailto: — bei kurzen Texten)"
              >
                ↗ in Mail-App
              </a>
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                disabled={isPending || !recipientEmail || !subject}
                className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-4 py-2 transition-colors disabled:opacity-50"
                title="Markiert den Entwurf als versendet und schreibt einen Audit-Eintrag — kein echter SMTP-Versand"
              >
                Als versendet markieren
              </button>
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isPending}
                className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
              >
                Verwerfen
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      {showConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="max-w-md w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md p-6 shadow-lg">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
              Als versendet markieren
            </p>
            <p className="mt-3 text-sm text-[color:var(--color-fg)]">
              Bestätige den manuellen Versand des Entwurfs an{" "}
              <span className="font-mono">{recipientEmail || "—"}</span>.
            </p>
            <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
              LexBau verschickt nicht selbst — der eigentliche Versand erfolgt
              über Dein Mailprogramm (.eml-Download) oder mailto:-Link. Dieser
              Schritt setzt Status auf &bdquo;gesendet&ldquo; und schreibt einen Audit-Eintrag.
            </p>
            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isPending}
                className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-4 py-2 transition-colors disabled:opacity-50"
              >
                {isPending ? "Markiere…" : "Ja, als versendet markieren"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
