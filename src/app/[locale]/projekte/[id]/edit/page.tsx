import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getProjectById } from "@/db/queries";
import { EditProjectForm } from "./edit-project-form";

export const dynamic = "force-dynamic";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();

  return (
    <Container size="narrow">
      <div className="pt-14 pb-16">
        <Link
          href={`/projekte/${id}`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Zurück zum Projekt
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Bearbeiten · {project.identifier}
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          {project.name}
        </h1>

        <EditProjectForm project={project} />
      </div>
    </Container>
  );
}
