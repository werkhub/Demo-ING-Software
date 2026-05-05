import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/container";
import { getPlan, getProjectById, getVersion } from "@/db/queries";
import { FreigabeForm } from "./freigabe-form";

export const dynamic = "force-dynamic";

export default async function NewFreigabePage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const plan = await getPlan(planId);
  if (!plan || plan.projektId !== id) notFound();
  if (!plan.aktuelleVersionId) {
    redirect(`/projekte/${id}/plaene/${planId}/version/new`);
  }
  const version = await getVersion(plan.aktuelleVersionId);
  if (!version) notFound();

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {plan.planNr} — {plan.bezeichnung}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Freigabe anfordern
        </h1>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/plaene/${planId}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            zurück zum Plan
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <FreigabeForm
          projektId={id}
          planId={planId}
          planVersionId={version.id}
          versionNr={version.versionNr}
        />
      </section>
    </Container>
  );
}
