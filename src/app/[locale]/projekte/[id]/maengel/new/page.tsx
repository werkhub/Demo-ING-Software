import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getAbnahmenByProject, getProjectById } from "@/db/queries";
import { MANGEL_PHASE_LABEL } from "@/lib/maengel";
import { formatDateShort } from "@/lib/utils";
import type { MangelPhase } from "@/db/schema";
import { MangelCreateForm } from "./mangel-create-form";

export const dynamic = "force-dynamic";

function isMangelPhase(value: string | undefined): value is MangelPhase {
  return value === "ausfuehrung" || value === "abnahme" || value === "gewaehrleistung";
}

export default async function MaengelNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ phase?: string; abnahmeId?: string }>;
}) {
  const { id } = await params;
  const { phase: phaseRaw, abnahmeId: abnahmeIdRaw } = await searchParams;
  const project = await getProjectById(id);
  if (!project) notFound();

  const phaseDefault: MangelPhase = isMangelPhase(phaseRaw)
    ? phaseRaw
    : project.abnahmeDate
      ? "gewaehrleistung"
      : "ausfuehrung";
  const abnahmen = await getAbnahmenByProject(id);

  return (
    <Container>
      <section className="pt-14 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Neuer Mangel
        </h1>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/maengel`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zur Mängel-Liste
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <MangelCreateForm
          projectId={id}
          defaultPhase={phaseDefault}
          defaultAbnahmeId={abnahmeIdRaw ?? null}
          abnahmen={abnahmen.map((a) => ({
            id: a.id,
            label: `${formatDateShort(a.abnahmeDate)} · ${a.kind}${a.scope ? ` · ${a.scope}` : ""}`,
          }))}
          phaseOptions={(["ausfuehrung", "abnahme", "gewaehrleistung"] as MangelPhase[]).map(
            (p) => ({ value: p, label: MANGEL_PHASE_LABEL[p] })
          )}
        />
      </section>
    </Container>
  );
}
