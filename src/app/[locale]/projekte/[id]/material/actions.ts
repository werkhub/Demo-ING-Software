"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  bestellungInputSchema,
  bestellungPositionInputSchema,
  formDataToObject,
  idOnlySchema,
  lieferscheinInputSchema,
  lieferscheinPositionInputSchema,
  lieferscheinReklamationSchema,
  materialMatchInputSchema,
} from "@/lib/validation/schemas";
import {
  matchBestellungMitLieferscheinen,
  matchBestellungMitRechnung,
  type BestellpositionLike,
  type LieferscheinpositionLike,
  type RechnungspositionLike,
} from "@/lib/material/match";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";

const isoToday = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

function parsePositionen<T>(
  json: string,
  parseOne: (raw: unknown) => { ok: true; data: T } | { ok: false; error: string }
): { ok: true; data: T[] } | { ok: false; error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(json || "[]");
  } catch {
    return { ok: false, error: "Positionen-JSON ist kein gültiges JSON." };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: "Positionen-JSON muss ein Array sein." };
  }
  const out: T[] = [];
  for (let i = 0; i < raw.length; i++) {
    const r = parseOne(raw[i]);
    if (!r.ok) return { ok: false, error: `Position ${i + 1}: ${r.error}` };
    out.push(r.data);
  }
  return { ok: true, data: out };
}

/* ============== BESTELLUNG ============== */

export async function createBestellung(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = bestellungInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }

  const positionen = parsePositionen(parsed.data.positionenJson, (raw) => {
    const r = bestellungPositionInputSchema.safeParse(raw);
    if (!r.success) {
      return { ok: false, error: r.error.issues.map((i) => i.message).join("; ") };
    }
    return { ok: true, data: r.data };
  });
  if (!positionen.ok) return fail(positionen.error);
  if (positionen.data.length === 0) {
    return fail("Bestellung ohne Positionen ist nicht erlaubt.");
  }

  // Bestellnummer eindeutig pro Workspace
  const [conflict] = await db
    .select({ id: schema.bestellungen.id })
    .from(schema.bestellungen)
    .where(
      and(
        eq(schema.bestellungen.workspaceId, workspaceId),
        eq(schema.bestellungen.bestellnummer, parsed.data.bestellnummer)
      )
    )
    .limit(1);
  if (conflict) {
    return fail(
      `Bestellnummer "${parsed.data.bestellnummer}" existiert bereits.`
    );
  }

  const id = genId("best");
  const summe =
    parsed.data.summeNettoCents > 0
      ? parsed.data.summeNettoCents
      : positionen.data.reduce((s, p) => s + p.gesamtpreisCents, 0);

  await db.insert(schema.bestellungen).values({
    id,
    workspaceId,
    projektId: parsed.data.projektId,
    lieferantName: parsed.data.lieferantName,
    lieferantId: parsed.data.lieferantId,
    bestellnummer: parsed.data.bestellnummer,
    datum: parsed.data.datum,
    summeNettoCents: summe,
    ustSatzPct: parsed.data.ustSatzPct,
    notes: parsed.data.notes,
    status: "offen",
  });

  await db.insert(schema.bestellungenPositionen).values(
    positionen.data.map((p, idx) => ({
      id: genId("bestpos"),
      bestellungId: id,
      workspaceId,
      posNr: p.posNr,
      bezeichnung: p.bezeichnung,
      menge: p.menge,
      einheit: p.einheit,
      einzelpreisCents: p.einzelpreisCents,
      gesamtpreisCents: p.gesamtpreisCents,
      lvPositionId: p.lvPositionId,
      sortIndex: idx,
    }))
  );

  revalidatePath(`/projekte/${parsed.data.projektId}/material`);
  return ok({ id });
}

