import { redirect } from "next/navigation";
import { createHoaiSchlussrechnung } from "./ar-actions";

async function action(formData: FormData) {
  "use server";
  const projektId = String(formData.get("projektId") ?? "");
  const result = await createHoaiSchlussrechnung(null, formData);
  if (result.ok) {
    redirect(`/projekte/${projektId}/ausgangsrechnungen/${result.data.id}`);
  }
  // Fehler: zurück auf Liste mit Query-Param (einfache Variante)
  const msg =
    result.formError ??
    (result.fieldErrors
      ? Object.values(result.fieldErrors).flat().join("; ")
      : "HOAI-Schlussrechnung konnte nicht erzeugt werden.");
  redirect(
    `/projekte/${projektId}/ausgangsrechnungen?error=${encodeURIComponent(msg)}`
  );
}

/**
 * Button zum Erzeugen einer HOAI-Schlussrechnung.
 *
 * Nur sichtbar wenn:
 *   - Workspace ist Ingenieurbüro
 *   - Projekt hat HOAI-Konfig (mind. Leistungsbild + Zone + Kosten + LPs)
 */
export function HoaiSchlussButton({
  projektId,
  disabledReason,
}: {
  projektId: string;
  disabledReason: string | null;
}) {
  if (disabledReason) {
    return (
      <span
        title={disabledReason}
        className="inline-flex items-center gap-2 rounded-full border border-dashed border-[color:var(--color-border)] px-4 py-2 text-sm text-[color:var(--color-fg-muted)] cursor-not-allowed"
      >
        HOAI-Schluss ◊
      </span>
    );
  }
  return (
    <form action={action} className="inline-flex">
      <input type="hidden" name="projektId" value={projektId} />
      <button
        type="submit"
        className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] px-4 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
        title="Erzeugt Entwurf einer HOAI-Schlussrechnung mit LP-Aufschlüsselung"
      >
        HOAI-Schluss ◊
      </button>
    </form>
  );
}
