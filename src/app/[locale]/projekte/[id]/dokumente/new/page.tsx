import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getProjectById } from "@/db/queries";
import { DokumentForm } from "../dokument-form";

export const dynamic = "force-dynamic";

export default async function NewDokumentPage({
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
          Dokument hochladen
        </h1>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/dokumente`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            zurück zur Dokumenten-Liste
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <DokumentForm projektId={id} />
      </section>
    </Container>
  );
}
