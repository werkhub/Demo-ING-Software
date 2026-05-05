import { lockWocheRedirect, unlockWoche } from "./actions";

export function LockWocheButton({ jahr, kw }: { jahr: number; kw: number }) {
  return (
    <form action={lockWocheRedirect}>
      <input type="hidden" name="jahr" value={jahr} />
      <input type="hidden" name="kw" value={kw} />
      <button
        type="submit"
        className="rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
      >
        🔒 Woche sperren
      </button>
    </form>
  );
}

async function unlockAction(formData: FormData) {
  "use server";
  await unlockWoche(null, formData);
}

export function UnlockWocheButton({ jahr, kw }: { jahr: number; kw: number }) {
  return (
    <form action={unlockAction}>
      <input type="hidden" name="jahr" value={jahr} />
      <input type="hidden" name="kw" value={kw} />
      <button
        type="submit"
        className="rounded-full border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] px-4 py-1.5 text-xs text-[color:var(--color-warning)] hover:bg-[color:var(--color-warning)] hover:text-white transition-colors"
      >
        🔓 Sperre aufheben
      </button>
    </form>
  );
}
