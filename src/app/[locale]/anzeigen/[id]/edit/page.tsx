import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/container";
import { getAnzeige, getProjects } from "@/db/queries";
import { AnzeigeForm, type AnzeigePrefill } from "../../anzeige-form";

export const dynamic = "force-dynamic";

export default async function EditAnzeigePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const a = await getAnzeige(id);
  if (!a) notFound();
  if (a.status !== "entwurf") {
    // Versendete Anzeigen sind nicht editierbar — direkt zur Detail-Seite.
    redirect(`/anzeigen/${id}`);
  }

  const projects = await getProjects();

  const prefill: AnzeigePrefill = {
    projectId: a.projectId,
    kind: a.kind,
    title: a.title,
    subjectMatter: a.subjectMatter,
    bodyMarkdown: a.bodyMarkdown,
    recipientName: a.recipientName ?? undefined,
    recipientEmail: a.recipientEmail ?? undefined,
    recipientRole: a.recipientRole ?? undefined,
    obstructionStart: a.obstructionStart ?? undefined,
    estimatedDurationDays: a.estimatedDurationDays ?? undefined,
    estimatedExtraCost: a.estimatedExtraCost ?? undefined,
    causedBy: a.causedBy ?? undefined,
    concernAbout: a.concernAbout ?? undefined,
    potentialDamage: a.potentialDamage ?? undefined,
    proposedSolution: a.proposedSolution ?? undefined,
    notes: a.notes ?? undefined,
    sourceBautagebuchEntryId: a.sourceBautagebuchEntryId ?? undefined,
  };

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Anzeige bearbeiten
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          {a.title}
        </h1>
        <div className="mt-3">
          <Link
            href={`/anzeigen/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zur Detail-Ansicht
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <AnzeigeForm
          mode="edit"
          anzeigeId={id}
          projects={projects.map((p) => ({
            id: p.id,
            identifier: p.identifier,
            name: p.name,
            ag: p.ag,
          }))}
          prefill={prefill}
        />
      </section>
    </Container>
  );
}
