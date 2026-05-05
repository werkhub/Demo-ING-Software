"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  formDataToObject,
  workspaceBusinessSchema,
} from "@/lib/validation/schemas";

export async function updateWorkspaceBusiness(
  formData: FormData
): Promise<void> {
  const parsed = workspaceBusinessSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();
  await db
    .update(schema.workspaces)
    .set({
      iban: parsed.data.iban,
      bic: parsed.data.bic,
      bankName: parsed.data.bankName,
      taxId: parsed.data.taxId,
      vatId: parsed.data.vatId,
      address: parsed.data.address,
      email: parsed.data.email,
      phone: parsed.data.phone,
    })
    .where(eq(schema.workspaces.id, workspaceId));

  revalidatePath("/workspace");
  revalidatePath("/", "layout");
}
