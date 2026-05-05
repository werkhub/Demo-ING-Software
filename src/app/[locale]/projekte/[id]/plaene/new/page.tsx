import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getProjectById } from "@/db/queries";
import { PlanForm } from "../plan-form";

export const dynamic = "force-dynamic";

export default async function NewPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Neuer Plan
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Stammdaten + optionale Initialversion (v1). Weitere Versionen können
          später auf der Detail-Seite hochgeladen werden.
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/plaene`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            zurück zur Plan-Liste
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <PlanForm projektId={id} />
      </section>
    </Container>
  );
}
