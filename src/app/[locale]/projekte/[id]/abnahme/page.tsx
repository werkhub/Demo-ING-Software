import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import {
  AbnahmeKindBadge,
  BeurteilungBadge,
} from "@/components/abnahme-state-badge";
import {
  getAbnahmenByProject,
  getMaengelByAbnahme,
  getProjectById,
} from "@/db/queries";
import { ABNAHME_KIND_LABEL, vertragsstrafeAtRisk } from "@/lib/abnahme";
import { formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AbnahmenListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  const abnahmen = await getAbnahmenByProject(id);
  // Mängelzahlen pro Abnahme — eine Query pro Abnahme reicht hier (typisch <5).
  const maengelCounts = await Promise.all(
    abnahmen.map(async (a) => {
      const m = await getMaengelByAbnahme(a.id);
      return {
        abnahmeId: a.id,
        total: m.length,
        offen: m.filter((x) => x.status === "offen" || x.status === "in_bearbeitung")
          .length,
        wesentlich: m.filter(
          (x) => x.prioritaet === "kritisch" || x.prioritaet === "hoch"
        ).length,
      };
    })
  );

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
            Abnahmen
          </h1>
          <Link
            href={`/projekte/${id}/abnahme/new`}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Neue Abnahme
          </Link>
        </div>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Förmliche Abnahme nach § 12 VOB/B / § 640 BGB ist der juristisch
          riskanteste Moment: Beweislast-Umkehr für Mängel, Beginn der
          Gewährleistungsfrist, Vertragsstrafen-Vorbehalt nach § 11 IV VOB/B.
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Projekt
          </Link>
        </div>
      </section>

      {abnahmen.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch keine Abnahme erfasst.
            </p>
            <p className="mt-2 text-xs text-[color:var(--color-fg-muted)]">
              Bei Verweigerung der Abnahme: ebenfalls als Datensatz erfassen
              (kind = „Abnahme verweigert") — wichtig für die Beweissicherung.
            </p>
          </div>
        </section>
      ) : (
        <section className="pb-16">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {abnahmen.map((a) => {
              const counts = maengelCounts.find((c) => c.abnahmeId === a.id);
              const vsRisk = vertragsstrafeAtRisk({
                kind: a.kind,
                vertragsstrafeAgreed: a.vertragsstrafeAgreed,
                vertragsstrafeReserved: a.vertragsstrafeReserved,
              });
              return (
                <li key={a.id} className="py-5">
                  <Link
                    href={`/projekte/${id}/abnahme/${a.id}`}
                    className="block group"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <AbnahmeKindBadge kind={a.kind} />
                          <BeurteilungBadge beurteilung={a.gesamtbeurteilung} />
                          {vsRisk ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]">
                              ⚠ Vertragsstrafe-Risiko
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-2 text-base font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                          {ABNAHME_KIND_LABEL[a.kind]} am{" "}
                          {formatDateShort(a.abnahmeDate)}
                          {a.scope ? ` · ${a.scope}` : ""}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                          {a.abnahmeOrt ? `${a.abnahmeOrt} · ` : ""}
                          {counts
                            ? counts.total === 0
                              ? "keine Mängel"
                              : `${counts.total} Mangel${counts.total > 1 ? "/Mängel" : ""}` +
                                (counts.offen > 0
                                  ? ` · ${counts.offen} offen`
                                  : "") +
                                (counts.wesentlich > 0
                                  ? ` · ${counts.wesentlich} wesentlich`
                                  : "")
                            : ""}
                        </p>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Container>
  );
}
