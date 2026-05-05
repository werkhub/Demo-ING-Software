"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  MEMBER_ROLES,
  PermissionDeniedError,
} from "@/lib/auth/permissions";
import { requirePermission } from "@/lib/auth/permissions-session";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";

const setMatrixCellSchema = z.object({
  role: z.enum([
    "gf",
    "kalkulator",
    "polier",
    "buchhaltung",
    "viewer",
    "admin",
  ] as const),
  resource: z.enum([
    "team",
    "permissions",
    "projekte",
    "vorgaenge",
    "bautagebuch",
    "maengel",
    "plaene",
    "geraete",
    "stunden",
    "lv",
    "aufmass",
    "ausgangsrechnungen",
    "mahnungen",
    "eingangsrechnungen",
    "nachkalk",
    "datev",
    "finanzen",
  ] as const),
  action: z.enum(["read", "write"] as const),
  allowed: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export async function setMatrixCell(
  _prev: ActionResult<{
    role: string;
    resource: string;
    action: string;
    allowed: boolean;
  }> | null,
  formData: FormData
): Promise<
  ActionResult<{
    role: string;
    resource: string;
    action: string;
    allowed: boolean;
  }>
> {
  try {
    await requirePermission("permissions", "write");
  } catch (e) {
    if (e instanceof PermissionDeniedError) {
      return fail("Keine Berechtigung — nur Geschäftsleitung darf die Matrix bearbeiten.");
    }
    throw e;
  }

  const parsed = setMatrixCellSchema.safeParse({
    role: formData.get("role"),
    resource: formData.get("resource"),
    action: formData.get("action"),
    allowed: formData.get("allowed"),
  });
  if (!parsed.success) {
    return fail("Ungültige Eingabe.");
  }

  // Doppelter Defense-in-Depth: enums sind enum-validiert, aber wir prüfen
  // explizit gegen die Konstanten — falls jemand Enum + Konstanten driften lässt.
  if (
    !MEMBER_ROLES.includes(parsed.data.role) ||
    !PERMISSION_RESOURCES.includes(parsed.data.resource) ||
    !PERMISSION_ACTIONS.includes(parsed.data.action)
  ) {
    return fail("Unbekannter Permission-Schlüssel.");
  }

  const workspaceId = await getCurrentWorkspaceId();
  const { role, resource, action, allowed } = parsed.data;

  try {
    const [existing] = await db
      .select({ id: schema.permissionsMatrix.id })
      .from(schema.permissionsMatrix)
      .where(
        and(
          eq(schema.permissionsMatrix.workspaceId, workspaceId),
          eq(schema.permissionsMatrix.role, role),
          eq(schema.permissionsMatrix.resource, resource),
          eq(schema.permissionsMatrix.action, action)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(schema.permissionsMatrix)
        .set({ allowed, updatedAt: new Date() })
        .where(eq(schema.permissionsMatrix.id, existing.id));
    } else {
      await db.insert(schema.permissionsMatrix).values({
        id: genId("pm"),
        workspaceId,
        role,
        resource,
        action,
        allowed,
        updatedAt: new Date(),
      });
    }
  } catch {
    return fail("Speichern fehlgeschlagen.");
  }

  revalidatePath("/workspace/team/permissions");
  revalidatePath("/workspace/team");
  revalidatePath("/", "layout");
  return ok({ role, resource, action, allowed });
}
