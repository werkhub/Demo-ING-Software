import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getProjectById } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import {
  istUeberfaellig,
  tageBisPruefung,
  zustandsKlasse,
  ZUSTANDS_KLASSE_LABEL,
} from "@/lib/bauwerkspruefung/din1076";
import { formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

const BAUWERKSART_LABEL: Record<string, string> = {
  bruecke: "Brücke",
  tunnel: "Tunnel",
  stuetzmauer: "Stützmauer",
  laermschutzwand: "Lärmschutzwand",
  ueberfuehrung: "Überführung",
  unterfuehrung: "Unterführung",
  sonstiges: "Sonstiges",
};

export default async function BauwerkeListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [project, workspace] = await Promise.all([
    getProjectById(id),
    getCurrentWorkspace(),
  ]);
  if (!project) notFound();
  if (workspace.workspaceRole !== "ingenieurbuero") {
    redirect(`/projekte/${id}`);
  }

  const bauwerke = await db
    .select()
    .from(schema.bauwerke)
    .where(eq(schema.bauwerke.projektId, id));

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
            Bauwerksprüfung (DIN 1076)
          </h1>
          <Link
            href={`/projekte/${id}/bauwerke/new`}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Neues Bauwerk
          </Link>
        </div>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Brücken, Tunnel, Stützmauern und vergleichbare Ingenieurbauten mit
          Hauptprüfung (alle 6 Jahre), Einfacher Prüfung (alle 3 Jahre) und
          jährlicher Besichtigung.
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

      {bauwerke.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch keine Bauwerke erfasst.
            </p>
          </div>
        </section>
      ) : (
        <section className="pb-16">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {bauwerke.map((bw) => {
              const tageHaupt = tageBisPruefung(bw.naechsteHauptpruefungAm);
              const tageEinf = tageBisPruefung(bw.naechsteEinfachePruefungAm);
              const ueberfaellig =
                istUeberfaellig(bw.naechsteHauptpruefungAm) ||
                istUeberfaellig(bw.naechsteEinfachePruefungAm);
              const klasse =
                bw.aktuelleZustandsnote !== null
                  ? zustandsKlasse(bw.aktuelleZustandsnote)
                  : null;
              return (
                <li key={bw.id} className="py-5">
                  <Link
                    href={`/projekte/${id}/bauwerke/${bw.id}`}
                    className="block group"
                  >
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-mono text-sm text-[color:var(--color-fg)]">
                            {bw.bauwerksnummer}
                          </p>
                          <span className="rounded-full border border-[color:var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                            {BAUWERKSART_LABEL[bw.bauwerksart] ?? bw.bauwerksart}
                          </span>
                          {ueberfaellig ? (
                            <span className="rounded-full border border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)] px-2 py-0.5 text-[10px] uppercase tracking-wider">
                              überfällig
                            </span>
                          ) : null}
                          {klasse ? (
                            <span className="rounded-full border border-[color:var(--color-border)] px-2 py-0.5 text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                              Note {bw.aktuelleZustandsnote?.toFixed(1)} ·{" "}
                              {ZUSTANDS_KLASSE_LABEL[klasse]}
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 text-base font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                          {bw.bezeichnung}
                        </p>
                        <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                          {bw.baujahr ? `Bj. ${bw.baujahr} · ` : ""}
                          Nächste Hauptprüfung{" "}
                          {bw.naechsteHauptpruefungAm
                            ? `${formatDateShort(bw.naechsteHauptpruefungAm)} (${tageHaupt && tageHaupt < 0 ? `${Math.abs(tageHaupt)} d überfällig` : `${tageHaupt ?? "?"} d`})`
                            : "—"}
                          {" · Einfache "}
                          {bw.naechsteEinfachePruefungAm
                            ? `${formatDateShort(bw.naechsteEinfachePruefungAm)} (${tageEinf && tageEinf < 0 ? `${Math.abs(tageEinf)} d überfällig` : `${tageEinf ?? "?"} d`})`
                            : "—"}
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
