import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/container";
import { getProjectById } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import { BauwerkForm } from "./bauwerk-form";

export const dynamic = "force-dynamic";

export default async function NewBauwerkPage({
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
          href={`/projekte/${id}/bauwerke`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Zurück zur Bauwerksliste
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Neues Bauwerk · {project.identifier}
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          Bauwerk anlegen
        </h1>
        <p className="mt-3 text-base text-[color:var(--color-fg-muted)]">
          Stammdaten zum Bauwerk. Die Folge-Termine für Haupt- und Einfache
          Prüfung werden automatisch aus dem Datum der letzten Hauptprüfung
          gerechnet (DIN 1076).
        </p>
        <BauwerkForm projektId={id} />
      </div>
    </Container>
  );
}
