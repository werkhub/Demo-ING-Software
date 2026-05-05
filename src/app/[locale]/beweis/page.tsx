import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getProjects } from "@/db/queries";
import { BeweisClient } from "./beweis-client";

export const dynamic = "force-dynamic";

export default async function Beweissicherung() {
  const workspaceId = await getCurrentWorkspaceId();
  const [projects, checklists] = await Promise.all([
    getProjects(),
    db
      .select({
        projectId: schema.beweisChecklists.projectId,
        anlass: schema.beweisChecklists.anlass,
        checksState: schema.beweisChecklists.checksState,
        notes: schema.beweisChecklists.notes,
      })
      .from(schema.beweisChecklists)
      .where(eq(schema.beweisChecklists.workspaceId, workspaceId)),
  ]);

  return (
    <BeweisClient
      projects={projects.map((p) => ({
        id: p.id,
        identifier: p.identifier,
        name: p.name,
      }))}
      existing={checklists}
    />
  );
}
