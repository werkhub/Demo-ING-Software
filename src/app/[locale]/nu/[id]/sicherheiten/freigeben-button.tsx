import { freigebenSicherheit } from "../auftraege/actions";

async function freigeben(formData: FormData) {
  "use server";
  await freigebenSicherheit(null, formData);
}

export function FreigebenButton({
  id,
  maxCents,
}: {
  id: string;
  maxCents: number;
}) {
  const maxEur = (maxCents / 100).toFixed(2);
  return (
    <form action={freigeben} className="inline-flex items-center gap-1">
      <input type="hidden" name="id" value={id} />
      <input
        type="number"
        name="freigabeBetragCents"
        step="0.01"
        min="0"
        max={maxEur}
        defaultValue={maxEur}
        required
        className="w-20 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-2 py-1 text-xs font-mono"
      />
      <button
        type="submit"
        className="rounded-full bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border border-[color:var(--color-success-border)] px-3 py-1 text-[10px] uppercase tracking-wider hover:bg-[color:var(--color-success)] hover:text-white transition-colors"
      >
        Freigeben
      </button>
    </form>
  );
}
