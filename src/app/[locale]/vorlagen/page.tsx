import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getProjects } from "@/db/queries";
import { getCurrentUserId, getCurrentWorkspace } from "@/lib/session";
import { OPERATOR } from "@/lib/legal/contact";
import { VorlagenClient } from "./vorlagen-client";

export const dynamic = "force-dynamic";

export default async function Vorlagen() {
  const [projects, userId, workspace] = await Promise.all([
    getProjects(),
    getCurrentUserId(),
    getCurrentWorkspace(),
  ]);

  const [user] = await db
    .select({ name: schema.users.name, roleLabel: schema.users.roleLabel })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  return (
    <VorlagenClient
      projects={projects.map((p) => ({
        id: p.id,
        identifier: p.identifier,
        name: p.name,
        ag: p.ag,
        siteAddress: p.siteAddress,
        contractDate: p.contractDate,
      }))}
      authorName={user?.name ?? "Unbekannt"}
      authorRole={user?.roleLabel ?? null}
      operatorName={OPERATOR.legalName}
      workspaceRole={workspace.workspaceRole}
    />
  );
}
