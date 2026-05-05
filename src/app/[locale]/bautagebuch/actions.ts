"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId, getCurrentUserId } from "@/lib/session";
import { genId } from "@/lib/utils";
import { classifyBautagebuch } from "@/lib/classify";
import { fail, fieldFail, ok, type ActionResult } from "@/lib/action-result";
import {
  bautagebuchIdSchema,
  bautagebuchInputSchema,
  formDataToObject,
  triggerByEntryIdSchema,
} from "@/lib/validation/schemas";
import {
  createVorgangFromTrigger,
  findOpenVorgangByLink,
} from "@/lib/vorgang/create-from-trigger";
import { cleanupLinksToTarget } from "@/lib/vorgang/link-cleanup";
import type { VorgangCategory, VorgangCitationKind } from "@/db/schema";

function isoDateInDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function ensureProjectInWorkspace(
  workspaceId: string,
  projectId: string | null
): Promise<boolean> {
  if (!projectId) return true;
  const [row] = await db
    .select({ id: schema.projects.id })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return !!row;
}

export async function createBautagebuchEntry(
  _prev: ActionResult<{
    id: string;
    trigger: string | null;
    autoFristCreated: boolean;
  }> | null,
  formData: FormData
): Promise<
  ActionResult<{
    id: string;
    trigger: string | null;
    autoFristCreated: boolean;
  }>
