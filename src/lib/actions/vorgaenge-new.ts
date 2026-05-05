"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentUserId, getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { saveUpload } from "@/lib/storage";
import { validateUploadFile } from "@/lib/storage/validation";
import {
  classifyEingang,
  computeVorgangRiskScore,
} from "@/lib/vorgang";
import { getAuditContext, logChange } from "@/lib/audit/log";

/**
 * Eine-Schritt-Anlage: Datei hochladen → Vorgang automatisch erzeugen → Auto-Klassifikation
 * → Detail-Seite öffnen. Wird vom /vorgaenge/new-Flow genutzt.
 */
export async function createVorgangFromUpload(formData: FormData): Promise<void> {
  const file = formData.get("file");
  const projectIdRaw = formData.get("projectId");
  const projectId =
    typeof projectIdRaw === "string" && projectIdRaw.length > 0 ? projectIdRaw : null;
  const titleOverride = formData.get("title");

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Bitte eine Datei auswählen.");
  }
  const validation = validateUploadFile({
    name: file.name,
    size: file.size,
    type: file.type,
  });
  if (!validation.ok) throw new Error(validation.reason);

  const workspaceId = await getCurrentWorkspaceId();
  const userId = await getCurrentUserId();
  const vorgangId = genId("vg");

  const buf = new Uint8Array(await file.arrayBuffer());

  // Klassifikation auf Basis des Dateinamens (OCR fehlt im POC).
  const classification = classifyEingang({ fileName: file.name });

  const initialTitle =
    typeof titleOverride === "string" && titleOverride.trim().length > 0
      ? titleOverride.trim().slice(0, 200)
      : file.name.replace(/\.[^.]+$/, "").slice(0, 200) || "Neuer Vorgang";

  const initialCategory =
    classification.confidence >= 0.55 ? classification.category : "sonstiges";

  const riskScore = computeVorgangRiskScore({
    category: initialCategory,
    status: "offen",
    dueDate: null,
    documentCount: 1,
  });

  await db.insert(schema.vorgaenge).values({
    id: vorgangId,
    workspaceId,
    projectId,
    title: initialTitle,
    category: initialCategory,
    status: "offen",
    riskScore,
    createdBy: userId,
  });

  const stored = await saveUpload({
    bucket: "vorgaenge",
    workspaceId,
    entityId: vorgangId,
    fileName: file.name,
    data: buf,
  });

  await db.insert(schema.vorgangDocuments).values({
    id: genId("vd"),
    vorgangId,
    fileName: stored.fileName,
    mimeType: file.type || "application/octet-stream",
    fileSize: stored.fileSize,
    storagePath: stored.storagePath,
    uploadedBy: userId,
  });

  await db.insert(schema.vorgangAnalysisSteps).values({
    id: genId("vs"),
    vorgangId,
    stepIndex: 0,
    kind: "klassifikation",
    payloadJson: JSON.stringify(classification),
    citations: "[]",
  });

  await db.insert(schema.vorgangAuditLog).values([
    {
      id: genId("au"),
      vorgangId,
      actorId: userId,
      action: "created",
      payloadJson: JSON.stringify({ title: initialTitle, source: "dropzone" }),
    },
    {
      id: genId("au"),
      vorgangId,
      actorId: userId,
      action: "document_uploaded",
      payloadJson: JSON.stringify({ fileName: stored.fileName }),
    },
    {
      id: genId("au"),
      vorgangId,
      actorId: userId,
      action: "classified",
      payloadJson: JSON.stringify(classification),
    },
  ]);

  const [created] = await db
    .select()
    .from(schema.vorgaenge)
    .where(eq(schema.vorgaenge.id, vorgangId))
    .limit(1);
  await logChange({
    workspaceId,
    entityType: "vorgang",
    entityId: vorgangId,
    action: "create",
    after: created,
    ctx: await getAuditContext(userId),
  });

  revalidatePath("/vorgaenge");
  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect(`/vorgaenge/${vorgangId}`);
}
