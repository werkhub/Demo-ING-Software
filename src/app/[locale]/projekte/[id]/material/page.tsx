import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  BESTELLUNG_STATUS_LABEL,
  LIEFERSCHEIN_STATUS_LABEL,
  MATCH_STATUS_LABEL,
} from "@/lib/material";
import { stornoBestellung } from "./actions";

async function stornoBestellungVoid(formData: FormData): Promise<void> {
  "use server";
  await stornoBestellung(null, formData);
}

export const dynamic = "force-dynamic";

const fmtCurrency = (cents: number) =>
  new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);

type Tab = "bestellungen" | "lieferscheine" | "match";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ tab?: string; created?: string }>;

export default async function MaterialPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id: projektId } = await params;
  const sp = await searchParams;
  const tab: Tab =
    sp.tab === "lieferscheine" || sp.tab === "match"
      ? sp.tab
      : "bestellungen";
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

  const [bestellungenRows, lieferscheineRows, matches] = await Promise.all([
    db
      .select()
      .from(schema.bestellungen)
      .where(
        and(
          eq(schema.bestellungen.workspaceId, workspaceId),
          eq(schema.bestellungen.projektId, projektId)
        )
      )
      .orderBy(desc(schema.bestellungen.datum)),
    db
      .select()
      .from(schema.lieferscheine)
      .where(
        and(
          eq(schema.lieferscheine.workspaceId, workspaceId),
          eq(schema.lieferscheine.projektId, projektId)
        )
      )
      .orderBy(desc(schema.lieferscheine.datum)),
    db
      .select()
      .from(schema.materialMatch)
      .where(
        and(
          eq(schema.materialMatch.workspaceId, workspaceId),
          eq(schema.materialMatch.projektId, projektId)
        )
      )
      .orderBy(desc(schema.materialMatch.createdAt)),
  ]);

  const bestellnummerById = new Map(
    bestellungenRows.map((b) => [b.id, b.bestellnummer])
  );

  const rechnungIds = matches.map((m) => m.rechnungId);
  const rechnungen =
    rechnungIds.length > 0
      ? await db
          .select({
            id: schema.rechnungen.id,
            supplierName: schema.rechnungen.supplierName,
            invoiceDate: schema.rechnungen.invoiceDate,
          })
          .from(schema.rechnungen)
          .where(inArray(schema.rechnungen.id, rechnungIds))
      : [];
  const rechnungById = new Map(rechnungen.map((r) => [r.id, r]));

  const offeneBestellungen = bestellungenRows.filter(
    (b) => b.status === "offen" || b.status === "teilgeliefert"
  ).length;
  const offeneLs = lieferscheineRows.filter(
    (l) => l.status === "eingegangen"
  ).length;
  const matchAbweichungen = matches.filter(
    (m) => m.matchStatus === "abweichung"
  ).length;
  const summeNetto = bestellungenRows
    .filter((b) => b.status !== "storniert")
    .reduce((s, b) => s + b.summeNettoCents, 0);

  return (
    <Container>
      <section className="pt-14 pb-8">
        <Link
          href={`/projekte/${projektId}`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← {project.identifier} {project.name}
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Modul 3.4
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Material & Lieferscheine
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Bestellung → Lieferschein → Eingangsrechnung. 3-Way-Match prüft, ob
          fakturierte Mengen und Beträge zur Bestellung und Wareneingang passen.
        </p>
      </section>

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`/projekte/${projektId}/material/bestellungen/new`}
          className="rounded-full bg-[color:var(--color-fg)] px-4 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
        >
          + Neue Bestellung
        </Link>
        <Link
          href={`/projekte/${projektId}/material/lieferscheine/new`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          + Lieferschein erfassen
        </Link>
        <Link
          href={`/projekte/${projektId}/material/match`}
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          → Match starten
        </Link>
      </section>

      <section className="mb-8 border-t border-[color:var(--color-border)] pt-6">
        <StatGrid4>
          <StatCard label="Bestellungen offen" value={offeneBestellungen} />
          <StatCard
            label="Lieferscheine ungeprüft"
            value={offeneLs}
            tone={offeneLs > 0 ? "warning" : "default"}
          />
          <StatCard
            label="Match-Abweichungen"
            value={matchAbweichungen}
            tone={matchAbweichungen > 0 ? "critical" : "default"}
          />
          <StatCard label="Volumen netto" value={fmtCurrency(summeNetto)} tone="accent" />
        </StatGrid4>
      </section>

      <nav className="mb-6 flex gap-1 border-b border-[color:var(--color-border)]">
        <TabLink projektId={projektId} active={tab} target="bestellungen" label={`Bestellungen (${bestellungenRows.length})`} />
        <TabLink projektId={projektId} active={tab} target="lieferscheine" label={`Lieferscheine (${lieferscheineRows.length})`} />
        <TabLink projektId={projektId} active={tab} target="match" label={`Match (${matches.length})`} />
      </nav>

      {tab === "bestellungen" ? (
        <BestellungenTable
          rows={bestellungenRows}
          projektId={projektId}
        />
      ) : tab === "lieferscheine" ? (
        <LieferscheineTable
          rows={lieferscheineRows}
          projektId={projektId}
          bestellnummerById={bestellnummerById}
        />
      ) : (
        <MatchesTable
          rows={matches}
          rechnungById={rechnungById}
          bestellnummerById={bestellnummerById}
        />
      )}
    </Container>
  );
}

