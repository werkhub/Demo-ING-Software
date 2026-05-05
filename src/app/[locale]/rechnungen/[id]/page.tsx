import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import {
  getProjectById,
  getRechnungAnomalien,
  getRechnungById,
  getRechnungPositionen,
} from "@/db/queries";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import {
  deleteRechnung,
  escalateRechnungToVorgang,
  registerBauabzugAbfuehrung,
  updateRechnungStatus,
} from "../actions";
import type { Rechnung, RechnungStatus } from "@/db/schema";
import {
  BAUABZUG_PERCENT,
  computeAbzug,
  needsAbzug,
} from "@/lib/steuer/bauabzug";
import { RechnungOriginalViewer } from "@/components/rechnungen/RechnungOriginalViewer";
import { RechnungStrukturViewer } from "@/components/rechnungen/RechnungStrukturViewer";
import { RechnungAnomaliePanel } from "@/components/rechnungen/RechnungAnomaliePanel";
import { ErechnungPanel } from "@/components/rechnungen/ErechnungPanel";
import { TabNav, resolveTabKey, type TabSpec } from "@/components/ui/tab-nav";

export const dynamic = "force-dynamic";

const TAB_KEYS = ["original", "struktur", "erechnung", "anomalien", "vorgang"] as const;
type TabKey = (typeof TAB_KEYS)[number];

const TAB_LABEL: Record<TabKey, string> = {
  original: "Original",
  struktur: "Strukturierte Daten",
  erechnung: "E-Rechnung",
  anomalien: "Anomalien",
  vorgang: "Verknüpfung Vorgang",
};

const STATUS_LABEL: Record<RechnungStatus, string> = {
  eingegangen: "Eingegangen",
  geprueft: "Geprüft",
  freigegeben: "Freigegeben",
  abgelehnt: "Abgelehnt",
};

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

