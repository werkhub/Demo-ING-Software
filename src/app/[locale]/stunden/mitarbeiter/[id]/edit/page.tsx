import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { MitarbeiterForm } from "../../mitarbeiter-form";
import { DeactivateButton } from "./deactivate-button";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function EditMitarbeiterPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const workspaceId = await getCurrentWorkspaceId();
  const [ma] = await db
    .select()
    .from(schema.mitarbeiter)
    .where(
      and(
        eq(schema.mitarbeiter.id, id),
        eq(schema.mitarbeiter.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!ma) notFound();

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Stunden · Mitarbeiter · Bearbeiten
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {ma.name}
        </h1>
      </section>

      <MitarbeiterForm mode="edit" ma={ma} />

      {ma.aktiv ? (
        <div className="mt-10 pt-6 border-t border-[color:var(--color-border)]">
          <p className="text-xs text-[color:var(--color-fg-muted)] mb-3">
            Mitarbeiter inaktiv setzen statt löschen — historische Stunden
            bleiben erhalten.
          </p>
          <DeactivateButton id={ma.id} />
        </div>
      ) : null}

      <p className="mt-10 text-xs text-[color:var(--color-fg-muted)]">
        <Link
          href="/stunden/mitarbeiter"
          className="hover:text-[color:var(--color-accent)]"
        >
          ← Zurück zur Liste
        </Link>
      </p>
    </Container>
  );
}
