import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { GeraetForm } from "../../geraet-form";
import { updateGeraet } from "../../actions";

export const dynamic = "force-dynamic";

export default async function EditGeraetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspaceId = await getCurrentWorkspaceId();
  const [geraet] = await db
    .select()
    .from(schema.geraete)
    .where(
      and(
        eq(schema.geraete.id, id),
        eq(schema.geraete.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!geraet) notFound();

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Betriebsmittel · {geraet.bezeichnung}
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          Gerät bearbeiten
        </h1>
        <div className="mt-3">
          <Link
            href={`/geraete/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Gerät
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <GeraetForm mode="edit" action={updateGeraet} initial={geraet} />
      </section>
    </Container>
  );
}
