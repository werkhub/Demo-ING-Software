import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getProjectById } from "@/db/queries";
import { AbnahmeForm } from "../abnahme-form";

export const dynamic = "force-dynamic";

export default async function NewAbnahmePage({
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
          Neue Abnahme
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Wird sofort gespeichert. Mängel werden auf der Detail-Seite erfasst.
          Bei vereinbarter Vertragsstrafe ohne Vorbehalt → kritischer Vorgang
          mit Frist heute.
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/abnahme`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zur Abnahmen-Liste
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <AbnahmeForm projectId={id} mode="create" />
      </section>
    </Container>
  );
}
