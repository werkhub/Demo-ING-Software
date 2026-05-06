import { Container } from "@/components/container";
import { RdgBanner } from "@/components/rdg-banner";
import { getProjects } from "@/db/queries";
import { getCurrentUserId, getCurrentWorkspace } from "@/lib/session";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { VoiceEntryClient } from "./voice-client";

export const dynamic = "force-dynamic";

export default async function BautagebuchSprachPage() {
  const [projects, workspace, userId] = await Promise.all([
    getProjects(),
    getCurrentWorkspace(),
    getCurrentUserId(),
  ]);

  const [user] = await db
    .select({ id: schema.users.id, name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return (
    <Container>
      <section className="pt-14 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Bautagebuch · Sprach-Eintrag · Demo
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Sprach-Eintrag
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Aufnahme starten, Tagesablauf in 1-2 Minuten einsprechen — die App
          extrahiert Anwesende, Arbeiten, Lieferungen, AG-Anordnungen und
          Sicherheitsvorfälle. Eintrag prüfen, signieren, gegen spätere
          Manipulation per Hash sperren.
        </p>
        <div className="mt-6">
          <RdgBanner />
        </div>
      </section>

      <VoiceEntryClient
        projects={projects.map((p) => ({
          id: p.id,
          identifier: p.identifier,
          name: p.name,
        }))}
        workspaceName={workspace.name}
        defaultAuthorName={user?.name || user?.email || "Bauleitung"}
      />

      <section className="pb-16">
        <div className="border-l-2 border-[color:var(--color-warning)] pl-5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
            Status
          </p>
          <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
            Web-Speech-API (Browser-nativ, kein Cloud-Roundtrip).
            Audio wird nicht gespeichert — nur das Transkript. Whisper-/
            Claude-basierte Tiefen-Extraktion folgt in Phase 1. Foto-Upload
            ist Platzhalter (Beweissicherungs-Modul folgt).
          </p>
        </div>
      </section>
    </Container>
  );
}
