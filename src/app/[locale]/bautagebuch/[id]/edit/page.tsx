import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import {
  getBautagebuchEntryById,
  getProjects,
} from "@/db/queries";
import { formatDateShort } from "@/lib/utils";
import { EditBautagebuchForm } from "./edit-form";

export const dynamic = "force-dynamic";

export default async function EditBautagebuchEntryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entry, projects] = await Promise.all([
    getBautagebuchEntryById(id),
    getProjects(),
  ]);
  if (!entry) notFound();

  return (
    <Container size="narrow">
      <div className="pt-14 pb-16">
        <Link
          href="/bautagebuch"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Bautagebuch
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Bautagebuch · Eintrag bearbeiten
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          Eintrag vom {formatDateShort(entry.entryDate)}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Erfasst von {entry.authorName}
        </p>

        <EditBautagebuchForm
          entry={entry}
          projects={projects.map((p) => ({
            id: p.id,
            identifier: p.identifier,
            name: p.name,
          }))}
        />
      </div>
    </Container>
  );
}
