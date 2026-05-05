"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { useToast } from "@/components/ui/toast";
import { uploadBautagebuchFoto } from "./actions";

export function FotoUploadForm({ eintragId }: { eintragId: string }) {
  const [state, formAction] = useActionState(uploadBautagebuchFoto, null);
  const formRef = useRef<HTMLFormElement>(null);
  const { push } = useToast();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      push({ tone: "success", title: "Foto hochgeladen" });
      formRef.current?.reset();
    } else if (state.formError) {
      push({ tone: "critical", title: "Upload fehlgeschlagen", body: state.formError });
    }
  }, [state, push]);

  return (
    <form ref={formRef} action={formAction} className="mt-3 flex flex-wrap items-end gap-2">
      <input type="hidden" name="eintragId" value={eintragId} />
      <label className="flex-1 min-w-[180px]">
        <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
          Datei (JPG/PNG/WebP, max 5 MB)
        </span>
        <input
          type="file"
          name="file"
          accept="image/jpeg,image/png,image/webp"
          required
          className="text-xs text-[color:var(--color-fg)] file:mr-3 file:rounded-full file:border file:border-[color:var(--color-border)] file:bg-[color:var(--color-bg-subtle)] file:px-3 file:py-1 file:text-xs file:hover:bg-[color:var(--color-accent-soft)] file:hover:text-[color:var(--color-accent)] file:transition-colors"
        />
      </label>
      <label className="flex-1 min-w-[180px]">
        <span className="block font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
          Bildunterschrift (optional)
        </span>
        <input
          type="text"
          name="caption"
          maxLength={200}
          placeholder="z. B. Schadensbild Westfassade"
          className="w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 py-1 text-sm"
        />
      </label>
      <SubmitBtn />
    </form>
  );
}

function SubmitBtn() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white text-xs px-4 py-1.5 transition-colors disabled:opacity-60"
    >
      {pending ? "Lade hoch..." : "Hochladen"}
    </button>
  );
}
