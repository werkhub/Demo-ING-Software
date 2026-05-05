"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { PermissionDeniedError } from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/permissions-session";
import { getCurrentWorkspaceId } from "@/lib/session";
import { MEMBER_ROLES } from "@/lib/auth/permissions";
import type { MemberRole } from "@/db/schema";

const memberRoleSchema = z.enum([
  "gf",
  "kalkulator",
  "polier",
  "buchhaltung",
  "viewer",
  "admin",
] as const);

const updateMemberRoleSchema = z.object({
  userId: z.string().min(1),
  role: memberRoleSchema,
});

export async function updateMemberRole(
  _prev: ActionResult<{ userId: string; role: MemberRole }> | null,
  formData: FormData
): Promise<ActionResult<{ userId: string; role: MemberRole }>> {
  try {
    await requirePermission("team", "write");
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return fail("Keine Berechtigung — nur Geschäftsleitung darf Rollen ändern.");
    }
    throw e;
  }

  const parsed = updateMemberRoleSchema.safeParse({
    userId: formData.get("userId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return fail("Ungültige Eingabe.");
  }

  // Sicherstellen, dass der Ziel-User im aktuellen Workspace liegt
  const workspaceId = await getCurrentWorkspaceId();
  const [target] = await db
    .select({ id: schema.users.id, workspaceId: schema.users.workspaceId })
    .from(schema.users)
    .where(eq(schema.users.id, parsed.data.userId))
    .limit(1);

  if (!target || target.workspaceId !== workspaceId) {
    return fail("Benutzer nicht gefunden.");
  }

  if (!MEMBER_ROLES.includes(parsed.data.role)) {
    return fail("Unbekannte Rolle.");
  }

  try {
    await db
      .update(schema.users)
      .set({ memberRole: parsed.data.role })
      .where(eq(schema.users.id, parsed.data.userId));
  } catch {
    return fail("Rolle konnte nicht gespeichert werden.");
  }

  revalidatePath("/workspace/team");
  revalidatePath("/", "layout");
  return ok({ userId: parsed.data.userId, role: parsed.data.role });
}
