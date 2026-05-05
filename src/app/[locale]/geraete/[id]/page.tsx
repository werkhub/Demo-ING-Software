import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  DISPO_STATUS_LABEL,
  EIGENTUM_LABEL,
  KATEGORIE_LABEL,
  STATUS_LABEL,
  WARTUNG_ART_LABEL,
  WARTUNG_LEGAL_BASIS,
  WARTUNG_STATE_LABEL,
  wartungState,
} from "@/lib/geraete";
import { formatDateShort } from "@/lib/utils";
import {
  markWartungDurchgefuehrt,
  updateDispositionStatus,
} from "../actions";

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number | null | undefined) =>
  cents === null || cents === undefined
    ? "—"
    : new Intl.NumberFormat("de-DE", {
        style: "currency",
        currency: "EUR",
      }).format(cents / 100);

export default async function GeraetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspaceId = await getCurrentWorkspaceId();

  const [geraet] = await db
    .select()
    .from(schema.geraete)
    .where(
      and(
        eq(schema.geraete.id, id),
        eq(schema.geraete.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!geraet) notFound();

  const [dispositionen, wartungen, projekte] = await Promise.all([
    db
      .select()
      .from(schema.geraeteDisposition)
      .where(eq(schema.geraeteDisposition.geraetId, id))
      .orderBy(desc(schema.geraeteDisposition.vonDatum)),
    db
      .select()
      .from(schema.geraeteWartung)
      .where(eq(schema.geraeteWartung.geraetId, id))
      .orderBy(asc(schema.geraeteWartung.faelligAm)),
    db
      .select({
        id: schema.projects.id,
        identifier: schema.projects.identifier,
        name: schema.projects.name,
      })
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, workspaceId)),
  ]);

  const projektMap = new Map(projekte.map((p) => [p.id, p]));

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {KATEGORIE_LABEL[geraet.kategorie]}
          {geraet.inventarNr ? ` · ${geraet.inventarNr}` : ""}
        </p>
        <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter">
            {geraet.bezeichnung}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/geraete/${id}/disponieren`}
              className="rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              + Disposition
            </Link>
            <Link
              href={`/geraete/${id}/wartung/new`}
              className="rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm hover:bg-[color:var(--color-bg-subtle)] transition-colors"
            >
              + Wartung
            </Link>
            <Link
              href={`/geraete/${id}/edit`}
              className="rounded-full border border-[color:var(--color-border)] px-4 py-2 text-sm hover:bg-[color:var(--color-bg-subtle)] transition-colors"
            >
              Bearbeiten
            </Link>
          </div>
        </div>
        <div className="mt-3">
          <Link
            href="/geraete"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zur Übersicht
          </Link>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] py-8 grid gap-6 md:grid-cols-3">
        <DataField label="Status" value={STATUS_LABEL[geraet.status]} />
        <DataField label="Eigentum" value={EIGENTUM_LABEL[geraet.eigentum]} />
        <DataField
          label="Hersteller / Baujahr"
          value={[geraet.hersteller, geraet.baujahr].filter(Boolean).join(" · ") || "—"}
        />
        <DataField
          label="Kaufdatum"
          value={formatDateShort(geraet.kaufdatum)}
        />
        <DataField
          label="Kaufpreis"
          value={fmtCurrency(geraet.kaufpreisCents)}
        />
        <DataField
          label="Buchwert aktuell"
          value={fmtCurrency(geraet.currentValueCents)}
        />
        {geraet.eigentum !== "eigen" ? (
          <>
            <DataField
              label={`${EIGENTUM_LABEL[geraet.eigentum]}-Partner`}
              value={geraet.mietPartner ?? "—"}
            />
            <DataField
              label="Rückgabe / Mietende"
              value={formatDateShort(geraet.mietBisDatum)}
            />
          </>
        ) : null}
      </section>

      {geraet.notes ? (
        <section className="border-t border-[color:var(--color-border)] pt-6 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-2">
            Notizen
          </p>
          <p className="whitespace-pre-wrap text-sm text-[color:var(--color-fg)]">
            {geraet.notes}
          </p>
        </section>
      ) : null}

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            Wartungs-Historie
          </p>
          <span className="text-xs text-[color:var(--color-fg-muted)]">
            {wartungen.length} Eintr{wartungen.length === 1 ? "ag" : "äge"}
          </span>
        </div>
        {wartungen.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] italic">
            Noch keine Wartungs-Einträge.
          </p>
        ) : (
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">Art</th>
                  <th className="px-3 py-3 text-left">Fällig</th>
                  <th className="px-3 py-3 text-left">Durchgeführt</th>
                  <th className="px-3 py-3 text-left">Prüfer</th>
                  <th className="px-3 py-3 text-right">Kosten</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {wartungen.map((w) => {
                  const state = wartungState(
                    w.faelligAm,
                    w.durchgefuehrtAm,
                    w.art
                  );
                  return (
                    <tr
                      key={w.id}
                      className="border-t border-[color:var(--color-border)]"
                    >
                      <td className="px-3 py-2.5">
                        {WARTUNG_ART_LABEL[w.art]}
                        <p className="font-mono text-[10px] text-[color:var(--color-fg-muted)] mt-0.5">
                          {WARTUNG_LEGAL_BASIS[w.art]}
                        </p>
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {formatDateShort(w.faelligAm)}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {formatDateShort(w.durchgefuehrtAm)}
                      </td>
                      <td className="px-3 py-2.5 text-xs">
                        {w.durchgefuehrtVon ?? "—"}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">
                        {fmtCurrency(w.kostenCents)}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={
                            "font-mono text-[10px] uppercase tracking-[0.12em] " +
                            (state === "overdue"
                              ? "text-[color:var(--color-critical)]"
                              : state === "expiring"
                                ? "text-[color:var(--color-warning)]"
                                : state === "done"
                                  ? "text-[color:var(--color-success)]"
                                  : "text-[color:var(--color-fg-muted)]")
                          }
                        >
                          {WARTUNG_STATE_LABEL[state]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {!w.durchgefuehrtAm ? (
                          <form action={markWartungDurchgefuehrt}>
                            <input type="hidden" name="id" value={w.id} />
                            <input
                              type="hidden"
                              name="durchgefuehrtAm"
                              value={new Date().toISOString().slice(0, 10)}
                            />
                            <button
                              type="submit"
                              className="text-xs text-[color:var(--color-accent)] hover:underline"
                            >
                              Heute erledigen
                            </button>
                          </form>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-16">
        <div className="flex items-baseline justify-between gap-3 mb-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            Dispositions-Historie
          </p>
          <span className="text-xs text-[color:var(--color-fg-muted)]">
            {dispositionen.length} Disposition
            {dispositionen.length === 1 ? "" : "en"}
          </span>
        </div>
        {dispositionen.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] italic">
            Noch keine Disposition.
          </p>
        ) : (
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">Projekt</th>
                  <th className="px-3 py-3 text-left">Von</th>
                  <th className="px-3 py-3 text-left">Bis</th>
                  <th className="px-3 py-3 text-left">Status</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {dispositionen.map((d) => {
                  const p = projektMap.get(d.projektId);
                  return (
                    <tr
                      key={d.id}
                      className="border-t border-[color:var(--color-border)]"
                    >
                      <td className="px-3 py-2.5">
                        {p ? (
                          <Link
                            href={`/projekte/${p.id}`}
                            className="hover:text-[color:var(--color-accent)]"
                          >
                            <span className="font-mono text-xs">
                              {p.identifier}
                            </span>
                            {" — "}
                            {p.name}
                          </Link>
                        ) : (
                          <span className="text-[color:var(--color-fg-muted)] italic">
                            Projekt entfernt
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {formatDateShort(d.vonDatum)}
                        {d.vonZeit ? ` ${d.vonZeit}` : ""}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-xs">
                        {formatDateShort(d.bisDatum)}
                        {d.bisZeit ? ` ${d.bisZeit}` : ""}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[color:var(--color-fg-muted)]">
                          {DISPO_STATUS_LABEL[d.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {d.status === "geplant" || d.status === "aktiv" ? (
                          <div className="flex justify-end gap-2">
                            <DispoStatusButton
                              id={d.id}
                              status="zurueck"
                              label="Zurück"
                            />
                            <DispoStatusButton
                              id={d.id}
                              status="storniert"
                              label="Stornieren"
                            />
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Container>
  );
}

function DataField({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm text-[color:var(--color-fg)]">{value}</p>
    </div>
  );
}

function DispoStatusButton({
  id,
  status,
  label,
}: {
  id: string;
  status: "zurueck" | "storniert";
  label: string;
}) {
  return (
    <form action={updateDispositionStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] hover:underline"
      >
        {label}
      </button>
    </form>
  );
}
