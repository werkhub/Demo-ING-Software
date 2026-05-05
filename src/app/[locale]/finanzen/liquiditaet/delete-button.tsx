import { deleteSzenario } from "./actions";

async function deleteAction(formData: FormData) {
  "use server";
  await deleteSzenario(null, formData);
}

export function DeleteSzenarioButton({ id }: { id: string }) {
  return (
    <form action={deleteAction}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] hover:border-[color:var(--color-critical-border)] transition-colors"
      >
        Löschen
      </button>
    </form>
  );
}
