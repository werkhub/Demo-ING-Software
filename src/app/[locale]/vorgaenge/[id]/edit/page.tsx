import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getProjects, getVorgangById } from "@/db/queries";
import { VorgangEditForm } from "./vorgang-edit-form";

export const dynamic = "force-dynamic";

export default async function VorgangEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const vorgang = await getVorgangById(id);
  if (!vorgang) notFound();

  const workspaceId = await getCurrentWorkspaceId();
  const [projects, users] = await Promise.all([
    getProjects(),
    db
      .select({ id: schema.users.id, name: schema.users.name })
      .from(schema.users)
      .where(eq(schema.users.workspaceId, workspaceId)),
  ]);

  return (
    <Container>
      <section className="pt-14 pb-8">
        <Link
          href={`/vorgaenge/${id}`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Zurück zum Vorgang
        </Link>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
          Vorgang bearbeiten
        </h1>
      </section>
      <section className="pb-16">
        <VorgangEditForm
          vorgang={vorgang}
          projects={projects.map((p) => ({
            id: p.id,
            identifier: p.identifier,
            name: p.name,
          }))}
          users={users}
        />
      </section>
    </Container>
  );
}
