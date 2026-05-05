import { Link } from "@/i18n/navigation";
import { db, schema } from "@/db";
import { desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { ComplianceBadge } from "@/components/compliance-badge";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  getComplianceStatusForSubcontractors,
  getProjects,
} from "@/db/queries";
import { fmtMoney } from "@/lib/utils";
import { NuForm } from "./nu-form";
import { deleteSubcontractor, updatePassThroughStatus } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  nicht_geprueft: "Nicht geprüft",
  klausel_vorhanden: "Klausel vorhanden",
  klausel_fehlend: "Klausel fehlt",
  konfliktig: "Konfliktig",
};

const STATUS_TONE: Record<string, string> = {
  nicht_geprueft:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
  klausel_vorhanden:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  klausel_fehlend:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  konfliktig:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
};

export default async function NuPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const [projects, nus] = await Promise.all([
    getProjects(),
    db
      .select()
      .from(schema.subcontractors)
      .where(eq(schema.subcontractors.workspaceId, workspaceId))
      .orderBy(desc(schema.subcontractors.createdAt)),
  ]);

  const complianceMap = await getComplianceStatusForSubcontractors(nus);

  const total = nus.length;
  const totalValue = nus.reduce((s, n) => s + (n.contractValue ?? 0), 0);
  const conflictCount = nus.filter(
    (n) => n.passThroughStatus === "konfliktig" || n.passThroughStatus === "klausel_fehlend"
  ).length;
  const complianceCriticalCount = Array.from(complianceMap.values()).filter(
    (s) => s.level === "critical"
  ).length;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Projekt-Werkzeug
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          NU-Pass-Through
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Subunternehmer pro Projekt erfassen + Pass-Through-Klausel-Status pflegen.
          Wichtig: Was im Hauptvertrag mit dem AG geregelt ist (z. B. Mängelfristen,
          Vertragsstrafen, Sicherheiten), muss an den NU weitergereicht werden — sonst
          haftest du als AN für die Lücke selbst.
        </p>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <StatGrid4>
          <StatCard label="Erfasste NUs" value={total} />
          <StatCard
            label="Auftragsvolumen NUs"
            value={total === 0 ? "—" : fmtMoney(totalValue)}
          />
          <StatCard
            label="Pass-Through-Risiko"
            value={conflictCount}
            tone={conflictCount > 0 ? "critical" : "default"}
          />
          <StatCard
            label="Compliance-Lücken"
            value={complianceCriticalCount}
            tone={complianceCriticalCount > 0 ? "critical" : "default"}
          />
        </StatGrid4>
      </section>

      {projects.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Lege zuerst ein Projekt an — Nachunternehmer werden projektbezogen erfasst.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="pb-10">
            <NuForm
              projects={projects.map((p) => ({
                id: p.id,
                identifier: p.identifier,
                name: p.name,
              }))}
            />
          </section>

          <section className="pb-16">
            {nus.length === 0 ? (
              <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
                <p className="text-sm text-[color:var(--color-fg-muted)]">
                  Noch keine Nachunternehmer erfasst.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {nus.map((n) => {
                  const project = projects.find((p) => p.id === n.projectId);
                  const compliance = complianceMap.get(n.id);
                  return (
                    <li key={n.id} className="py-5 group/nu">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <Link
                              href={`/nu/${n.id}`}
                              className="text-base font-medium text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors"
                            >
                              {n.name}
                              {n.organization ? (
                                <span className="text-[color:var(--color-fg-muted)] ml-2 text-sm">
                                  · {n.organization}
                                </span>
                              ) : null}
                            </Link>
                            <span
                              className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${STATUS_TONE[n.passThroughStatus]}`}
                            >
                              {STATUS_LABEL[n.passThroughStatus]}
                            </span>
                            {compliance && n.requiresCompliance ? (
                              <ComplianceBadge
                                level={compliance.level}
                                fulfilled={compliance.fulfilledCount}
                                required={compliance.requiredCount}
                              />
                            ) : null}
                            {n.paymentReleaseBlocked ? (
                              <span className="font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]">
                                Zahlung gesperrt
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                            <span className="font-mono">{n.gewerk}</span>
                            {project ? ` · ${project.identifier} · ${project.name}` : ""}
                            {n.contractValue ? ` · ${fmtMoney(n.contractValue)}` : ""}
                            {n.contractType
                              ? ` · ${n.contractType === "vob_vertrag" ? "VOB" : "BGB"}`
                              : ""}
                            {n.isForeign ? " · Ausland" : ""}
                          </p>
                          {n.email || n.phone ? (
                            <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] font-mono">
                              {n.email}
                              {n.email && n.phone ? " · " : ""}
                              {n.phone}
                            </p>
                          ) : null}
                          {n.riskNotes ? (
                            <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] italic">
                              {n.riskNotes}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Link
                            href={`/nu/${n.id}`}
                            className="text-xs px-3 py-1 rounded-full border border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] hover:border-[color:var(--color-accent)] transition-colors"
                          >
                            Compliance
                          </Link>
                          <form
                            action={updatePassThroughStatus}
                            className="flex items-center gap-1"
                          >
                            <input type="hidden" name="id" value={n.id} />
                            <select
                              name="passThroughStatus"
                              defaultValue={n.passThroughStatus}
                              className="text-xs bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-[color:var(--color-fg)] focus:border-[color:var(--color-accent)] focus:outline-none"
                            >
                              <option value="nicht_geprueft">Nicht geprüft</option>
                              <option value="klausel_vorhanden">Klausel vorhanden</option>
                              <option value="klausel_fehlend">Klausel fehlt</option>
                              <option value="konfliktig">Konfliktig</option>
                            </select>
                            <button
                              type="submit"
                              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] px-2 py-1 transition-colors"
                            >
                              ↻
                            </button>
                          </form>
                          <form action={deleteSubcontractor}>
                            <input type="hidden" name="id" value={n.id} />
                            <button
                              type="submit"
                              aria-label="NU löschen"
                              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] px-2 py-1 transition-colors"
                            >
                              ✕
                            </button>
                          </form>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="pb-16 border-t border-[color:var(--color-border)] pt-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)] mb-3">
              Pass-Through-Hinweise
            </p>
            <ul className="space-y-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
              <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
                Was im AG-Vertrag steht (Mängelfristen 5 J. statt 4 J., höhere
                Vertragsstrafen, Sicherheits-Höhen), muss 1:1 in den NU-Vertrag —
                sonst haftest du den Differenz-Betrag selbst.
              </li>
              <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
                Bei „Konfliktig“ oder „Klausel fehlt“ sofort handeln: Nachtrag zum
                NU-Vertrag oder Übernahme des Risikos kalkulieren.
              </li>
              <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
                Bei Mangelrüge des AG: Pass-Through-Klausel zwingend vorab prüfen,
                bevor an NU weitergeleitet wird.
              </li>
            </ul>
          </section>
        </>
      )}
    </Container>
  );
}
