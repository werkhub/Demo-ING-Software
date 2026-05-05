import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getLvByProject, getProjectById } from "@/db/queries";
import { GaebImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default async function GaebImportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const existingLv = await getLvByProject(id);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          GAEB-Datei importieren
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Datei auswählen und hochladen — wir parsen die Hierarchie, Mengen,
          Einheiten und Preise. Status wird aus dem Dokumenttyp abgeleitet
          (X83 → Angebot, X84 → Auftrag).
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/lv`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum LV
          </Link>
        </div>
      </section>

      <section className="pb-16 max-w-2xl">
        <GaebImportForm projectId={id} hasExistingLv={!!existingLv} />
      </section>
    </Container>
  );
}