export default async function RechnungDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const activeTab = resolveTabKey<TabKey>(sp.tab, TAB_KEYS, "original");

  const rechnung = await getRechnungById(id);
  if (!rechnung) notFound();

  const [positions, anomalien, project, linkedVorgaenge, nuRow] = await Promise.all([
    getRechnungPositionen(id),
    getRechnungAnomalien(id),
    rechnung.projectId ? getProjectById(rechnung.projectId) : Promise.resolve(null),
    db
      .select({
        vorgangId: schema.vorgangLinks.vorgangId,
        title: schema.vorgaenge.title,
      })
      .from(schema.vorgangLinks)
      .innerJoin(
        schema.vorgaenge,
        eq(schema.vorgangLinks.vorgangId, schema.vorgaenge.id)
      )
      .where(eq(schema.vorgangLinks.targetId, id)),
    rechnung.subcontractorId
      ? db
          .select()
          .from(schema.subcontractors)
          .where(eq(schema.subcontractors.id, rechnung.subcontractorId))
          .limit(1)
          .then((r) => r[0] ?? null)
      : Promise.resolve(null),
  ]);

  const bruttoCents = Math.round((rechnung.totalGross ?? 0) * 100);
  const bauabzugCheck = nuRow && bruttoCents > 0
    ? computeAbzug({
        bruttoCents,
        needs: needsAbzug(nuRow, rechnung.invoiceDate ?? new Date().toISOString().slice(0, 10)),
      })
    : null;

  // E-Rechnung-Daten aus dem extrahierten JSON parsen (best-effort)
  const xmlExtracted: ParsedExtract | null = (() => {
    if (!rechnung.xmlExtractedJson) return null;
    try {
      return JSON.parse(rechnung.xmlExtractedJson) as ParsedExtract;
    } catch {
      return null;
    }
  })();
  const xmlValidationDetails: ValidationDetails | null = (() => {
    if (!rechnung.xmlValidationErrorsJson) return null;
    try {
      return JSON.parse(rechnung.xmlValidationErrorsJson) as ValidationDetails;
    } catch {
      return null;
    }
  })();

  const counts: Partial<Record<TabKey, number>> = {
    struktur: positions.length,
    erechnung: rechnung.xmlFormat
      ? (xmlValidationDetails?.errors.length ?? 0) +
        (xmlValidationDetails?.warnings.length ?? 0)
      : 0,
    anomalien: anomalien.length,
    vorgang: linkedVorgaenge.length,
  };

  return (
    <Container>
      <section className="pt-14 pb-6">
        <Link
          href="/rechnungen"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Alle Rechnungen
        </Link>

        <div className="flex items-start justify-between gap-6 flex-wrap">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
              {rechnung.id} · {rechnung.invoiceDate ? formatDateShort(rechnung.invoiceDate) : "ohne Datum"}
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
              {rechnung.supplierName}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              {project ? (
                <Link href={`/projekte/${project.id}`} className="hover:text-[color:var(--color-accent)] transition-colors">
                  {project.identifier} · {project.name}
                </Link>
              ) : (
                "Ohne Projekt"
              )}
              {rechnung.totalGross !== null ? <> · Brutto {fmtMoney(rechnung.totalGross)}</> : null}
              {rechnung.dueDate ? <> · Fällig {formatDateShort(rechnung.dueDate)}</> : null}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <form action={updateRechnungStatus} className="flex items-center gap-2">
              <input type="hidden" name="id" value={rechnung.id} />
              <select
                name="status"
                defaultValue={rechnung.status}
                className="text-xs bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1.5"
              >
                {(Object.keys(STATUS_LABEL) as RechnungStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="text-xs font-mono uppercase tracking-[0.18em] rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-3 py-1.5 transition-colors"
              >
                Setzen
              </button>
            </form>
          </div>
        </div>

        <div className="mt-5 grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3">
          <Stat label="Anomalie-Score" value={String(rechnung.anomalyScore)} />
          <Stat label="Befunde" value={String(rechnung.anomalyCount)} />
          <Stat label="Positionen" value={String(positions.length)} />
        </div>
      </section>

      {/* Bauabzug § 48 EStG */}
      {nuRow ? (
        <section className="pb-6">
          <BauabzugPanel
            rechnung={rechnung}
            nuRow={nuRow}
            check={bauabzugCheck}
          />
        </section>
      ) : null}

      <TabNav
        tabs={
          TAB_KEYS.map((key) => ({
            key,
            label: TAB_LABEL[key],
            count: counts[key],
          })) as TabSpec<TabKey>[]
        }
        active={activeTab}
        baseHref={`/rechnungen/${id}`}
        defaultKey="original"
      />

      <section className="pt-8 pb-16">
        {activeTab === "original" ? (
          <RechnungOriginalViewer
            rechnungId={rechnung.id}
            fileName={rechnung.sourceFilePath?.split("/").pop() ?? null}
          />
        ) : null}

        {activeTab === "struktur" ? (
          <RechnungStrukturViewer rechnungId={rechnung.id} positions={positions} />
        ) : null}

        {activeTab === "erechnung" ? (
          <ErechnungPanel
            rechnung={rechnung}
            extracted={xmlExtracted}
            validation={xmlValidationDetails}
          />
        ) : null}

        {activeTab === "anomalien" ? (
          <RechnungAnomaliePanel anomalien={anomalien} />
        ) : null}

        {activeTab === "vorgang" ? (
          <VorgangLinks
            rechnung={rechnung}
            linkedVorgaenge={linkedVorgaenge}
          />
        ) : null}
      </section>

      <section className="pb-16 border-t border-[color:var(--color-border)] pt-8">
        <details>
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors">
            Gefahrenzone — Rechnung löschen
          </summary>
          <form action={deleteRechnung} className="mt-4">
            <input type="hidden" name="id" value={rechnung.id} />
            <button
              type="submit"
              className="text-sm rounded-full border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] px-4 py-2 hover:bg-[color:var(--color-critical)] hover:text-white transition-colors"
            >
              Rechnung unwiderruflich löschen
            </button>
          </form>
        </details>
      </section>
    </Container>
  );
}

function VorgangLinks({
  rechnung,
  linkedVorgaenge,
}: {
  rechnung: Rechnung;
  linkedVorgaenge: { vorgangId: string; title: string }[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Verknüpfte Vorgänge · {linkedVorgaenge.length}
        </p>
        {linkedVorgaenge.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] italic">
            Noch kein Vorgang mit dieser Rechnung verknüpft.
          </p>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {linkedVorgaenge.map((l) => (
              <li key={l.vorgangId} className="py-2.5">
                <Link
                  href={`/vorgaenge/${l.vorgangId}`}
                  className="text-sm hover:text-[color:var(--color-accent)] transition-colors"
                >
                  {l.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-md border border-dashed border-[color:var(--color-border)] bg-[color:var(--color-bg)] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)] mb-2">
          Anomalie an Vorgang übergeben
        </p>
        <p className="text-sm text-[color:var(--color-fg-muted)] mb-4 leading-relaxed">
          Erzeugt einen Vorgang Kategorie „Vertragspflicht" und verknüpft die Rechnung
          als Eingangsdokument. Sinnvoll bei Anomalie-Score ≥ 40, fehlender LV-Position
          oder offenen Mathematik-Fehlern.
        </p>
        <form action={escalateRechnungToVorgang}>
          <input type="hidden" name="id" value={rechnung.id} />
          <button
            type="submit"
            className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-5 py-2.5 transition-colors"
          >
            Vorgang anlegen aus Rechnung →
          </button>
        </form>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[color:var(--color-bg)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--color-fg)]">
        {value}
      </p>
    </div>
  );
}

function BauabzugPanel({
  rechnung,
  nuRow,
  check,
}: {
  rechnung: Rechnung;
  nuRow: { id: string; name: string; freistellungsbescheinigungNr: string | null; freistellungsbescheinigungGueltigBis: string | null };
  check: ReturnType<typeof computeAbzug> | null;
}) {
  const stored = rechnung.bauabzugEinbehaltCents;
  const abgefuehrtAm = rechnung.bauabzugAnFinanzamtAbgefuehrtAm;
  const tone =
    stored && stored > 0 && !abgefuehrtAm
      ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)]"
      : "border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)]";

  return (
    <div className={`rounded-md border p-4 ${tone}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        § 48 EStG · Bauabzugsteuer ({BAUABZUG_PERCENT} %)
      </p>
      <div className="mt-2 grid gap-2 md:grid-cols-2">
        <div>
          <p className="text-xs text-[color:var(--color-fg-muted)]">Nachunternehmer</p>
          <p className="text-sm">
            <Link
              href={`/nu/${nuRow.id}`}
              className="hover:text-[color:var(--color-accent)] transition-colors"
            >
              {nuRow.name}
            </Link>
          </p>
          <p className="text-xs text-[color:var(--color-fg-muted)] font-mono mt-1">
            {nuRow.freistellungsbescheinigungNr
              ? `Freistellung ${nuRow.freistellungsbescheinigungNr} · gültig bis ${nuRow.freistellungsbescheinigungGueltigBis ?? "—"}`
              : "Keine Freistellungsbescheinigung hinterlegt"}
          </p>
        </div>
        <div>
          <p className="text-xs text-[color:var(--color-fg-muted)]">Status</p>
          {stored && stored > 0 ? (
            <>
              <p className="text-sm font-mono">
                Einbehalt: {fmtMoney(stored / 100)}
              </p>
              <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                {abgefuehrtAm
                  ? `Abgeführt am ${formatDateShort(abgefuehrtAm)}`
                  : "Noch nicht ans Finanzamt abgeführt"}
              </p>
            </>
          ) : check && check.applies ? (
            <>
              <p className="text-sm font-mono">
                Vorschlag: {fmtMoney(check.einbehaltCents / 100)} einbehalten
              </p>
              <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                {check.reason}
              </p>
            </>
          ) : (
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {check?.reason ?? "Kein Bauabzug — keine Daten"}
            </p>
          )}
        </div>
      </div>
      {stored && stored > 0 && !abgefuehrtAm ? (
        <form
          action={registerBauabzugAbfuehrung}
          className="mt-4 flex items-end gap-3 flex-wrap"
        >
          <input type="hidden" name="id" value={rechnung.id} />
          <div>
            <label
              htmlFor="abgefuehrtAm"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              An Finanzamt abgeführt am
            </label>
            <input
              id="abgefuehrtAm"
              name="abgefuehrtAm"
              type="date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1.5 text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Abführung erfassen
          </button>
        </form>
      ) : null}
    </div>
  );
}
