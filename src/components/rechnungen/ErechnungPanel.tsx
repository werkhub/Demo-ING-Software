import type { Rechnung } from "@/db/schema";

type ParsedExtract = {
  format: string;
  rechnungsnr: string | null;
  rechnungsdatum: string | null;
  rechnungstyp: string | null;
  waehrung: string | null;
  faelligkeit: string | null;
  lieferantName: string | null;
  lieferantUstId: string | null;
  kaeuferName: string | null;
  summePositionenNettoCents: number;
  gesamtNettoCents: number;
  gesamtUstCents: number;
  bruttoSummeCents: number;
  zahlbarSummeCents: number;
  positionen: Array<{
    posNr: string | null;
    bezeichnung: string | null;
    menge: number;
    einheit: string | null;
    einzelpreisCents: number;
    summeNettoCents: number;
  }>;
};

type ValidationDetails = {
  errors: string[];
  warnings: string[];
};

const XML_FORMAT_LABEL: Record<string, string> = {
  xrechnung_ubl: "XRechnung 3.0 (UBL)",
  xrechnung_cii: "XRechnung 3.0 (CII)",
  zugferd: "ZUGFeRD / Factur-X",
  ubl_unspezifisch: "UBL-Rechnung",
  cii_unspezifisch: "CII-Rechnung",
  unbekannt: "Unbekanntes XML-Format",
};

const STATUS_TONE: Record<string, string> = {
  valid:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  warnings:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  invalid:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  nicht_validiert:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

const STATUS_LABEL: Record<string, string> = {
  valid: "Valide",
  warnings: "Warnungen",
  invalid: "Ungültig",
  nicht_validiert: "Nicht validiert",
};

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

export function ErechnungPanel({
  rechnung,
  extracted,
  validation,
}: {
  rechnung: Rechnung;
  extracted: ParsedExtract | null;
  validation: ValidationDetails | null;
}) {
  if (!rechnung.xmlFormat) {
    return (
      <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Diese Rechnung wurde nicht aus einer E-Rechnung-XML importiert.
        </p>
        <p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">
          Für XML-Import:{" "}
          <a
            href="/eingangsrechnungen/upload"
            className="underline hover:text-[color:var(--color-accent)]"
          >
            E-Rechnung hochladen
          </a>
        </p>
      </div>
    );
  }

  const status = rechnung.xmlValidationStatus ?? "nicht_validiert";

  return (
    <div className="space-y-8">
      {/* Header mit Format + Status */}
      <div className="flex flex-wrap items-center gap-3 border-b border-[color:var(--color-border)] pb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          Format
        </span>
        <span className="font-medium">
          {XML_FORMAT_LABEL[rechnung.xmlFormat] ?? rechnung.xmlFormat}
        </span>
        <span
          className={`ml-3 inline-flex rounded-full border px-3 py-0.5 font-mono text-[10px] uppercase tracking-wider ${STATUS_TONE[status]}`}
        >
          {STATUS_LABEL[status] ?? status}
        </span>
        {rechnung.xmlFilename ? (
          <span className="ml-auto font-mono text-[10px] text-[color:var(--color-fg-muted)]">
            {rechnung.xmlFilename}
          </span>
        ) : null}
      </div>

      {/* Validation Errors/Warnings */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) ? (
        <section className="space-y-3">
          {validation.errors.length > 0 ? (
            <div className="rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-critical)] mb-2">
                Fehler ({validation.errors.length})
              </p>
              <ul className="text-sm text-[color:var(--color-critical)] space-y-1 list-disc pl-5">
                {validation.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {validation.warnings.length > 0 ? (
            <div className="rounded-md border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] px-4 py-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-warning)] mb-2">
                Warnungen ({validation.warnings.length})
              </p>
              <ul className="text-sm text-[color:var(--color-warning)] space-y-1 list-disc pl-5">
                {validation.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Extracted BT-Felder */}
      {extracted ? (
        <section>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-3">
            Geparste Pflichtfelder (EN 16931)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4 text-sm border border-[color:var(--color-border)] rounded-md p-5 bg-[color:var(--color-bg-subtle)]">
            <Field label="BT-1 Rechnungsnr." value={extracted.rechnungsnr} />
            <Field label="BT-2 Rechnungsdatum" value={extracted.rechnungsdatum} />
            <Field label="BT-3 Typ-Code" value={extracted.rechnungstyp} />
            <Field label="BT-5 Währung" value={extracted.waehrung} />
            <Field label="BT-9 Fälligkeit" value={extracted.faelligkeit} />
            <Field
              label="BG-25 Lieferant"
              value={extracted.lieferantName}
              hint={extracted.lieferantUstId ?? undefined}
            />
            <Field label="BG-26 Käufer" value={extracted.kaeuferName} />
            <Field
              label="BT-106 Σ Positionen netto"
              value={fmtCurrency(extracted.summePositionenNettoCents)}
            />
            <Field
              label="BT-109 Gesamt netto"
              value={fmtCurrency(extracted.gesamtNettoCents)}
            />
            <Field
              label="BT-110 USt"
              value={fmtCurrency(extracted.gesamtUstCents)}
            />
            <Field
              label="BT-112 Brutto"
              value={fmtCurrency(extracted.bruttoSummeCents)}
              tone="accent"
            />
            <Field
              label="BT-115 Zahlbar"
              value={fmtCurrency(extracted.zahlbarSummeCents)}
            />
          </div>
        </section>
      ) : null}

      {/* Positionen aus XML */}
      {extracted && extracted.positionen.length > 0 ? (
        <section>
          <h3 className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-3">
            XML-Positionen ({extracted.positionen.length})
          </h3>
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">Pos</th>
                  <th className="px-3 py-3 text-left">Bezeichnung</th>
                  <th className="px-3 py-3 text-right">Menge</th>
                  <th className="px-3 py-3 text-left">Einheit</th>
                  <th className="px-3 py-3 text-right">EP</th>
                  <th className="px-3 py-3 text-right">Σ Netto</th>
                </tr>
              </thead>
              <tbody>
                {extracted.positionen.map((p, i) => (
                  <tr
                    key={i}
                    className="border-t border-[color:var(--color-border)]"
                  >
                    <td className="px-3 py-2.5 font-mono text-xs">
                      {p.posNr ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 max-w-[36ch] truncate">
                      {p.bezeichnung ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {p.menge}
                    </td>
                    <td className="px-3 py-2.5 text-xs">{p.einheit ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {fmtCurrency(p.einzelpreisCents)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold">
                      {fmtCurrency(p.summeNettoCents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function Field({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string | null;
  hint?: string;
  tone?: "accent";
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p
        className={`mt-1 ${
          tone === "accent"
            ? "text-[color:var(--color-accent)] font-semibold"
            : ""
        } ${value ? "" : "text-[color:var(--color-fg-muted)] opacity-60"}`}
      >
        {value ?? "—"}
      </p>
      {hint ? (
        <p className="mt-0.5 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
