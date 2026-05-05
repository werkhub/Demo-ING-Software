import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { uploadErechnungXmlRedirect } from "../actions";

export const dynamic = "force-dynamic";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";

type SearchParams = Promise<{ error?: string }>;

export default async function ErechnungUploadPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Eingangsrechnungen · E-Rechnung
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          E-Rechnung importieren
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          XRechnung (UBL/CII) oder ZUGFeRD-Embedded-XML hochladen. Pflicht-
          felder werden geparst, Plausi geprüft und ggf. ein Klärungs-Vorgang
          erzeugt.
        </p>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}

      <section className="mb-6 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-4 py-3 text-xs text-[color:var(--color-fg-muted)] space-y-1">
        <p>
          <strong>Unterstützte Formate:</strong> XRechnung 3.0 UBL, XRechnung CII,
          ZUGFeRD (Comfort, Extended) — eingebettetes XML aus PDF/A-3.
        </p>
        <p>
          <strong>Max. Dateigröße:</strong> 5 MB. Nur die XML-Datei direkt
          hochladen — bei ZUGFeRD-PDFs erst die Datei <code>factur-x.xml</code>{" "}
          oder <code>ZUGFeRD-invoice.xml</code> aus dem PDF extrahieren.
        </p>
      </section>

      <form action={uploadErechnungXmlRedirect} className="space-y-5 max-w-2xl">
        <div>
          <label className={labelClass}>XML-Datei *</label>
          <input
            name="xmlFile"
            type="file"
            accept=".xml,application/xml,text/xml"
            required
            className="mt-2 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] file:mr-3 file:rounded-md file:border-0 file:bg-[color:var(--color-fg)] file:px-3 file:py-1 file:text-xs file:text-[color:var(--color-bg)]"
          />
        </div>

        <div className="flex items-center gap-3 pt-3">
          <button
            type="submit"
            className="rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Importieren
          </button>
          <Link
            href="/rechnungen"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
          >
            Abbrechen
          </Link>
        </div>
      </form>
    </Container>
  );
}