function TabLink({
  projektId,
  active,
  target,
  label,
}: {
  projektId: string;
  active: Tab;
  target: Tab;
  label: string;
}) {
  const isActive = active === target;
  return (
    <Link
      href={`/projekte/${projektId}/material?tab=${target}`}
      className={`px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] border-b-2 -mb-px transition-colors ${
        isActive
          ? "border-[color:var(--color-accent)] text-[color:var(--color-fg)]"
          : "border-transparent text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
      }`}
    >
      {label}
    </Link>
  );
}

function BestellungenTable({
  rows,
  projektId,
}: {
  rows: typeof schema.bestellungen.$inferSelect[];
  projektId: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center text-sm text-[color:var(--color-fg-muted)]">
        Noch keine Bestellungen.
      </div>
    );
  }
  return (
    <div className="border border-[color:var(--color-border)] overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
          <tr>
            <th className="px-3 py-3 text-left">Nr.</th>
            <th className="px-3 py-3 text-left">Datum</th>
            <th className="px-3 py-3 text-left">Lieferant</th>
            <th className="px-3 py-3 text-right">Netto</th>
            <th className="px-3 py-3 text-left">Status</th>
            <th className="px-3 py-3 text-right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((b) => (
            <tr key={b.id} className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)]">
              <td className="px-3 py-2.5 font-mono text-xs">
                <Link
                  href={`/projekte/${projektId}/material/bestellungen/${b.id}`}
                  className="hover:text-[color:var(--color-accent)]"
                >
                  {b.bestellnummer}
                </Link>
              </td>
              <td className="px-3 py-2.5 font-mono text-xs text-[color:var(--color-fg-muted)]">
                {b.datum}
              </td>
              <td className="px-3 py-2.5">{b.lieferantName}</td>
              <td className="px-3 py-2.5 text-right font-mono text-xs">
                {fmtCurrency(b.summeNettoCents)}
              </td>
              <td className="px-3 py-2.5">
                <BestellungStatusBadge status={b.status} />
              </td>
              <td className="px-3 py-2.5 text-right">
                {b.status !== "storniert" && b.status !== "vollstaendig" ? (
                  <form action={stornoBestellungVoid}>
                    <input type="hidden" name="id" value={b.id} />
                    <button
                      type="submit"
                      className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                    >
                      Stornieren
                    </button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LieferscheineTable({
  rows,
  projektId,
  bestellnummerById,
}: {
  rows: typeof schema.lieferscheine.$inferSelect[];
  projektId: string;
  bestellnummerById: Map<string, string>;
}) {
  void projektId;
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center text-sm text-[color:var(--color-fg-muted)]">
        Noch keine Lieferscheine erfasst.
      </div>
    );
  }
  return (
    <div className="border border-[color:var(--color-border)] overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
          <tr>
            <th className="px-3 py-3 text-left">LS-Nr.</th>
            <th className="px-3 py-3 text-left">Datum</th>
            <th className="px-3 py-3 text-left">Lieferant</th>
            <th className="px-3 py-3 text-left">Bestellung</th>
            <th className="px-3 py-3 text-left">Angenommen von</th>
            <th className="px-3 py-3 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id} className="border-t border-[color:var(--color-border)]">
              <td className="px-3 py-2.5 font-mono text-xs">{l.lsNr}</td>
              <td className="px-3 py-2.5 font-mono text-xs text-[color:var(--color-fg-muted)]">
                {l.datum}
              </td>
              <td className="px-3 py-2.5">{l.lieferantName}</td>
              <td className="px-3 py-2.5 font-mono text-xs">
                {l.bestellungId
                  ? bestellnummerById.get(l.bestellungId) ?? "—"
                  : "—"}
              </td>
              <td className="px-3 py-2.5 text-xs">{l.angenommenVon ?? "—"}</td>
              <td className="px-3 py-2.5">
                <LsStatusBadge status={l.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MatchesTable({
  rows,
  rechnungById,
  bestellnummerById,
}: {
  rows: typeof schema.materialMatch.$inferSelect[];
  rechnungById: Map<string, { id: string; supplierName: string; invoiceDate: string | null }>;
  bestellnummerById: Map<string, string>;
}) {
  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center text-sm text-[color:var(--color-fg-muted)]">
        Noch kein Match durchgeführt. Wechsle zum Tab „Match", um eine
        Eingangsrechnung mit einer Bestellung abzugleichen.
      </div>
    );
  }
  return (
    <div className="border border-[color:var(--color-border)] overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
          <tr>
            <th className="px-3 py-3 text-left">Erstellt</th>
            <th className="px-3 py-3 text-left">Bestellung</th>
            <th className="px-3 py-3 text-left">Rechnung</th>
            <th className="px-3 py-3 text-left">Status</th>
            <th className="px-3 py-3 text-right">Abweichungen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((m) => {
            const r = rechnungById.get(m.rechnungId);
            const details = safeJsonParse<{
              abweichungen?: unknown[];
            }>(m.matchDetailsJson) ?? {};
            const anzahl = Array.isArray(details.abweichungen)
              ? details.abweichungen.length
              : 0;
            return (
              <tr key={m.id} className="border-t border-[color:var(--color-border)]">
                <td className="px-3 py-2.5 font-mono text-xs text-[color:var(--color-fg-muted)]">
                  {m.createdAt.toLocaleDateString("de-DE")}
                </td>
                <td className="px-3 py-2.5 font-mono text-xs">
                  {bestellnummerById.get(m.bestellungId) ?? "—"}
                </td>
                <td className="px-3 py-2.5 text-xs">
                  {r ? `${r.supplierName} · ${r.invoiceDate ?? "—"}` : "—"}
                </td>
                <td className="px-3 py-2.5">
                  <MatchStatusBadge status={m.matchStatus} />
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs">
                  {anzahl}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function safeJsonParse<T>(s: string): T | null {
  try {
    return JSON.parse(s) as T;
  } catch {
    return null;
  }
}

function BestellungStatusBadge({ status }: { status: keyof typeof BESTELLUNG_STATUS_LABEL }) {
  const tone =
    status === "vollstaendig"
      ? "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]"
      : status === "storniert"
        ? "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]"
        : status === "teilgeliefert"
          ? "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]"
          : "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] border-[color:var(--color-info-border)]";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}>
      {BESTELLUNG_STATUS_LABEL[status]}
    </span>
  );
}

function LsStatusBadge({ status }: { status: keyof typeof LIEFERSCHEIN_STATUS_LABEL }) {
  const tone =
    status === "abgeschlossen"
      ? "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]"
      : status === "reklamation"
        ? "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]"
        : status === "geprueft"
          ? "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] border-[color:var(--color-info-border)]"
          : "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}>
      {LIEFERSCHEIN_STATUS_LABEL[status]}
    </span>
  );
}

function MatchStatusBadge({ status }: { status: keyof typeof MATCH_STATUS_LABEL }) {
  const tone =
    status === "ok"
      ? "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]"
      : status === "abweichung"
        ? "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]"
        : "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]";
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${tone}`}>
      {MATCH_STATUS_LABEL[status]}
    </span>
  );
}
