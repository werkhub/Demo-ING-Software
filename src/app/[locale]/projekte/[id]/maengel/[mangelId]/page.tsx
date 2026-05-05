import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { PrioritaetBadge } from "@/components/prioritaet-badge";
import { db, schema } from "@/db";
import {
  getAnzeigenByMangel,
  getMangel,
  getProjectById,
} from "@/db/queries";
import { getCurrentWorkspaceId } from "@/lib/session";
import { computeWarrantyEnd } from "@/lib/abnahme";
import {
  MANGEL_PHASE_LABEL,
  MANGEL_PHASE_LEGAL_BASIS,
  MANGEL_PRIORITAET_LABEL,
  MANGEL_STATUS_LABEL,
  MANGEL_VERSANDWEG_LABEL,
  daysUntilFrist,
  mangelDeadlineState,
  mangelTitle,
} from "@/lib/maengel";
import { allowedNextStates, isTerminal } from "@/lib/maengel/state-machine";
import { formatDateShort } from "@/lib/utils";
import {
  deleteMangel,
  transitionMangelStatus,
} from "../actions";

export const dynamic = "force-dynamic";

export default async function MangelDetailPage({
  params,
}: {
  params: Promise<{ id: string; mangelId: string }>;
}) {
  const { id, mangelId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const m = await getMangel(mangelId);
  if (!m || m.projectId !== project.id) notFound();

  const [anzeigen, securities] = await Promise.all([
    getAnzeigenByMangel(mangelId),
    loadEligibleSecurities(project.id),
  ]);

  const headLine = mangelTitle(m);
  const restLines = m.beschreibung.split("\n").slice(1).join("\n");
  const deadline = mangelDeadlineState(m);
  const days = daysUntilFrist(m);
  const warranty =
    m.phase === "abnahme" && project.abnahmeDate
      ? computeWarrantyEnd(project.abnahmeDate, project.contractType)
      : project.warrantyEnd;

  const nextStates = allowedNextStates(m.status);
  const showSicherheitBanner = m.status === "strittig" && securities.length > 0;

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
              {headLine}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              {MANGEL_PHASE_LABEL[m.phase]} · {MANGEL_PHASE_LEGAL_BASIS[m.phase]}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <PrioritaetBadge prioritaet={m.prioritaet} size="md" />
            <Link
              href={`/projekte/${id}/maengel`}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
            >
              ← zurück
            </Link>
          </div>
        </div>
      </section>

      {showSicherheitBanner ? (
        <section className="pb-6">
          <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-md p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-critical)]">
              Sicherheit-Inanspruchnahme prüfen — § 17 VOB/B
            </p>
            <p className="mt-1 text-sm text-[color:var(--color-fg)]">
              Mangel ist als <strong>strittig</strong> markiert und für dieses
              Projekt {securities.length === 1
                ? "existiert eine aktive Sicherheit"
                : `existieren ${securities.length} aktive Sicherheiten`}{" "}
              ({securities.map((s) => s.kind).join(", ")}). Ein Vorgang zur
              Inanspruchnahmeprüfung wurde automatisch angelegt.
            </p>
          </div>
        </section>
      ) : null}

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-4">
          <Tile label="Status" value={MANGEL_STATUS_LABEL[m.status]} />
          <Tile
            label="Priorität"
            value={MANGEL_PRIORITAET_LABEL[m.prioritaet]}
          />
          <Tile
            label="Frist"
            value={
              m.fristsetzungDatum ? formatDateShort(m.fristsetzungDatum) : "—"
            }
            subtitle={
              deadline === "overdue"
                ? `${Math.abs(days ?? 0)} T überfällig`
                : deadline === "expiring"
                  ? `in ${days} T`
                  : undefined
            }
            tone={
              deadline === "overdue"
                ? "critical"
                : deadline === "expiring"
                  ? "warning"
                  : "default"
            }
          />
          <Tile
            label="Gewährleistung bis"
            value={warranty ? formatDateShort(warranty) : "—"}
            subtitle={
              project.contractType === "vob_vertrag"
                ? "§ 13 IV VOB/B · 4 J."
                : project.contractType
                  ? "§ 634a BGB · 5 J."
                  : "Vertragstyp fehlt"
            }
          />
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
              Sachverhalt
            </p>
            <p className="text-sm whitespace-pre-wrap">{m.beschreibung}</p>
            {restLines.length === 0 ? null : (
              <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] italic">
                Erste Zeile dient als Listentitel.
              </p>
            )}
          </div>
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
              Rahmendaten
            </p>
            <dl className="space-y-2 text-sm">
              <Row label="Gemeldet am" value={formatDateShort(m.gemeldetAm)} />
              {m.gemeldetVon ? (
                <Row label="Gemeldet von" value={m.gemeldetVon} />
              ) : null}
              {m.kategorie ? (
                <Row label="Kategorie" value={m.kategorie} />
              ) : null}
              {m.ortImBauwerk ? (
                <Row label="Ort" value={m.ortImBauwerk} />
              ) : null}
              {m.behebungBis ? (
                <Row
                  label="Behebung zugesagt bis"
                  value={formatDateShort(m.behebungBis)}
                />
              ) : null}
              {m.behobenAm ? (
                <Row
                  label="Behoben am"
                  value={formatDateShort(m.behobenAm)}
                />
              ) : null}
              {m.kostenGeschaetztCents !== null ? (
                <Row
                  label="Kosten geschätzt"
                  value={`${(m.kostenGeschaetztCents / 100).toFixed(2)} €`}
                />
              ) : null}
              {m.kostenIstCents !== null ? (
                <Row
                  label="Kosten Ist"
                  value={`${(m.kostenIstCents / 100).toFixed(2)} €`}
                />
              ) : null}
            </dl>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Status-Übergang
        </p>
        {isTerminal(m.status) ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] italic">
            Status {MANGEL_STATUS_LABEL[m.status]} ist terminal — keine
            weiteren Übergänge möglich.
          </p>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {nextStates.map((next) => (
              <form key={next} action={transitionMangelStatus}>
                <input type="hidden" name="id" value={m.id} />
                <input type="hidden" name="status" value={next} />
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
                >
                  → {MANGEL_STATUS_LABEL[next]}
                </button>
              </form>
            ))}
          </div>
        )}
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            Anzeigen-Historie · {anzeigen.length}
          </p>
          <Link
            href={`/projekte/${id}/maengel/${m.id}/anzeige/new`}
            className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Anzeige erfassen
          </Link>
        </div>

        {anzeigen.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch keine Anzeige verschickt.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {anzeigen.map((a) => (
              <li key={a.id} className="py-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {formatDateShort(a.versendetAm)} ·{" "}
                      {MANGEL_VERSANDWEG_LABEL[a.versandweg]}
                      {a.anzeigeAnExtern ? ` · an ${a.anzeigeAnExtern}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] whitespace-pre-wrap">
                      {a.inhaltText}
                    </p>
                    {a.antwortEingegangen && a.antwortText ? (
                      <div className="mt-2 border-l-2 border-[color:var(--color-accent)] pl-3 py-1">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)]">
                          Antwort {a.antwortDatum ? `· ${formatDateShort(a.antwortDatum)}` : ""}
                        </p>
                        <p className="text-xs text-[color:var(--color-fg-muted)] mt-0.5 whitespace-pre-wrap">
                          {a.antwortText}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {m.notes && !m.notes.startsWith("[auto-vorgang") ? (
        <section className="border-t border-[color:var(--color-border)] pt-6 pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-2">
            Interne Notizen
          </p>
          <p className="text-sm text-[color:var(--color-fg-muted)] whitespace-pre-wrap">
            {m.notes
              .split("\n")
              .filter((l) => !l.startsWith("[auto-vorgang"))
              .join("\n")}
          </p>
        </section>
      ) : null}

      <section className="border-t border-[color:var(--color-border)] pt-6 pb-16 flex items-center justify-end">
        <form action={deleteMangel}>
          <input type="hidden" name="id" value={m.id} />
          <button
            type="submit"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
          >
            Mangel löschen
          </button>
        </form>
      </section>
    </Container>
  );
}

async function loadEligibleSecurities(projectId: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const all = await db
    .select({
      id: schema.securities.id,
      kind: schema.securities.kind,
      status: schema.securities.status,
    })
    .from(schema.securities)
    .where(
      and(
        eq(schema.securities.workspaceId, workspaceId),
        eq(schema.securities.projectId, projectId)
      )
    );
  return all.filter(
    (s) =>
      (s.kind === "vertragserfuellung" || s.kind === "maengelanspruch") &&
      (s.status === "aktiv" || s.status === "rueckgabe_angefordert")
  );
}

function Tile({
  label,
  value,
  subtitle,
  tone = "default",
}: {
  label: string;
  value: string;
  subtitle?: string;
  tone?: "default" | "warning" | "critical";
}) {
  return (
    <div className="bg-[color:var(--color-bg)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p
        className={
          "mt-2 text-xl font-semibold tracking-tight " +
          (tone === "critical"
            ? "text-[color:var(--color-critical)]"
            : tone === "warning"
              ? "text-[color:var(--color-warning)]"
              : "text-[color:var(--color-fg)]")
        }
      >
        {value}
      </p>
      {subtitle ? (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </dt>
      <dd className="text-sm text-[color:var(--color-fg)]">{value}</dd>
    </div>
  );
}
