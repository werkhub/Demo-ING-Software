import { deactivateMitarbeiter } from "../../../actions";

async function deactivateAction(formData: FormData) {
  "use server";
  await deactivateMitarbeiter(null, formData);
}

export function DeactivateButton({ id }: { id: string }) {
  return (
    <form action={deactivateAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] px-4 py-1.5 text-xs text-[color:var(--color-warning)] hover:bg-[color:var(--color-warning)] hover:text-white transition-colors"
      >
        Mitarbeiter deaktivieren
      </button>
    </form>
  );
}
