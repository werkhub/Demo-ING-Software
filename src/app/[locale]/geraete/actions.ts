"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { hasOverlap, isoToday } from "@/lib/geraete";
import { formDataToObject } from "@/lib/validation/schemas";
import {
  dispositionInputSchema,
  dispositionStatusUpdateSchema,
  geraeteIdSchema,
  geraeteInputSchema,
  geraeteUpdateSchema,
  wartungInputSchema,
  wartungMarkDoneSchema,
} from "@/lib/validation/geraete";

async function loadGeraetOrThrow(id: string) {
  const workspaceId = await getCurrentWorkspaceId();
  const [row] = await db
    .select()
    .from(schema.geraete)
    .where(
      and(
        eq(schema.geraete.id, id),
        eq(schema.geraete.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) throw new Error("Gerät nicht gefunden.");
  return row;
}

/* ============== GERÄT (Stamm) ============== */

export async function createGeraet(formData: FormData): Promise<void> {
  const parsed = geraeteInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }

  const workspaceId = await getCurrentWorkspaceId();
  const id = genId("geraet");

  await db.insert(schema.geraete).values({
    id,
    workspaceId,
    kategorie: parsed.data.kategorie,
    bezeichnung: parsed.data.bezeichnung,
    inventarNr: parsed.data.inventarNr,
    hersteller: parsed.data.hersteller,
    baujahr: parsed.data.baujahr,
    status: parsed.data.status,
    eigentum: parsed.data.eigentum,
    mietPartner: parsed.data.mietPartner,
    mietBisDatum: parsed.data.mietBisDatum,
    kaufdatum: parsed.data.kaufdatum,
    kaufpreisCents: parsed.data.kaufpreisCents,
    currentValueCents: parsed.data.currentValueCents,
    notes: parsed.data.notes,
  });

  revalidatePath("/geraete");
  redirect(`/geraete/${id}`);
}

export async function updateGeraet(formData: FormData): Promise<void> {
  const parsed = geraeteUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  await loadGeraetOrThrow(parsed.data.id);

  await db
    .update(schema.geraete)
    .set({
      kategorie: parsed.data.kategorie,
      bezeichnung: parsed.data.bezeichnung,
      inventarNr: parsed.data.inventarNr,
      hersteller: parsed.data.hersteller,
      baujahr: parsed.data.baujahr,
      status: parsed.data.status,
      eigentum: parsed.data.eigentum,
      mietPartner: parsed.data.mietPartner,
      mietBisDatum: parsed.data.mietBisDatum,
      kaufdatum: parsed.data.kaufdatum,
      kaufpreisCents: parsed.data.kaufpreisCents,
      currentValueCents: parsed.data.currentValueCents,
      notes: parsed.data.notes,
      updatedAt: new Date(),
    })
    .where(eq(schema.geraete.id, parsed.data.id));

  revalidatePath("/geraete");
  revalidatePath(`/geraete/${parsed.data.id}`);
  redirect(`/geraete/${parsed.data.id}`);
}

export async function deleteGeraet(formData: FormData): Promise<void> {
  const parsed = geraeteIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Geräte-ID fehlt.");
  await loadGeraetOrThrow(parsed.data.id);

  await db.delete(schema.geraete).where(eq(schema.geraete.id, parsed.data.id));

  revalidatePath("/geraete");
  redirect("/geraete");
}

/* ============== DISPOSITION ============== */

export async function createDisposition(formData: FormData): Promise<void> {
  const parsed = dispositionInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();

  // Workspace-Sicherung: Gerät muss zum Workspace gehören.
  const geraet = await loadGeraetOrThrow(parsed.data.geraetId);
  if (geraet.status === "ausgemustert" || geraet.status === "defekt") {
    throw new Error(
      `Gerät ist als '${geraet.status}' markiert und kann nicht disponiert werden.`
    );
  }

  // Konflikt-Check: keine überlappende geplant/aktiv-Disposition für selbes Gerät.
  const existing = await db
    .select({
      id: schema.geraeteDisposition.id,
      vonDatum: schema.geraeteDisposition.vonDatum,
      bisDatum: schema.geraeteDisposition.bisDatum,
      status: schema.geraeteDisposition.status,
    })
    .from(schema.geraeteDisposition)
    .where(eq(schema.geraeteDisposition.geraetId, parsed.data.geraetId));

  const conflict = hasOverlap(existing, {
    vonDatum: parsed.data.vonDatum,
    bisDatum: parsed.data.bisDatum,
  });
  if (conflict) {
    throw new Error(
      `Konflikt: Gerät ist von ${conflict.vonDatum} bis ${conflict.bisDatum} bereits disponiert (#${conflict.id}).`
    );
  }

  const id = genId("dispo");
  await db.insert(schema.geraeteDisposition).values({
    id,
    workspaceId,
    geraetId: parsed.data.geraetId,
    projektId: parsed.data.projektId,
    vonDatum: parsed.data.vonDatum,
    bisDatum: parsed.data.bisDatum,
    vonZeit: parsed.data.vonZeit,
    bisZeit: parsed.data.bisZeit,
    polierUserId: parsed.data.polierUserId,
    status: parsed.data.status,
    notes: parsed.data.notes,
  });

  // Status des Geräts hochsetzen, wenn Disposition heute aktiv ist
  // (vonDatum ≤ heute ≤ bisDatum) — sonst bleibt 'verfuegbar'.
  const today = isoToday();
  if (
    parsed.data.vonDatum <= today &&
    today <= parsed.data.bisDatum &&
    geraet.status === "verfuegbar" &&
    parsed.data.status !== "storniert"
  ) {
    await db
      .update(schema.geraete)
      .set({ status: "disponiert", updatedAt: new Date() })
      .where(eq(schema.geraete.id, parsed.data.geraetId));
  }

  revalidatePath(`/geraete/${parsed.data.geraetId}`);
  revalidatePath("/geraete");
  redirect(`/geraete/${parsed.data.geraetId}`);
}

export async function updateDispositionStatus(
  formData: FormData
): Promise<void> {
  const parsed = dispositionStatusUpdateSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) throw new Error("Ungültiger Status.");
  const workspaceId = await getCurrentWorkspaceId();

  const [dispo] = await db
    .select()
    .from(schema.geraeteDisposition)
    .where(
      and(
        eq(schema.geraeteDisposition.id, parsed.data.id),
        eq(schema.geraeteDisposition.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!dispo) throw new Error("Disposition nicht gefunden.");

  await db
    .update(schema.geraeteDisposition)
    .set({ status: parsed.data.status })
    .where(eq(schema.geraeteDisposition.id, parsed.data.id));

  // Wenn jetzt zurueck/storniert: prüfen, ob noch eine andere aktive Dispo
  // für dieses Gerät existiert, sonst Gerät auf 'verfuegbar' zurücksetzen.
  if (parsed.data.status === "zurueck" || parsed.data.status === "storniert") {
    const today = isoToday();
    const [stillActive] = await db
      .select({ id: schema.geraeteDisposition.id })
      .from(schema.geraeteDisposition)
      .where(
        and(
          eq(schema.geraeteDisposition.geraetId, dispo.geraetId),
          ne(schema.geraeteDisposition.id, dispo.id),
          ne(schema.geraeteDisposition.status, "zurueck"),
          ne(schema.geraeteDisposition.status, "storniert")
        )
      )
      .limit(1);
    if (!stillActive) {
      await db
        .update(schema.geraete)
        .set({ status: "verfuegbar", updatedAt: new Date() })
        .where(
          and(
            eq(schema.geraete.id, dispo.geraetId),
            eq(schema.geraete.status, "disponiert")
          )
        );
    }
    // Suppress unused-var-Warnung — `today` wird bewusst geladen, aber für
    // diese Logik nicht weiter ausgewertet (Status-Override ist konservativ).
    void today;
  }

  revalidatePath(`/geraete/${dispo.geraetId}`);
  revalidatePath("/geraete");
}

/* ============== WARTUNG ============== */

export async function createWartung(formData: FormData): Promise<void> {
  const parsed = wartungInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();
  await loadGeraetOrThrow(parsed.data.geraetId);

  const id = genId("wartung");
  await db.insert(schema.geraeteWartung).values({
    id,
    workspaceId,
    geraetId: parsed.data.geraetId,
    art: parsed.data.art,
    faelligAm: parsed.data.faelligAm,
    durchgefuehrtAm: parsed.data.durchgefuehrtAm,
    durchgefuehrtVon: parsed.data.durchgefuehrtVon,
    kostenCents: parsed.data.kostenCents,
    prueferzeugnisFilename: parsed.data.prueferzeugnisFilename,
    notes: parsed.data.notes,
  });

  revalidatePath(`/geraete/${parsed.data.geraetId}`);
  revalidatePath("/geraete");
  redirect(`/geraete/${parsed.data.geraetId}`);
}

export async function markWartungDurchgefuehrt(
  formData: FormData
): Promise<void> {
  const parsed = wartungMarkDoneSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Ungültige Eingaben."
    );
  }
  const workspaceId = await getCurrentWorkspaceId();

  const [w] = await db
    .select()
    .from(schema.geraeteWartung)
    .where(
      and(
        eq(schema.geraeteWartung.id, parsed.data.id),
        eq(schema.geraeteWartung.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!w) throw new Error("Wartung nicht gefunden.");

  await db
    .update(schema.geraeteWartung)
    .set({
      durchgefuehrtAm: parsed.data.durchgefuehrtAm,
      durchgefuehrtVon: parsed.data.durchgefuehrtVon,
      kostenCents: parsed.data.kostenCents,
      prueferzeugnisFilename: parsed.data.prueferzeugnisFilename,
      notes: parsed.data.notes,
    })
    .where(eq(schema.geraeteWartung.id, parsed.data.id));

  revalidatePath(`/geraete/${w.geraetId}`);
  revalidatePath("/geraete");
}