> {
  const parsed = bautagebuchInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  if (!(await ensureProjectInWorkspace(workspaceId, parsed.data.projectId))) {
    return fieldFail({
      projectId: ["Projekt gehört nicht zum aktuellen Workspace."],
    });
  }

  const [author] = await db
    .select({ name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);

  const c = classifyBautagebuch(parsed.data.text);
  const entryId = genId("bt");
  let autoFristCreated = false;

  // Wenn Nutzer explizit eine Kategorie gesetzt hat, behält die. Sonst aus Trigger ableiten.
  const finalCategory =
    parsed.data.category !== "allgemein"
      ? parsed.data.category
      : c.trigger === "anordnung"
        ? "anordnung"
        : c.trigger === "behinderung"
          ? "behinderung"
          : c.trigger === "mangelruege"
            ? "mangel"
            : c.trigger === "bedenken"
              ? "bedenken"
              : "allgemein";

  try {
    await db.insert(schema.bautagebuchEntries).values({
      id: entryId,
      workspaceId,
      projectId: parsed.data.projectId,
      authorId: userId,
      authorName: author?.name ?? "Unbekannt",
      entryDate: parsed.data.entryDate,
      category: finalCategory,
      text: parsed.data.text,
      weatherCondition: parsed.data.weatherCondition,
      temperatureCelsius: parsed.data.temperatureCelsius,
      staffHoursOwn: parsed.data.staffHoursOwn,
      staffHoursSubcontractors: parsed.data.staffHoursSubcontractors,
      equipment: parsed.data.equipment,
      attachmentRefs: parsed.data.attachmentRefs,
      trigger: c.trigger,
      triggerLabel: c.triggerLabel,
      urgency: c.urgency,
      suggestion: c.suggestion,
    });

    if (c.followUpFrist) {
      await db.insert(schema.fristen).values({
        id: genId("f"),
        workspaceId,
        projectId: parsed.data.projectId,
        task: c.followUpFrist.task,
        deadline: isoDateInDays(c.followUpFrist.deadlineDaysFromNow),
        legalBasis: c.followUpFrist.legalBasis,
        sourceBautagebuchEntryId: entryId,
      });
      autoFristCreated = true;
    }
  } catch {
    return fail("Eintrag konnte nicht gespeichert werden.");
  }

  revalidatePath("/bautagebuch");
  revalidatePath("/fristen");
  revalidatePath("/");
  if (parsed.data.projectId) {
    revalidatePath(`/projekte/${parsed.data.projectId}`);
  }
  return ok({ id: entryId, trigger: c.trigger, autoFristCreated });
}

export async function updateBautagebuchEntry(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const data = formDataToObject(formData);
  const idParse = bautagebuchIdSchema.safeParse({ id: data.id });
  if (!idParse.success) return fail("Ungültige Eintrag-ID.");
  const id = idParse.data.id;

  const parsed = bautagebuchInputSchema.safeParse(data);
  if (!parsed.success) {
    return fieldFail(parsed.error.flatten().fieldErrors as Record<string, string[]>);
  }

  const workspaceId = await getCurrentWorkspaceId();

  const [existing] = await db
    .select({
      id: schema.bautagebuchEntries.id,
      projectId: schema.bautagebuchEntries.projectId,
    })
    .from(schema.bautagebuchEntries)
    .where(
      and(
        eq(schema.bautagebuchEntries.id, id),
        eq(schema.bautagebuchEntries.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return fail("Eintrag nicht gefunden.");

  if (!(await ensureProjectInWorkspace(workspaceId, parsed.data.projectId))) {
    return fieldFail({
      projectId: ["Projekt gehört nicht zum aktuellen Workspace."],
    });
  }

  const c = classifyBautagebuch(parsed.data.text);

  try {
    await db
      .update(schema.bautagebuchEntries)
      .set({
        projectId: parsed.data.projectId,
        entryDate: parsed.data.entryDate,
        category: parsed.data.category,
        text: parsed.data.text,
        weatherCondition: parsed.data.weatherCondition,
        temperatureCelsius: parsed.data.temperatureCelsius,
        staffHoursOwn: parsed.data.staffHoursOwn,
        staffHoursSubcontractors: parsed.data.staffHoursSubcontractors,
        equipment: parsed.data.equipment,
        attachmentRefs: parsed.data.attachmentRefs,
        trigger: c.trigger,
        triggerLabel: c.triggerLabel,
        urgency: c.urgency,
        suggestion: c.suggestion,
        updatedAt: new Date(),
      })
      .where(eq(schema.bautagebuchEntries.id, id));
  } catch {
    return fail("Eintrag konnte nicht aktualisiert werden.");
  }

  revalidatePath("/bautagebuch");
  revalidatePath(`/bautagebuch/${id}/edit`);
  if (existing.projectId) revalidatePath(`/projekte/${existing.projectId}`);
  if (parsed.data.projectId && parsed.data.projectId !== existing.projectId) {
    revalidatePath(`/projekte/${parsed.data.projectId}`);
  }
  return ok({ id });
}

export async function deleteBautagebuchEntry(formData: FormData): Promise<void> {
  const parsed = bautagebuchIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) throw new Error("Eintrag-ID fehlt.");

  const workspaceId = await getCurrentWorkspaceId();

  const [existing] = await db
    .select({ projectId: schema.bautagebuchEntries.projectId })
    .from(schema.bautagebuchEntries)
    .where(
      and(
        eq(schema.bautagebuchEntries.id, parsed.data.id),
        eq(schema.bautagebuchEntries.workspaceId, workspaceId)
      )
    )
    .limit(1);

  await db
    .delete(schema.bautagebuchEntries)
    .where(
      and(
        eq(schema.bautagebuchEntries.id, parsed.data.id),
        eq(schema.bautagebuchEntries.workspaceId, workspaceId)
      )
    );

  // Orphaned vorgang_links entfernen (G).
  await cleanupLinksToTarget({ targetKind: "bautagebuch", targetId: parsed.data.id });

  revalidatePath("/bautagebuch");
  if (existing?.projectId) revalidatePath(`/projekte/${existing.projectId}`);
}

/* ============== TRIGGER → VORGANG ============== */

/**
 * Mapping Bautagebuch-Kategorie → Vorgangs-Kategorie für die Auto-Erzeugung.
 * Default ist „sonstiges" — Werkzeug-Heuristik soll konservativ klassifizieren.
 */
const BAUTAGEBUCH_TO_VORGANG_CATEGORY: Record<
  string,
  {
    category: VorgangCategory;
    titlePrefix: string;
    dueDays: number;
    citation?: { ref: string; kind: VorgangCitationKind; text: string };
  }
> = {
  mangel: {
    category: "maengelruege",
    titlePrefix: "Mangel-Eskalation",
    dueDays: 14,
    citation: {
      kind: "vob",
      ref: "§ 13 Abs. 5 VOB/B",
      text: "Mängelbeseitigungs-Verlangen — angemessene Frist setzen, ansonsten Selbstvornahme zulässig.",
    },
  },
  anordnung: {
    category: "vertragspflicht",
    titlePrefix: "Anordnung dokumentiert",
    dueDays: 7,
    citation: {
      kind: "vob",
      ref: "§ 2 Abs. 6 VOB/B",
      text: "Bei geänderter / zusätzlicher Leistung Mehrkosten VOR Ausführung schriftlich ankündigen.",
    },
  },
  behinderung: {
    category: "vertragspflicht",
    titlePrefix: "Behinderungsanzeige",
    dueDays: 3,
    citation: {
      kind: "vob",
      ref: "§ 6 Abs. 1 VOB/B",
      text: "Behinderung unverzüglich schriftlich anzeigen — sonst Anspruchsverlust auf Bauzeitverlängerung.",
    },
  },
  bedenken: {
    category: "anlieferung",
    titlePrefix: "Bedenkenanzeige",
    dueDays: 7,
    citation: {
      kind: "vob",
      ref: "§ 4 Abs. 3 VOB/B",
      text: "Bedenken gegen Vorleistung / Anweisung schriftlich anzeigen — andernfalls Mitverantwortung.",
    },
  },
  lieferung: {
    category: "anlieferung",
    titlePrefix: "Anlieferung",
    dueDays: 7,
  },
  besichtigung: {
    category: "sonstiges",
    titlePrefix: "Besichtigung",
    dueDays: 14,
  },
  personal: {
    category: "sonstiges",
    titlePrefix: "Personal-Hinweis",
    dueDays: 14,
  },
  allgemein: {
    category: "sonstiges",
    titlePrefix: "Bautagebuch-Eskalation",
    dueDays: 14,
  },
};

export async function createVorgangFromBautagebuchEntry(
  formData: FormData
): Promise<void> {
  const parsed = triggerByEntryIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues.map((i) => i.message).join(" · ") ||
        "Eintrag-ID fehlt."
    );
  }
  const { entryId } = parsed.data;

  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  const [entry] = await db
    .select()
    .from(schema.bautagebuchEntries)
    .where(
      and(
        eq(schema.bautagebuchEntries.id, entryId),
        eq(schema.bautagebuchEntries.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!entry) throw new Error("Bautagebuch-Eintrag nicht gefunden.");

  // Idempotenz: schon ein offener Vorgang verlinkt? Dorthin umleiten statt neu anlegen.
  const existing = await findOpenVorgangByLink({
    workspaceId,
    targetKind: "bautagebuch",
    targetId: entry.id,
  });
  if (existing) {
    revalidatePath("/bautagebuch");
    if (entry.projectId) revalidatePath(`/projekte/${entry.projectId}`);
    redirect(`/vorgaenge/${existing}`);
  }

  const mapping =
    BAUTAGEBUCH_TO_VORGANG_CATEGORY[entry.category] ??
    BAUTAGEBUCH_TO_VORGANG_CATEGORY.allgemein;

  const snippet = entry.text.replace(/\s+/g, " ").slice(0, 80).trim();
  const title = `${mapping.titlePrefix}: ${snippet}${entry.text.length > 80 ? "…" : ""}`;

  const { vorgangId } = await createVorgangFromTrigger({
    workspaceId,
    userId,
    source: "bautagebuch",
    title,
    category: mapping.category,
    projectId: entry.projectId,
    dueDate: isoDateInDays(mapping.dueDays),
    firstStep: {
      kind: "klassifikation",
      payload: {
        bautagebuchEntryId: entry.id,
        entryDate: entry.entryDate,
        bautagebuchCategory: entry.category,
        trigger: entry.trigger,
        urgency: entry.urgency,
        textPreview: entry.text.slice(0, 500),
      },
      citations: mapping.citation
        ? [
            {
              sourceKind: mapping.citation.kind,
              sourceRef: mapping.citation.ref,
              sourceText: mapping.citation.text,
            },
          ]
        : [],
    },
    citations: mapping.citation
      ? [
          {
            sourceKind: mapping.citation.kind,
            sourceRef: mapping.citation.ref,
            sourceText: mapping.citation.text,
          },
        ]
      : [],
    link: { targetKind: "bautagebuch", targetId: entry.id },
    auditPayload: {
      bautagebuchEntryId: entry.id,
      bautagebuchCategory: entry.category,
    },
  });

  revalidatePath("/bautagebuch");
  revalidatePath("/vorgaenge");
  if (entry.projectId) revalidatePath(`/projekte/${entry.projectId}`);
  redirect(`/vorgaenge/${vorgangId}`);
}
