import { desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { RdgBanner } from "@/components/rdg-banner";
import { db, schema } from "@/db";
import { getProjects } from "@/db/queries";
import { getCurrentWorkspaceId } from "@/lib/session";
import { AbschlagClient } from "./abschlag-client";

export const dynamic = "force-dynamic";

export default async function AbschlagspruefungPage() {
  const workspaceId = await getCurrentWorkspaceId();
  const [projects, subcontractors, recent] = await Promise.all([
    getProjects(),
    db
      .select({
        id: schema.subcontractors.id,
        name: schema.subcontractors.name,
        organization: schema.subcontractors.organization,
        freistellungsbescheinigungGueltigBis:
          schema.subcontractors.freistellungsbescheinigungGueltigBis,
      })
      .from(schema.subcontractors)
      .where(eq(schema.subcontractors.workspaceId, workspaceId)),
    db
      .select({
        id: schema.abschlagspruefungen.id,
        rechnungsNr: schema.abschlagspruefungen.rechnungsNr,
        lieferant: schema.abschlagspruefungen.lieferant,
        abschlagNo: schema.abschlagspruefungen.abschlagNo,
        score: schema.abschlagspruefungen.score,
        decision: schema.abschlagspruefungen.decision,
        empfohleneZahlungBruttoEur:
          schema.abschlagspruefungen.empfohleneZahlungBruttoEur,
        empfohleneKuerzungEur: schema.abschlagspruefungen.empfohleneKuerzungEur,
        createdAt: schema.abschlagspruefungen.createdAt,
      })
      .from(schema.abschlagspruefungen)
      .where(eq(schema.abschlagspruefungen.workspaceId, workspaceId))
      .orderBy(desc(schema.abschlagspruefungen.createdAt))
      .limit(10),
  ]);

  return (
    <Container>
      <section className="pt-14 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Finanzen · Prüfung · Demo
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Abschlagsprüfung
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Eingehende Abschlagsrechnung gegen LV, Aufmaß, vorherige Abschläge,
          Sicherheitseinbehalt, § 13b UStG, § 48 EStG und § 16/§ 17 VOB/B
          prüfen — mit Kürzungs-Empfehlung und fertigem Korrekturanschreiben.
        </p>
        <div className="mt-6">
          <RdgBanner />
        </div>
      </section>

      <AbschlagClient
        projects={projects.map((p) => ({
          id: p.id,
          identifier: p.identifier,
          name: p.name,
        }))}
        subcontractors={subcontractors.map((s) => ({
          id: s.id,
          name: s.name,
          organization: s.organization,
          freistellungBis: s.freistellungsbescheinigungGueltigBis,
        }))}
      />

      {recent.length > 0 && (
        <section className="pb-10 border-t border-[color:var(--color-border)] pt-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
            Zuletzt geprüft ({recent.length})
          </p>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li
                key={r.id}
                className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg)] p-4 flex items-baseline justify-between gap-3 flex-wrap"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {r.rechnungsNr}
                    <span className="text-[color:var(--color-fg-muted)] font-normal">
                      {" "}
                      · {r.lieferant} · {r.abschlagNo}. Abschlag
                    </span>
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-1">
                    {new Date(r.createdAt).toLocaleString("de-DE")}
                  </p>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="font-mono text-[11px] text-[color:var(--color-fg-muted)]">
                    Score {r.score}/100
                  </span>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 ${
                      r.decision === "freigeben"
                        ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]"
                        : r.decision === "kuerzen"
                          ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]"
                          : r.decision === "ablehnen"
                            ? "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]"
                            : "border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)]"
                    }`}
                  >
                    {r.decision}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="pb-16">
        <div className="border-l-2 border-[color:var(--color-warning)] pl-5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
            Status
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
            Heuristik-Engine prüft 10 Kategorien (LV-Match, Aufmaß-Match,
            Kumulativ, Sicherheit, Skonto, USt §13b, Bauabzug §48,
            Frist §16, Form, Vertragsstrafe). PDF-Volltext-Extraktion und
            KI-gestütztes LV-Matching folgen in Phase 1.
          </p>
        </div>
      </section>
    </Container>
  );
}
