import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getPlan, getProjectById } from "@/db/queries";
import { VersionForm } from "./version-form";

export const dynamic = "force-dynamic";

export default async function NewVersionPage({
  params,
}: {
  params: Promise<{ id: string; planId: string }>;
}) {
  const { id, planId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const plan = await getPlan(planId);
  if (!plan || plan.projektId !== id) notFound();

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {plan.planNr} — {plan.bezeichnung}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Neue Version
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Mit dem Upload setzt der Plan auf <em>Zur Freigabe</em> zurück, falls
          er bereits freigegeben war — bestehende Freigaben gelten nur für die
          alte Version.
        </p>
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
        <VersionForm projektId={id} planId={planId} />
      </section>
    </Container>
  );
}
