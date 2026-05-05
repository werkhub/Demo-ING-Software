import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/container";
import { getProjectById } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import { SubplanerForm } from "./subplaner-form";

export const dynamic = "force-dynamic";

export default async function NewSubplanerPage({
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

  return (
    <Container size="narrow">
      <div className="pt-14 pb-16">
        <Link
          href={`/projekte/${id}/subplaner`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Zurück zur Subplaner-Liste
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Neue Subplaner-Vergabe · {project.identifier}
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          Fachplaner beauftragen
        </h1>
        <SubplanerForm projektId={id} />
      </div>
    </Container>
  );
}
