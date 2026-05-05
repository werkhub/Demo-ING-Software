"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspace,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { genId } from "@/lib/utils";
import { categorizeQuery } from "@/lib/classify";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  formDataToObject,
  queryInputSchema,
} from "@/lib/validation/schemas";
import { getLegalAssistantProvider } from "@/lib/recht-assistent/provider";
import { parseDisciplines } from "@/lib/workspace/disciplines";

export async function createQuery(
  _prev: ActionResult<{ category: string }> | null,
  formData: FormData
): Promise<ActionResult<{ category: string }>> {
  const parsed = queryInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [workspaceId, userId, workspace] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
    getCurrentWorkspace(),
  ]);

  const { question, projectId } = parsed.data;

  // Workspace-Check für projectId
  if (projectId) {
    const [project] = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, projectId),
          eq(schema.projects.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!project) {
      return fieldFail({
        projectId: ["Projekt gehört nicht zum aktuellen Workspace."],
      });
    }
  }

  const category = categorizeQuery(question);

  // Provider-Aufruf (heute Mock, später Claude — gleicher Vertrag).
  let response: string;
  try {
    const provider = await getLegalAssistantProvider();
    const result = await provider.answer({
      question,
      role: workspace.workspaceRole,
      disciplines: parseDisciplines(workspace.disciplinesJson),
      clientFocus: workspace.clientFocus,
      projectId,
      category,
    });
    response = result.markdown;
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unbekannter Provider-Fehler";
    return fail(`Recht-Assistent nicht verfügbar: ${msg}`);
  }

  try {
    await db.insert(schema.queries).values({
      id: genId("q"),
      workspaceId,
      userId,
      projectId,
      question,
      category,
      response,
    });
  } catch {
    return fail("Anfrage konnte nicht gespeichert werden.");
  }

  revalidatePath("/recht-assistent");
  revalidatePath("/");
  return ok({ category });
}
