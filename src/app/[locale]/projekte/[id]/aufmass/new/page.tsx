import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/container";
import { getLvByProject, getProjectById } from "@/db/queries";
import { NewAufmassForm } from "./new-form";

export const dynamic = "force-dynamic";

export default async function NewAufmassPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const lv = await getLvByProject(id);
  if (!lv) {
    redirect(`/projekte/${id}/lv`);
  }

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Neues Aufmaß
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Wird als Entwurf angelegt. Zeilen werden auf der Detail-Seite
          erfasst — eine Zeile pro LV-Position oder als freier Eintrag.
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/aufmass`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zur Liste
          </Link>
        </div>
      </section>

      <section className="pb-16 max-w-2xl">
        <NewAufmassForm projectId={id} lvId={lv.id} />
      </section>
    </Container>
  );
}
