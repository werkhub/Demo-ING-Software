import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import {
  getAufmasseByProject,
  getProjectById,
} from "@/db/queries";
import { NewArForm } from "./new-form";

export const dynamic = "force-dynamic";

export default async function NewArPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const aufmasse = await getAufmasseByProject(id);
  // Nur freigegebene oder schon abgerechnete Aufmaße — andere sind nicht
  // abrechnungsreif (Status-Lock).
  const eligible = aufmasse.filter(
    (a) => a.status === "freigegeben" || a.status === "abgerechnet"
  );

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Neue Ausgangsrechnung
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Wird als Entwurf angelegt. Bei Aufmaß-Bezug werden Positionen
          automatisch übernommen — sonst manuell auf der Detail-Seite erfassen.
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/ausgangsrechnungen`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zur Liste
          </Link>
        </div>
      </section>

      <section className="pb-16 max-w-3xl">
        <NewArForm
          projectId={id}
          defaultPartyAg={project.ag}
          defaultSecurityRetentionPercent={project.securityRetentionPercent}
          aufmasse={eligible.map((a) => ({
            id: a.id,
            name: a.name,
            totalApprovedNet: a.totalApprovedNet,
            status: a.status,
          }))}
        />
      </section>
    </Container>
  );
}
