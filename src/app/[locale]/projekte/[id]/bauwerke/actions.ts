"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import { fail, type ActionResult } from "@/lib/action-result";
import { getCurrentWorkspaceId } from "@/lib/session";
import { nextPruefungDate, type PruefungArt } from "@/lib/bauwerkspruefung/din1076";

const bauwerksartEnum = z.enum([
  "bruecke",
  "tunnel",
  "stuetzmauer",
  "laermschutzwand",
  "ueberfuehrung",
  "unterfuehrung",
  "sonstiges",
]);

const pruefungArtEnum = z.enum([
  "hauptpruefung",
  "einfache_pruefung",
  "besichtigung",
  "sonderpruefung",
]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Ungültiges Datum")
  .or(z.literal(""))
  .transform((v) => (v === "" ? null : v));

const bauwerkCreateSchema = z.object({
  projektId: z.string().min(1),
  bauwerksnummer: z.string().min(1, "Bauwerksnummer fehlt").max(50),
  bezeichnung: z.string().min(1, "Bezeichnung fehlt").max(200),
  bauwerksart: bauwerksartEnum,
  baujahr: z
    .union([z.string().regex(/^\d{4}$/), z.literal("")])
    .transform((v) => (v === "" ? null : parseInt(v, 10))),
  letzteHauptpruefungAm: isoDate.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function createBauwerk(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = bauwerkCreateSchema.safeParse({
    projektId: formData.get("projektId"),
    bauwerksnummer: formData.get("bauwerksnummer"),
    bezeichnung: formData.get("bezeichnung"),
    bauwerksart: formData.get("bauwerksart"),
    baujahr: formData.get("baujahr") ?? "",
    letzteHauptpruefungAm: formData.get("letzteHauptpruefungAm") ?? "",
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return fail(
      "Eingabe unvollständig.",
      parsed.error.flatten().fieldErrors as Record<string, string[]>
    );
  }

  // Projekt-Zugehörigkeit prüfen
  const [project] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, parsed.data.projektId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) return fail("Projekt nicht gefunden.");

  const id = genId("bw");
  const now = new Date();
  const naechsteHaupt = nextPruefungDate(
    "hauptpruefung",
    parsed.data.letzteHauptpruefungAm
  );
  const naechsteEinfach = nextPruefungDate(
    "einfache_pruefung",
    parsed.data.letzteHauptpruefungAm
  );

  await db.insert(schema.bauwerke).values({
    id,
    workspaceId,
    projektId: parsed.data.projektId,
    bauwerksnummer: parsed.data.bauwerksnummer,
    bezeichnung: parsed.data.bezeichnung,
    bauwerksart: parsed.data.bauwerksart,
    baujahr: parsed.data.baujahr,
    letzteHauptpruefungAm: parsed.data.letzteHauptpruefungAm ?? null,
    naechsteHauptpruefungAm: naechsteHaupt,
    letzteEinfachePruefungAm: null,
    naechsteEinfachePruefungAm: naechsteEinfach,
    aktuelleZustandsnote: null,
    notes: parsed.data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath(`/projekte/${parsed.data.projektId}/bauwerke`);
  return { ok: true, data: { id } };
}

const pruefungCreateSchema = z.object({
  bauwerkId: z.string().min(1),
  art: pruefungArtEnum,
  geplantAm: isoDate.optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function createPruefung(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = pruefungCreateSchema.parse({
    bauwerkId: formData.get("bauwerkId"),
    art: formData.get("art"),
    geplantAm: formData.get("geplantAm") ?? "",
    notes: formData.get("notes") ?? "",
  });

  // Bauwerk verifizieren
  const [bauwerk] = await db
    .select({ id: schema.bauwerke.id, projektId: schema.bauwerke.projektId })
    .from(schema.bauwerke)
    .where(
      and(
        eq(schema.bauwerke.id, parsed.bauwerkId),
        eq(schema.bauwerke.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!bauwerk) throw new Error("Bauwerk nicht gefunden.");

  const id = genId("bp");
  const now = new Date();
  await db.insert(schema.bauwerkspruefungen).values({
    id,
    workspaceId,
    bauwerkId: parsed.bauwerkId,
    art: parsed.art,
    geplantAm: parsed.geplantAm ?? null,
    durchgefuehrtAm: null,
    pruefer: null,
    zustandsnote: null,
    bauwerksteil: null,
    berichtPfad: null,
    notes: parsed.notes ?? null,
    status: "geplant",
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath(`/projekte/${bauwerk.projektId}/bauwerke/${parsed.bauwerkId}`);
}

const pruefungAbschliessenSchema = z.object({
  pruefungId: z.string().min(1),
  durchgefuehrtAm: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Datum fehlt"),
  pruefer: z.string().max(200).optional().nullable(),
  zustandsnote: z
    .string()
    .regex(/^[1-4](?:[.,]\d)?$/, "Note 1.0–4.0 (Skala RI-EBW-PRÜF)")
    .transform((v) => parseFloat(v.replace(",", "."))),
  bauwerksteil: z.string().max(200).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function abschliessenPruefung(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = pruefungAbschliessenSchema.parse({
    pruefungId: formData.get("pruefungId"),
    durchgefuehrtAm: formData.get("durchgefuehrtAm"),
    pruefer: formData.get("pruefer") ?? "",
    zustandsnote: formData.get("zustandsnote"),
    bauwerksteil: formData.get("bauwerksteil") ?? "",
    notes: formData.get("notes") ?? "",
  });

  const [pruefung] = await db
    .select()
    .from(schema.bauwerkspruefungen)
    .where(
      and(
        eq(schema.bauwerkspruefungen.id, parsed.pruefungId),
        eq(schema.bauwerkspruefungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!pruefung) throw new Error("Prüfung nicht gefunden.");

  const [bauwerk] = await db
    .select()
    .from(schema.bauwerke)
    .where(eq(schema.bauwerke.id, pruefung.bauwerkId))
    .limit(1);
  if (!bauwerk) throw new Error("Bauwerk nicht gefunden.");

  const now = new Date();
  await db
    .update(schema.bauwerkspruefungen)
    .set({
      durchgefuehrtAm: parsed.durchgefuehrtAm,
      pruefer: parsed.pruefer ?? null,
      zustandsnote: parsed.zustandsnote,
      bauwerksteil: parsed.bauwerksteil ?? null,
      notes: parsed.notes ?? pruefung.notes,
      status: "abgeschlossen",
      updatedAt: now,
    })
    .where(eq(schema.bauwerkspruefungen.id, parsed.pruefungId));

  // Bauwerks-Stamm fortschreiben (Letzte/Nächste Termine + Note)
  const updates: Partial<typeof schema.bauwerke.$inferInsert> = {
    updatedAt: now,
    aktuelleZustandsnote: parsed.zustandsnote,
  };
  if (pruefung.art === "hauptpruefung") {
    updates.letzteHauptpruefungAm = parsed.durchgefuehrtAm;
    updates.naechsteHauptpruefungAm = nextPruefungDate(
      "hauptpruefung" as PruefungArt,
      parsed.durchgefuehrtAm
    );
    updates.naechsteEinfachePruefungAm = nextPruefungDate(
      "einfache_pruefung" as PruefungArt,
      parsed.durchgefuehrtAm
    );
  } else if (pruefung.art === "einfache_pruefung") {
    updates.letzteEinfachePruefungAm = parsed.durchgefuehrtAm;
    updates.naechsteEinfachePruefungAm = nextPruefungDate(
      "einfache_pruefung" as PruefungArt,
      parsed.durchgefuehrtAm
    );
  }
  await db
    .update(schema.bauwerke)
    .set(updates)
    .where(eq(schema.bauwerke.id, pruefung.bauwerkId));

  revalidatePath(`/projekte/${bauwerk.projektId}/bauwerke/${bauwerk.id}`);
}

export async function deleteBauwerk(formData: FormData): Promise<void> {
  const workspaceId = await getCurrentWorkspaceId();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const [bw] = await db
    .select({ projektId: schema.bauwerke.projektId })
    .from(schema.bauwerke)
    .where(
      and(
        eq(schema.bauwerke.id, id),
        eq(schema.bauwerke.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!bw) return;
  await db.delete(schema.bauwerke).where(eq(schema.bauwerke.id, id));
  revalidatePath(`/projekte/${bw.projektId}/bauwerke`);
  redirect(`/projekte/${bw.projektId}/bauwerke`);
}
