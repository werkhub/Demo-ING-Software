import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { getCurrentWorkspace } from "@/lib/session";
import { createDatevExportRedirect } from "../actions";

export const dynamic = "force-dynamic";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";
const inputClass =
  "mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

type SearchParams = Promise<{ error?: string }>;

function defaultMonthRange(): { von: string; bis: string } {
  const now = new Date();
  // Vormonat als Default
  const von = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const bis = new Date(now.getFullYear(), now.getMonth(), 0);
  return {
    von: von.toISOString().slice(0, 10),
    bis: bis.toISOString().slice(0, 10),
  };
}

export default async function NewDatevExportPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const workspace = await getCurrentWorkspace();
  const range = defaultMonthRange();
  const defaultRahmen = workspace.datevKontenrahmen ?? "skr03";

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Finanzen · DATEV · Neuer Export
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Neuer DATEV-Export
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Buchungsstapel im DATEV-EXTF-Format. Wird auf Disk gespeichert und
          steht zum Download bereit. Default-Zeitraum ist der Vormonat.
        </p>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}

      <form
        action={createDatevExportRedirect}
        className="space-y-5 max-w-2xl"
      >
        <div>
          <label className={labelClass}>Art *</label>
          <select name="art" required className={inputClass} defaultValue="verkauf">
            <option value="verkauf">Verkauf — Ausgangsrechnungen</option>
            <option value="lohn">Lohn — Stunden monatlich aggregiert</option>
            <option value="einkauf_nu" disabled>
              NU-Einkauf (kommt mit Modul 3.6)
            </option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Zeitraum von *</label>
            <input
              name="zeitraumVon"
              type="date"
              required
              defaultValue={range.von}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Zeitraum bis *</label>
            <input
              name="zeitraumBis"
              type="date"
              required
              defaultValue={range.bis}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>Kontenrahmen *</label>
          <select
            name="kontenrahmen"
            required
            defaultValue={defaultRahmen}
            className={inputClass}
          >
            <option value="skr03">SKR 03 — Standard-Buchungskontenrahmen</option>
            <option value="skr04">SKR 04 — IKR-naher Kontenrahmen</option>
          </select>
        </div>

        <div>
          <label className={labelClass}>Notizen</label>
          <textarea
            name="notes"
            rows={2}
            maxLength={500}
            placeholder="z.B. Lohn Januar 2024 - vor Uebergabe an Steuerberater geprueft."
            className={inputClass}
          />
        </div>

        <div className="rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-4 py-3 text-xs text-[color:var(--color-fg-muted)] space-y-1">
          <p>
            <strong>Berater-Nr.:</strong>{" "}
            {workspace.datevBeraterNr ?? "— nicht gesetzt —"}
          </p>
          <p>
            <strong>Mandant-Nr.:</strong>{" "}
            {workspace.datevMandantNr ?? "— nicht gesetzt —"}
          </p>
          <p>
            <strong>Konten-Override aktiv:</strong>{" "}
            {workspace.datevKontenMappingJson ? "Ja" : "Nein (Default)"}
          </p>
        </div>

        <div className="flex items-center gap-3 pt-3">
          <button
            type="submit"
            className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Export erstellen
          </button>
          <Link
            href="/finanzen/datev"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </Container>
  );
}
