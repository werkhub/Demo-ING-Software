import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { createSzenarioRedirect } from "../actions";

export const dynamic = "force-dynamic";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";
const inputClass =
  "mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

type SearchParams = Promise<{ error?: string }>;

export default async function NewLiquiditaetPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Finanzen · Liquidität · Neu
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Neues Szenario
        </h1>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}

      <form action={createSzenarioRedirect} className="space-y-5 max-w-2xl">
        <div>
          <label className={labelClass}>Name *</label>
          <input
            name="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="z.B. Q1 2024 - konservativ"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Basisdatum *</label>
            <input
              name="basisdatum"
              type="date"
              required
              defaultValue={today}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Horizont in Tagen</label>
            <input
              name="horizontTage"
              type="number"
              min="7"
              max="365"
              defaultValue="90"
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Kontostand zum Basisdatum € *</label>
          <input
            name="kontostandStartCents"
            type="number"
            step="0.01"
            required
            placeholder="z.B. 50000.00"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Annahme Zahlungsfrist AN (Tage)</label>
            <input
              name="annahmeFristTageAn"
              type="number"
              min="0"
              max="120"
              defaultValue="14"
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
              Wenn AR kein dueDate hat: invoiceDate + diese Tage
            </p>
          </div>
          <div>
            <label className={labelClass}>Annahme Zahlungsfrist NU (Tage)</label>
            <input
              name="annahmeFristTageNu"
              type="number"
              min="0"
              max="120"
              defaultValue="30"
              className={inputClass}
            />
            <p className="mt-1 text-[10px] text-[color:var(--color-fg-muted)]">
              NU-Rechnung ohne zahlungsdatum: rechnungsdatum + diese Tage
            </p>
          </div>
        </div>

        <div>
          <label className={labelClass}>Notizen</label>
          <textarea name="notes" rows={2} maxLength={500} className={inputClass} />
        </div>

        <div className="flex items-center gap-3 pt-3">
          <button
            type="submit"
            className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Szenario erzeugen
          </button>
          <Link
            href="/finanzen/liquiditaet"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </Container>
  );
}
