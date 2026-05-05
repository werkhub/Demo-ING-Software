import { bestaetigePlanVersand } from "../actions";

async function bestaetigeAction(formData: FormData) {
  "use server";
  await bestaetigePlanVersand(null, formData);
}

export function BestaetigenButton({ id }: { id: string }) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={bestaetigeAction} className="inline-flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input
        type="date"
        name="eingangBestaetigtAm"
        defaultValue={today}
        className="rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-1 py-0.5 text-[10px] font-mono"
      />
      <button
        type="submit"
        className="rounded-full border border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] px-2 py-0.5 text-[10px] uppercase tracking-wider hover:bg-[color:var(--color-success)] hover:text-white transition-colors"
      >
        Eingang ✓
      </button>
    </form>
  );
}
