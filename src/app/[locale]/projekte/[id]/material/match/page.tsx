import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, desc, eq, ne } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { runMatchRedirect } from "../actions";
import { MATCH_STATUS_LABEL } from "@/lib/material";
import { MatchForm } from "./match-form";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{
  error?: string;
  matched?: string;
  status?: string;
}>;

export default async function MaterialMatchPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id: projektId } = await params;
  const sp = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projektId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) notFound();

  const [bestellungenRows, lieferscheineRows, rechnungenRows] = await Promise.all([
    db
      .select({
        id: schema.bestellungen.id,
        bestellnummer: schema.bestellungen.bestellnummer,
        lieferantName: schema.bestellungen.lieferantName,
      })
      .from(schema.bestellungen)
      .where(
        and(
          eq(schema.bestellungen.workspaceId, workspaceId),
          eq(schema.bestellungen.projektId, projektId),
          ne(schema.bestellungen.status, "storniert")
        )
      )
      .orderBy(desc(schema.bestellungen.datum)),
    db
      .select({
        id: schema.lieferscheine.id,
        lsNr: schema.lieferscheine.lsNr,
        datum: schema.lieferscheine.datum,
        bestellungId: schema.lieferscheine.bestellungId,
      })
      .from(schema.lieferscheine)
      .where(
        and(
          eq(schema.lieferscheine.workspaceId, workspaceId),
          eq(schema.lieferscheine.projektId, projektId)
        )
      )
      .orderBy(desc(schema.lieferscheine.datum)),
    db
      .select({
        id: schema.rechnungen.id,
        supplierName: schema.rechnungen.supplierName,
        invoiceDate: schema.rechnungen.invoiceDate,
        status: schema.rechnungen.status,
      })
      .from(schema.rechnungen)
      .where(
        and(
          eq(schema.rechnungen.workspaceId, workspaceId),
          eq(schema.rechnungen.projectId, projektId)
        )
      )
      .orderBy(desc(schema.rechnungen.invoiceDate)),
  ]);

  // Nur Eingangsrechnungen, die noch nicht freigegeben/abgelehnt sind, sind
  // Match-Kandidaten — danach ist die Buchhaltung "durch".
  const offeneRechnungen = rechnungenRows.filter(
    (r) => r.status === "eingegangen" || r.status === "geprueft"
  );

  return (
    <Container>
      <section className="pt-14 pb-10">
        <Link
          href={`/projekte/${projektId}/material`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-4"
        >
          ← Material
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · 3-Way-Match
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Bestellung × Lieferschein × Rechnung
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Vergleicht fakturierte Mengen und Beträge gegen Bestellung und
          Wareneingang. Außerhalb der Toleranz erzeugt das System automatisch
          einen Vorgang zur Klärung.
        </p>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}

      {sp.matched && sp.status ? (
        <div
          className={`mb-6 rounded-md border px-4 py-3 text-sm ${
            sp.status === "ok"
              ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]"
              : sp.status === "abweichung"
                ? "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]"
                : "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]"
          }`}
        >
          Match-Ergebnis:{" "}
          <strong>
            {MATCH_STATUS_LABEL[sp.status as keyof typeof MATCH_STATUS_LABEL] ??
              sp.status}
          </strong>
          {sp.status === "abweichung" ? " — Vorgang wurde automatisch angelegt." : null}
        </div>
      ) : null}

      <MatchForm
        projektId={projektId}
        bestellungen={bestellungenRows}
        lieferscheine={lieferscheineRows}
        rechnungen={offeneRechnungen.map((r) => ({
          id: r.id,
          supplierName: r.supplierName,
          invoiceDate: r.invoiceDate,
        }))}
        action={runMatchRedirect}
      />
    </Container>
  );
}
