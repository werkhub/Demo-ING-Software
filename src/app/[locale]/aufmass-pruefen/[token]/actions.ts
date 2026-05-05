"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import {
  formDataToObject,
  prueferZeileStatusSchema,
} from "@/lib/validation/schemas";
import {
  isTokenValid,
  statusToLogAction,
} from "@/lib/aufmass-pruefer";
import { computeAufmassTotals } from "@/lib/aufmass";
import { getByToken } from "@/db/queries";

/**
 * Public-Action: Prüfer aktualisiert Zeilen-Status (zugestimmt / gekuerzt /
 * bestritten). KEIN getCurrentWorkspaceId — Berechtigung kommt aus dem Token.
 *
 * Erlaubt nur, wenn:
 *   - Token existiert, nicht widerrufen, nicht abgelaufen
 *   - Aufmaß-Status ist „geprueft" (vor „eingereicht" → noch keine Prüfung,
 *     ab „freigegeben" → Aufmaß ist final, keine Änderungen mehr)
 *   - Zeile gehört zum Aufmaß des Tokens
 *
 * Side-Effect: Schreibt access_log + recomputed totals.
 */
export async function prueferUpdateZeileStatus(
  formData: FormData
): Promise<void> {
  const parsed = prueferZeileStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }

  const ctx = await getByToken(parsed.data.token);
  if (!ctx) throw new Error("Token nicht gefunden.");
  if (!isTokenValid(ctx.token)) throw new Error("Token ungültig oder abgelaufen.");
  if (ctx.aufmass.status !== "geprueft") {
    throw new Error('Prüfung nur möglich, wenn das Aufmaß im Status „Geprüft" ist.');
  }

  // Zeile muss zum selben Aufmaß gehören.
  const [z] = await db
    .select()
    .from(schema.aufmassZeilen)
    .where(eq(schema.aufmassZeilen.id, parsed.data.zeileId))
    .limit(1);
  if (!z || z.aufmassId !== ctx.aufmass.id) {
    throw new Error("Zeile nicht gefunden.");
  }

  let approvedQuantity: number | null = null;
  let approvedTotal: number | null = null;
  if (parsed.data.status === "gekuerzt") {
    approvedQuantity = parsed.data.approvedQuantity;
    if (approvedQuantity === null) {
      throw new Error('Bei „Gekürzt" muss die anerkannte Menge angegeben werden.');
    }
    if (z.unitPrice !== null) {
      approvedTotal =
        Math.round(approvedQuantity * z.unitPrice * 100) / 100;
    }
  }

  await db
    .update(schema.aufmassZeilen)
    .set({
      status: parsed.data.status,
      approvedQuantity,
      approvedTotal,
      updatedAt: new Date(),
    })
    .where(eq(schema.aufmassZeilen.id, z.id));

  // Totals neu berechnen (workspace-übergreifend, da Public-Action; reicht über aufmassId).
  const allZeilen = await db
    .select()
    .from(schema.aufmassZeilen)
    .where(eq(schema.aufmassZeilen.aufmassId, ctx.aufmass.id));
  const totals = computeAufmassTotals(allZeilen);
  await db
    .update(schema.aufmass)
    .set({
      totalNet: totals.totalNet,
      totalApprovedNet: totals.totalApprovedNet,
      updatedAt: new Date(),
    })
    .where(eq(schema.aufmass.id, ctx.aufmass.id));

  // Access-Log: nur Zeitstempel + Token-ID + Aktion + Zeile (keine IP).
  await db.insert(schema.aufmassPrueferAccessLog).values({
    id: genId("paclog"),
    workspaceId: ctx.token.workspaceId,
    tokenId: ctx.token.id,
    action: statusToLogAction(parsed.data.status),
    aufmassZeileId: z.id,
  });

  revalidatePath(`/aufmass-pruefen/${parsed.data.token}`);
  revalidatePath(
    `/projekte/${ctx.aufmass.projectId}/aufmass/${ctx.aufmass.id}`
  );
}

/**
 * Public-Action: Auto-Logging beim Seitenaufruf. Idempotent „best effort" —
 * Fehler werden geschluckt (Log-Eintrag darf das Anzeigen nie verhindern).
 */
export async function prueferLogView(token: string): Promise<void> {
  if (!token || token.length < 10) return;
  try {
    const ctx = await getByToken(token);
    if (!ctx) return;
    if (!isTokenValid(ctx.token)) return;
    await db.insert(schema.aufmassPrueferAccessLog).values({
      id: genId("paclog"),
      workspaceId: ctx.token.workspaceId,
      tokenId: ctx.token.id,
      action: "view",
      aufmassZeileId: null,
    });
  } catch {
    // best effort — niemals werfen
  }
}
