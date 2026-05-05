import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { Container } from "@/components/container";
import {
  getBautagebuchEntries,
  getProjects,
} from "@/db/queries";
import { AnzeigeForm, type AnzeigePrefill } from "../anzeige-form";
import type { AnzeigeKind } from "@/db/schema";

export const dynamic = "force-dynamic";

const VALID_KINDS: AnzeigeKind[] = ["behinderung", "bedenken"];

function isAnzeigeKind(v: string | undefined): v is AnzeigeKind {
  return !!v && (VALID_KINDS as string[]).includes(v);
}

export default async function NewAnzeigePage({
  searchParams,
}: {
  searchParams: Promise<{
    kind?: string;
    projectId?: string;
    fromBautagebuch?: string;
  }>;
}) {
  const { kind, projectId, fromBautagebuch } = await searchParams;
  const projects = await getProjects();
  if (projects.length === 0) {
    redirect("/projekte/new");
  }

  let prefill: AnzeigePrefill = {
    kind: isAnzeigeKind(kind) ? kind : "behinderung",
    projectId: projectId ?? undefined,
  };

  // Pre-fill aus Bautagebuch-Eintrag
  if (fromBautagebuch) {
    const entries = await getBautagebuchEntries();
    const entry = entries.find((e) => e.id === fromBautagebuch);
    if (entry) {
      prefill = {
        ...prefill,
        projectId: entry.projectId ?? prefill.projectId,
        kind: prefill.kind ?? (entry.category === "bedenken" ? "bedenken" : "behinderung"),
        title:
          (prefill.kind === "bedenken" ? "Bedenken" : "Behinderung") +
          ` — ${entry.entryDate}`,
        subjectMatter: entry.text.slice(0, 1500),
        obstructionStart:
          prefill.kind === "behinderung" || prefill.kind === undefined
            ? entry.entryDate
            : undefined,
        sourceBautagebuchEntryId: entry.id,
      };
    }
  }

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Compliance-Pflichten · § 6 / § 4 VOB/B
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          Neue Anzeige
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
          Wird zunächst als Entwurf gespeichert. Versand und Workflow
          (Bestätigung, Antwort, Erledigung) auf der Detail-Seite.
        </p>
        <div className="mt-3">
          <Link
            href="/anzeigen"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zur Übersicht
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <AnzeigeForm
          mode="create"
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