export async function createBestellungRedirect(formData: FormData): Promise<void> {
  const result = await createBestellung(null, formData);
  const projektId = String(formData.get("projektId") ?? "");
  if (!result.ok) {
    redirect(
      `/projekte/${projektId}/material/bestellungen/new?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  redirect(`/projekte/${projektId}/material/bestellungen/${result.data.id}`);
}

/* ============== LIEFERSCHEIN ============== */

export async function addLieferschein(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = lieferscheinInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }

  const positionen = parsePositionen(parsed.data.positionenJson, (raw) => {
    const r = lieferscheinPositionInputSchema.safeParse(raw);
    if (!r.success) {
      return { ok: false, error: r.error.issues.map((i) => i.message).join("; ") };
    }
    return { ok: true, data: r.data };
  });
  if (!positionen.ok) return fail(positionen.error);

  // LS-Nr eindeutig pro Projekt
  const [conflict] = await db
    .select({ id: schema.lieferscheine.id })
    .from(schema.lieferscheine)
    .where(
      and(
        eq(schema.lieferscheine.workspaceId, workspaceId),
        eq(schema.lieferscheine.projektId, parsed.data.projektId),
        eq(schema.lieferscheine.lsNr, parsed.data.lsNr)
      )
    )
    .limit(1);
  if (conflict) {
    return fail(
      `Lieferschein-Nr "${parsed.data.lsNr}" existiert in diesem Projekt bereits.`
    );
  }

  const id = genId("ls");
  await db.insert(schema.lieferscheine).values({
    id,
    workspaceId,
    projektId: parsed.data.projektId,
    bestellungId: parsed.data.bestellungId,
    lsNr: parsed.data.lsNr,
    datum: parsed.data.datum,
    lieferantName: parsed.data.lieferantName,
    angenommenVon: parsed.data.angenommenVon,
    notes: parsed.data.notes,
    status: "eingegangen",
  });

  if (positionen.data.length > 0) {
    await db.insert(schema.lieferscheinePositionen).values(
      positionen.data.map((p, idx) => ({
        id: genId("lspos"),
        lsId: id,
        workspaceId,
        bestellposId: p.bestellposId,
        bezeichnung: p.bezeichnung,
        menge: p.menge,
        einheit: p.einheit,
        mangelText: p.mangelText,
        sortIndex: idx,
      }))
    );
  }

  // Bestellung-Status nachführen, falls verknüpft
  if (parsed.data.bestellungId) {
    await refreshBestellungStatus(workspaceId, parsed.data.bestellungId);
  }

  revalidatePath(`/projekte/${parsed.data.projektId}/material`);
  return ok({ id });
}

export async function addLieferscheinRedirect(formData: FormData): Promise<void> {
  const result = await addLieferschein(null, formData);
  const projektId = String(formData.get("projektId") ?? "");
  if (!result.ok) {
    redirect(
      `/projekte/${projektId}/material/lieferscheine/new?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  redirect(`/projekte/${projektId}/material?tab=lieferscheine&created=${result.data.id}`);
}

async function refreshBestellungStatus(
  workspaceId: string,
  bestellungId: string
): Promise<void> {
  const [b] = await db
    .select()
    .from(schema.bestellungen)
    .where(
      and(
        eq(schema.bestellungen.id, bestellungId),
        eq(schema.bestellungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!b) return;
  if (b.status === "storniert") return;

  const [bps, lspsRaw] = await Promise.all([
    db
      .select()
      .from(schema.bestellungenPositionen)
      .where(eq(schema.bestellungenPositionen.bestellungId, bestellungId))
      .orderBy(asc(schema.bestellungenPositionen.sortIndex)),
    db
      .select({
        bestellposId: schema.lieferscheinePositionen.bestellposId,
        menge: schema.lieferscheinePositionen.menge,
        bezeichnung: schema.lieferscheinePositionen.bezeichnung,
      })
      .from(schema.lieferscheinePositionen)
      .innerJoin(
        schema.lieferscheine,
        eq(schema.lieferscheinePositionen.lsId, schema.lieferscheine.id)
      )
      .where(
        and(
          eq(schema.lieferscheine.workspaceId, workspaceId),
          eq(schema.lieferscheine.bestellungId, bestellungId)
        )
      ),
  ]);

  const lsps: LieferscheinpositionLike[] = lspsRaw.map((r) => ({
    bestellposId: r.bestellposId,
    bezeichnung: r.bezeichnung,
    menge: r.menge,
  }));

  const abgleich = matchBestellungMitLieferscheinen(
    bps.map<BestellpositionLike>((p) => ({
      id: p.id,
      posNr: p.posNr,
      bezeichnung: p.bezeichnung,
      menge: p.menge,
      einzelpreisCents: p.einzelpreisCents,
      gesamtpreisCents: p.gesamtpreisCents,
    })),
    lsps
  );

  let nextStatus: typeof b.status;
  if (abgleich.complete) nextStatus = "vollstaendig";
  else if (lsps.length > 0) nextStatus = "teilgeliefert";
  else nextStatus = "offen";

  if (nextStatus !== b.status) {
    await db
      .update(schema.bestellungen)
      .set({ status: nextStatus, updatedAt: new Date() })
      .where(eq(schema.bestellungen.id, bestellungId));
  }
}

export async function markLieferscheinReklamation(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = lieferscheinReklamationSchema.safeParse(
    formDataToObject(formData)
  );
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  const [ls] = await db
    .select()
    .from(schema.lieferscheine)
    .where(
      and(
        eq(schema.lieferscheine.id, parsed.data.id),
        eq(schema.lieferscheine.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!ls) return fail("Lieferschein nicht gefunden.");
  await db
    .update(schema.lieferscheine)
    .set({
      status: "reklamation",
      notes: ls.notes
        ? `${ls.notes}\n[Reklamation] ${parsed.data.mangelText}`
        : `[Reklamation] ${parsed.data.mangelText}`,
    })
    .where(eq(schema.lieferscheine.id, parsed.data.id));
  revalidatePath(`/projekte/${ls.projektId}/material`);
  return ok(undefined);
}

/* ============== 3-WAY-MATCH ============== */

export async function runMatch(
  _prev: ActionResult<{ id: string; status: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string; status: string }>> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const parsed = materialMatchInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }

  let lsIds: string[];
  try {
    const arr = JSON.parse(parsed.data.lsIdsJson);
    if (!Array.isArray(arr)) throw new Error("nicht array");
    lsIds = arr.map((x) => String(x));
  } catch {
    return fail("LS-IDs JSON ungültig.");
  }

  const [bestellung] = await db
    .select()
    .from(schema.bestellungen)
    .where(
      and(
        eq(schema.bestellungen.id, parsed.data.bestellungId),
        eq(schema.bestellungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!bestellung) return fail("Bestellung nicht gefunden.");

  const [rechnung] = await db
    .select()
    .from(schema.rechnungen)
    .where(
      and(
        eq(schema.rechnungen.id, parsed.data.rechnungId),
        eq(schema.rechnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!rechnung) return fail("Rechnung nicht gefunden.");

  const [bps, rps, lsps] = await Promise.all([
    db
      .select()
      .from(schema.bestellungenPositionen)
      .where(
        eq(schema.bestellungenPositionen.bestellungId, parsed.data.bestellungId)
      ),
    db
      .select()
      .from(schema.rechnungPositionen)
      .where(eq(schema.rechnungPositionen.rechnungId, parsed.data.rechnungId)),
    lsIds.length > 0
      ? db
          .select()
          .from(schema.lieferscheinePositionen)
          .where(inArray(schema.lieferscheinePositionen.lsId, lsIds))
      : Promise.resolve([] as Array<typeof schema.lieferscheinePositionen.$inferSelect>),
  ]);

  const matchResult = matchBestellungMitRechnung({
    bestellPositionen: bps.map<BestellpositionLike>((p) => ({
      id: p.id,
      posNr: p.posNr,
      bezeichnung: p.bezeichnung,
      menge: p.menge,
      einzelpreisCents: p.einzelpreisCents,
      gesamtpreisCents: p.gesamtpreisCents,
    })),
    lieferscheinPositionen: lsps.map<LieferscheinpositionLike>((p) => ({
      bestellposId: p.bestellposId,
      bezeichnung: p.bezeichnung,
      menge: p.menge,
    })),
    rechnungPositionen: rps.map<RechnungspositionLike>((p) => ({
      lvPosition: p.lvPosition,
      description: p.description,
      quantity: p.quantity,
      unitPrice: p.unitPrice,
      totalPrice: p.totalPrice,
    })),
    toleranzPctMenge: parsed.data.toleranzPctMenge,
    toleranzCents: parsed.data.toleranzCents,
  });

  const id = genId("match");
  await db.insert(schema.materialMatch).values({
    id,
    workspaceId,
    projektId: bestellung.projektId,
    bestellungId: parsed.data.bestellungId,
    lsIdsJson: JSON.stringify(lsIds),
    rechnungId: parsed.data.rechnungId,
    matchStatus: matchResult.status,
    matchDetailsJson: JSON.stringify({
      abweichungen: matchResult.abweichungen,
      gelieferteMengeJeBestellpos: matchResult.gelieferteMengeJeBestellpos,
      toleranzPctMenge: parsed.data.toleranzPctMenge,
      toleranzCents: parsed.data.toleranzCents,
    }),
  });

  if (matchResult.status === "abweichung") {
    await createVorgangFromTrigger({
      workspaceId,
      userId,
      source: "material_rechnung_abweichung",
      title: `Material-Rechnung weicht ab: ${bestellung.bestellnummer} ↔ ${rechnung.supplierName}`,
      category: "vertragspflicht",
      projectId: bestellung.projektId,
      dueDate: isoToday(7),
      firstStep: {
        kind: "klassifikation",
        payload: {
          matchId: id,
          bestellungId: parsed.data.bestellungId,
          rechnungId: parsed.data.rechnungId,
          abweichungen: matchResult.abweichungen,
          triggeredBy: "run_match",
        },
        citations: [
          {
            sourceKind: "intern",
            sourceRef: "Material-Match (3-Way)",
            sourceText:
              "Bestellung, Lieferschein und Rechnung müssen in Menge und Betrag übereinstimmen — Abweichungen vor Freigabe klären (Kostenstelle, Mehrmengen, Preis-Anpassungen).",
          },
        ],
      },
      auditPayload: {
        matchId: id,
        bestellungId: parsed.data.bestellungId,
        rechnungId: parsed.data.rechnungId,
      },
    });
  }

  revalidatePath(`/projekte/${bestellung.projektId}/material`);
  return ok({ id, status: matchResult.status });
}

export async function runMatchRedirect(formData: FormData): Promise<void> {
  const result = await runMatch(null, formData);
  const projektId = String(formData.get("projektId") ?? "");
  if (!result.ok) {
    redirect(
      `/projekte/${projektId}/material/match?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  redirect(
    `/projekte/${projektId}/material/match?matched=${result.data.id}&status=${result.data.status}`
  );
}

/* ============== STORNIERUNG ============== */

export async function stornoBestellung(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = idOnlySchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fail("ID fehlt.");
  const [b] = await db
    .select()
    .from(schema.bestellungen)
    .where(
      and(
        eq(schema.bestellungen.id, parsed.data.id),
        eq(schema.bestellungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!b) return fail("Bestellung nicht gefunden.");
  await db
    .update(schema.bestellungen)
    .set({ status: "storniert", updatedAt: new Date() })
    .where(eq(schema.bestellungen.id, parsed.data.id));
  revalidatePath(`/projekte/${b.projektId}/material`);
  return ok(undefined);
}
