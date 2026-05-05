import { notFound } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { ComplianceBadge } from "@/components/compliance-badge";
import {
  getCertificatesBySubcontractor,
  getSubcontractor,
} from "@/db/queries";
import { db, schema } from "@/db";
import { and, eq } from "drizzle-orm";
import { getCurrentWorkspaceId } from "@/lib/session";
import { fmtMoney } from "@/lib/utils";
import {
  CERTIFICATE_LABELS,
  CERTIFICATE_LEGAL_BASIS,
  allRelevantKinds,
  certificateState,
  computeComplianceStatus,
  daysUntilExpiry,
  isRequired,
  pickLatestPerKind,
} from "@/lib/compliance/nu";
import type { SubcontractorCertificateKind } from "@/db/schema";
import { CertForm } from "./cert-form";
import {
  deleteCertificate,
  requestCertificate,
  togglePaymentRelease,
} from "./actions";

export const dynamic = "force-dynamic";

const STATE_TONE: Record<string, string> = {
  ok: "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  expiring:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  expired:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  missing:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  requested:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

const STATE_LABEL: Record<string, string> = {
  ok: "Gültig",
  expiring: "Läuft ab",
  expired: "Abgelaufen",
  missing: "Fehlt",
  requested: "Angefordert",
};

function buildAnforderungsMail(opts: {
  recipient: string | null;
  nuName: string;
  gewerk: string;
  kinds: SubcontractorCertificateKind[];
}): string {
  const subject = `Anforderung Compliance-Bescheinigungen — ${opts.gewerk}`;
  const body = [
    `Sehr geehrte Damen und Herren,`,
    ``,
    `bitte übersenden Sie uns für die Aufrechterhaltung Ihrer Beauftragung als Nachunternehmer kurzfristig folgende Bescheinigungen:`,
    ``,
    ...opts.kinds.map(
      (k) => `  · ${CERTIFICATE_LABELS[k]} (${CERTIFICATE_LEGAL_BASIS[k]})`
    ),
    ``,
    `Hintergrund ist unsere Generalunternehmer-Haftung nach § 14 AEntG / § 13 MiLoG sowie die Steuerabzugspflicht nach § 48b EStG. Ohne aktuelle Bescheinigungen müssen wir die Auszahlung kommender Rechnungen vorsorglich zurückhalten.`,
    ``,
    `Mit freundlichen Grüßen`,
  ].join("\n");
  const params = new URLSearchParams({ subject, body });
  return `mailto:${opts.recipient ?? ""}?${params.toString()}`;
}

export default async function NuDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspaceId = await getCurrentWorkspaceId();
  const nu = await getSubcontractor(id);
  if (!nu) notFound();

  const [project] = await db
    .select({
      id: schema.projects.id,
      identifier: schema.projects.identifier,
      name: schema.projects.name,
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, nu.projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);

  const certs = await getCertificatesBySubcontractor(id);
  const status = computeComplianceStatus(nu, certs);
  const latest = pickLatestPerKind(certs);
  const kinds = allRelevantKinds(nu);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Nachunternehmer
        </p>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
              {nu.name}
              {nu.organization ? (
                <span className="text-[color:var(--color-fg-muted)] text-2xl ml-2">
                  · {nu.organization}
                </span>
              ) : null}
            </h1>
            <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] font-mono">
              {nu.gewerk}
              {project ? ` · ${project.identifier} · ${project.name}` : ""}
              {nu.contractValue ? ` · ${fmtMoney(nu.contractValue)}` : ""}
              {nu.isForeign ? " · Ausländischer NU" : ""}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <ComplianceBadge
              level={status.level}
              fulfilled={status.fulfilledCount}
              required={status.requiredCount}
              size="md"
            />
            <Link
              href="/nu"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
            >
              ← zurück zur NU-Liste
            </Link>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={`/nu/${nu.id}/auftraege`}
            className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
          >
            Aufträge
          </Link>
          <Link
            href={`/nu/${nu.id}/sicherheiten`}
            className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
          >
            Sicherheits-Konto
          </Link>
        </div>
      </section>

      {nu.paymentReleaseBlocked ? (
        <section className="pb-8">
          <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-md p-4 flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-critical)]">
                Zahlung blockiert
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-fg)]">
                Rechnungen dieses NU werden nicht zur Zahlung freigegeben, bis
                die Compliance-Lücke geschlossen ist. Risiko: § 14 AEntG · § 13
                MiLoG · § 48b EStG.
              </p>
            </div>
            <form action={togglePaymentRelease}>
              <input type="hidden" name="id" value={nu.id} />
              <input type="hidden" name="blocked" value="false" />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] text-[color:var(--color-fg)] hover:bg-[color:var(--color-accent-soft)] transition-colors whitespace-nowrap"
              >
                Sperre aufheben
              </button>
            </form>
          </div>
        </section>
      ) : !nu.requiresCompliance ? (
        <section className="pb-8">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-4 text-sm text-[color:var(--color-fg-muted)]">
            Compliance-Prüfung für diesen NU deaktiviert. Sonderfall (z. B.
            Architekt/Sachverständiger).
          </div>
        </section>
      ) : null}

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-5">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">
              Compliance-Bescheinigungen
            </h2>
            <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
              {status.fulfilledCount} von {status.requiredCount} Pflicht-Bescheinigungen
              gültig
              {status.expiring.length > 0
                ? ` · ${status.expiring.length} läuft/läuft bald ab`
                : ""}
              {status.expired.length > 0
                ? ` · ${status.expired.length} abgelaufen`
                : ""}
              {status.missing.length > 0
                ? ` · ${status.missing.length} fehlt`
                : ""}
            </p>
          </div>
          {status.missing.length > 0 ? (
            <a
              href={buildAnforderungsMail({
                recipient: nu.email,
                nuName: nu.name,
                gewerk: nu.gewerk,
                kinds: status.missing,
              })}
              className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
            >
              📧 Fehlende anfordern (Mail)
            </a>
          ) : null}
        </div>

        <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
          {kinds.map((kind) => {
            const cert = latest.get(kind);
            const required = isRequired(kind, nu);
            const state = cert
              ? cert.status === "angefordert"
                ? "requested"
                : certificateState(cert)
              : "missing";
            const days = cert ? daysUntilExpiry(cert.validUntil) : null;
            return (
              <li key={kind} className="py-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-[color:var(--color-fg)]">
                        {CERTIFICATE_LABELS[kind]}
                      </p>
                      <span
                        className={`font-mono text-[9px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${STATE_TONE[state]}`}
                      >
                        {STATE_LABEL[state]}
                      </span>
                      {!required ? (
                        <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-[color:var(--color-fg-muted)]">
                          empfohlen
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                      {CERTIFICATE_LEGAL_BASIS[kind]}
                      {cert?.issuer ? ` · ${cert.issuer}` : ""}
                      {cert
                        ? cert.status === "angefordert"
                          ? " · noch nicht eingegangen"
                          : ` · gültig bis ${cert.validUntil}${
                              days !== null && days >= 0
                                ? ` (in ${days} Tagen)`
                                : days !== null
                                  ? ` (vor ${Math.abs(days)} Tagen abgelaufen)`
                                  : ""
                            }`
                        : ""}
                    </p>
                    {cert?.documentPath && cert.documentFilename ? (
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        📎 {cert.documentFilename}
                      </p>
                    ) : null}
                    {cert?.notes ? (
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] italic">
                        {cert.notes}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!cert ? (
                      <form action={requestCertificate}>
                        <input
                          type="hidden"
                          name="subcontractorId"
                          value={nu.id}
                        />
                        <input type="hidden" name="kind" value={kind} />
                        <button
                          type="submit"
                          className="text-xs px-2.5 py-1 rounded-full text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] transition-colors"
                        >
                          Als angefordert markieren
                        </button>
                      </form>
                    ) : (
                      <form action={deleteCertificate}>
                        <input type="hidden" name="id" value={cert.id} />
                        <button
                          type="submit"
                          aria-label="Bescheinigung löschen"
                          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] px-2 py-1 transition-colors"
                        >
                          ✕
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="pb-12">
        <CertForm subcontractorId={nu.id} />
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)] mb-3">
          Rechtshinweise
        </p>
        <ul className="space-y-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
          <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
            <strong>§ 48b EStG:</strong> Ohne gültige Freistellungsbescheinigung
            müssen 15 % Bauabzugsteuer einbehalten und an das Finanzamt
            abgeführt werden — sonst haftet der AN für die nicht abgeführte
            Steuer.
          </li>
          <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
            <strong>§ 14 AEntG · § 13 MiLoG:</strong> Generalunternehmer-Haftung
            für die Lohnzahlungen aller eingesetzten NU. Eigenerklärung
            Mindestlohn dokumentiert die Sorgfaltspflicht.
          </li>
          <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
            <strong>SOKA-Bau / KK / BG:</strong> Unbedenklichkeitsbescheinigungen
            sollten nicht älter als drei Monate sein — sonst gilt sie
            beweisrechtlich nicht mehr.
          </li>
          <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
            <strong>A1-Bescheinigung:</strong> Pflicht bei jeder Entsendung
            innerhalb der EU/EWR/Schweiz. Bei Kontrolle (Zoll/FKS) ist die A1
            am Mann mitzuführen.
          </li>
        </ul>
      </section>
    </Container>
  );
}
