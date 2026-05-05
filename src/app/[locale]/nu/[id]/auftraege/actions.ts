"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspace,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import {
  formDataToObject,
  nuAuftragIdSchema,
  nuAuftragInputSchema,
  nuAuftragUpdateSchema,
  nuKontoFreigabeSchema,
  nuRechnungInputSchema,
  nuRechnungStatusSchema,
} from "@/lib/validation/schemas";
import {
  calcEinbehalte,
  calcFaelligkeit,
  canTransitionAuftrag,
  canTransitionRechnung,
  defaultBauabzugCents,
  isoDate,
} from "@/lib/nu-operations";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";

/* ============== HELPERS ============== */

async function loadAuftrag(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(schema.nuAuftraege)
    .where(
      and(
        eq(schema.nuAuftraege.id, id),
        eq(schema.nuAuftraege.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

async function loadRechnung(workspaceId: string, id: string) {
  const [row] = await db
    .select()
    .from(schema.nuEingangsrechnungen)
    .where(
      and(
        eq(schema.nuEingangsrechnungen.id, id),
        eq(schema.nuEingangsrechnungen.workspaceId, workspaceId)
      )
    )
    .limit(1);
  return row ?? null;
}

async function checkNuFreistellung(workspaceId: string, nuId: string): Promise<{
  hatGueltigeFreistellung: boolean;
  freistellungBis: string | null;
}> {
  const [nu] = await db
    .select({
      freistellungBis: schema.subcontractors.freistellungsbescheinigungGueltigBis,
    })
    .from(schema.subcontractors)
    .where(
      and(
        eq(schema.subcontractors.id, nuId),
        eq(schema.subcontractors.workspaceId, workspaceId)
      )
    )
    .limit(1);
  const today = isoDate();
  const bis = nu?.freistellungBis ?? null;
  const gueltig = !!bis && bis >= today;
  return { hatGueltigeFreistellung: gueltig, freistellungBis: bis };
}

/* ============== AUFTRAG CRUD ============== */

export async function createNuAuftrag(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const parsed = nuAuftragInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }

  // Eindeutigkeit Auftragsnr im Workspace
  const [conflict] = await db
    .select({ id: schema.nuAuftraege.id })
    .from(schema.nuAuftraege)
    .where(
      and(
        eq(schema.nuAuftraege.workspaceId, workspaceId),
        eq(schema.nuAuftraege.auftragsnr, parsed.data.auftragsnr)
      )
    )
    .limit(1);
  if (conflict) {
    return fail(`Auftragsnummer „${parsed.data.auftragsnr}" existiert bereits.`);
  }

  const id = genId("nuauftrag");
  await db.insert(schema.nuAuftraege).values({
    id,
    workspaceId,
    nuId: parsed.data.nuId,
    projektId: parsed.data.projektId,
    auftragsnr: parsed.data.auftragsnr,
    auftragsdatum: parsed.data.auftragsdatum,
    gewerk: parsed.data.gewerk,
    auftragssummeNettoCents: parsed.data.auftragssummeNettoCents,
    ustSatzPct: parsed.data.ustSatzPct,
    vertragstyp: parsed.data.vertragstyp,
    sicherheitseinbehaltPct: parsed.data.sicherheitseinbehaltPct,
    gewaehrleistungseinbehaltPct: parsed.data.gewaehrleistungseinbehaltPct,
    vertragsstrafePct: parsed.data.vertragsstrafePct,
    leistungsBeginn: parsed.data.leistungsBeginn,
    leistungsEnde: parsed.data.leistungsEnde,
    notes: parsed.data.notes,
    status: "offen",
  });

  // Compliance-Check: Auftrag ohne gültige Freistellung → Auto-Vorgang
  const compliance = await checkNuFreistellung(workspaceId, parsed.data.nuId);
  if (!compliance.hatGueltigeFreistellung) {
    const [nuRow] = await db
      .select({ name: schema.subcontractors.name })
      .from(schema.subcontractors)
      .where(eq(schema.subcontractors.id, parsed.data.nuId))
      .limit(1);
    await createVorgangFromTrigger({
      workspaceId,
      userId,
      source: "nu_auftrag_ohne_freistellung",
      title: `NU-Auftrag ohne gültige Freistellung: ${nuRow?.name ?? "Unbekannt"} (${parsed.data.auftragsnr})`,
      category: "vertragspflicht",
      projectId: parsed.data.projektId,
      dueDate: isoDate(new Date(Date.now() + 7 * 86400000)),
      firstStep: {
        kind: "klassifikation",
        payload: {
          nuAuftragId: id,
          nuId: parsed.data.nuId,
          freistellungBis: compliance.freistellungBis,
          triggeredBy: "create_nu_auftrag",
        },
        citations: [
          {
            sourceKind: "intern",
            sourceRef: "§ 48 EStG",
            sourceText:
              "Ohne gültige Freistellungsbescheinigung Bauabzug 15% auf Bruttovergütung einzubehalten.",
          },
        ],
      },
      auditPayload: { nuAuftragId: id, nuId: parsed.data.nuId },
    });
    await db
      .update(schema.nuAuftraege)
      .set({ complianceWarnungVersendetAm: new Date() })
      .where(eq(schema.nuAuftraege.id, id));
  }

  revalidatePath(`/nu/${parsed.data.nuId}`);
  revalidatePath(`/nu/${parsed.data.nuId}/auftraege`);
  return ok({ id });
}

export async function updateNuAuftrag(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = nuAuftragUpdateSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  const existing = await loadAuftrag(workspaceId, parsed.data.id);
  if (!existing) return fail("Auftrag nicht gefunden.");
  if (!canTransitionAuftrag(existing.status, parsed.data.status)) {
    return fail(
      `Status-Wechsel ${existing.status} → ${parsed.data.status} nicht erlaubt.`
    );
  }
  await db
    .update(schema.nuAuftraege)
    .set({
      auftragsnr: parsed.data.auftragsnr,
      auftragsdatum: parsed.data.auftragsdatum,
      gewerk: parsed.data.gewerk,
      auftragssummeNettoCents: parsed.data.auftragssummeNettoCents,
      ustSatzPct: parsed.data.ustSatzPct,
      vertragstyp: parsed.data.vertragstyp,
      sicherheitseinbehaltPct: parsed.data.sicherheitseinbehaltPct,
      gewaehrleistungseinbehaltPct: parsed.data.gewaehrleistungseinbehaltPct,
      vertragsstrafePct: parsed.data.vertragsstrafePct,
      leistungsBeginn: parsed.data.leistungsBeginn,
      leistungsEnde: parsed.data.leistungsEnde,
      notes: parsed.data.notes,
      status: parsed.data.status,
      updatedAt: new Date(),
    })
    .where(eq(schema.nuAuftraege.id, parsed.data.id));
  revalidatePath(`/nu/${existing.nuId}/auftraege/${parsed.data.id}`);
  return ok({ id: parsed.data.id });
}

export async function deleteNuAuftrag(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = nuAuftragIdSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fail("ID fehlt.");
  const existing = await loadAuftrag(workspaceId, parsed.data.id);
  if (!existing) return fail("Auftrag nicht gefunden.");
  if (existing.status === "fertig") {
    return fail(
      "Fertig gestellter Auftrag kann nicht gelöscht werden — Audit-Pflicht."
    );
  }
  // Rechnungen prüfen
  const [hasRechnung] = await db
    .select({ id: schema.nuEingangsrechnungen.id })
    .from(schema.nuEingangsrechnungen)
    .where(eq(schema.nuEingangsrechnungen.nuAuftragId, parsed.data.id))
    .limit(1);
  if (hasRechnung) {
    return fail("Auftrag hat Eingangsrechnungen — nicht löschbar.");
  }
  await db.delete(schema.nuAuftraege).where(eq(schema.nuAuftraege.id, parsed.data.id));
  revalidatePath(`/nu/${existing.nuId}/auftraege`);
  return ok(undefined);
}

/* ============== EINGANGSRECHNUNG ============== */

export async function createNuRechnung(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const [workspaceId, workspace, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentWorkspace(),
    getCurrentUserId(),
  ]);
  const parsed = nuRechnungInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  const auftrag = await loadAuftrag(workspaceId, parsed.data.nuAuftragId);
  if (!auftrag) return fail("Auftrag nicht gefunden.");

  // Eindeutigkeit Rechnungsnr je Auftrag
  const [conflict] = await db
    .select({ id: schema.nuEingangsrechnungen.id })
    .from(schema.nuEingangsrechnungen)
    .where(
      and(
        eq(schema.nuEingangsrechnungen.workspaceId, workspaceId),
        eq(schema.nuEingangsrechnungen.nuAuftragId, parsed.data.nuAuftragId),
        eq(schema.nuEingangsrechnungen.rechnungsnr, parsed.data.rechnungsnr)
      )
    )
    .limit(1);
  if (conflict) {
    return fail(
      `Rechnungsnummer „${parsed.data.rechnungsnr}" für diesen Auftrag bereits erfasst.`
    );
  }

  // Bauabzug-Default falls leer und Workspace bauabzug-pflichtig
  const compliance = await checkNuFreistellung(workspaceId, auftrag.nuId);
  const bauabzug =
    parsed.data.bauabzugEinbehaltCents > 0
      ? parsed.data.bauabzugEinbehaltCents
      : defaultBauabzugCents(
          parsed.data.bruttoCents,
          compliance.hatGueltigeFreistellung,
          workspace.bauabzugPflichtig ?? false
        );

  const einbehalte = calcEinbehalte({
    bruttoCents: parsed.data.bruttoCents,
    nettoCents: parsed.data.nettoCents,
    sicherheitseinbehaltPct: auftrag.sicherheitseinbehaltPct,
    gewaehrleistungseinbehaltPct: auftrag.gewaehrleistungseinbehaltPct,
    skontoCents: parsed.data.einbehaltSkontoCents,
    bauabzugCents: bauabzug,
  });

  const id = genId("nurchn");
  await db.insert(schema.nuEingangsrechnungen).values({
    id,
    workspaceId,
    nuAuftragId: parsed.data.nuAuftragId,
    rechnungsnr: parsed.data.rechnungsnr,
    rechnungsdatum: parsed.data.rechnungsdatum,
    bruttoCents: parsed.data.bruttoCents,
    nettoCents: parsed.data.nettoCents,
    ustCents: parsed.data.ustCents,
    einbehaltSicherheitCents: einbehalte.sicherheitCents,
    einbehaltGewaehrleistungCents: einbehalte.gewaehrleistungCents,
    einbehaltSkontoCents: einbehalte.skontoCents,
    bauabzugEinbehaltCents: einbehalte.bauabzugCents,
    ausgezahltCents: einbehalte.ausgezahltCents,
    status: "eingegangen",
    notes: parsed.data.notes,
  });

  // Sicherheits-Konto-Buchung: pro Einbehalt-Art ein Eintrag
  const [project] = await db
    .select({
      abnahmeDate: schema.projects.abnahmeDate,
      warrantyEnd: schema.projects.warrantyEnd,
    })
    .from(schema.projects)
    .where(eq(schema.projects.id, auftrag.projektId))
    .limit(1);

  if (einbehalte.sicherheitCents > 0) {
    await db.insert(schema.nuSicherheitsKonto).values({
      id: genId("nukonto"),
      workspaceId,
      nuAuftragId: parsed.data.nuAuftragId,
      sourceRechnungId: id,
      art: "vertragserfuellung",
      einbehaltenerBetragCents: einbehalte.sicherheitCents,
      faelligAm: calcFaelligkeit({
        art: "vertragserfuellung",
        buchungDatum: parsed.data.rechnungsdatum,
        abnahmeDatum: project?.abnahmeDate ?? null,
        warrantyEndDatum: project?.warrantyEnd ?? null,
        vertragstyp: auftrag.vertragstyp,
      }),
      buchungDatum: parsed.data.rechnungsdatum,
    });
  }
  if (einbehalte.gewaehrleistungCents > 0) {
    await db.insert(schema.nuSicherheitsKonto).values({
      id: genId("nukonto"),
      workspaceId,
      nuAuftragId: parsed.data.nuAuftragId,
      sourceRechnungId: id,
      art: "gewaehrleistung",
      einbehaltenerBetragCents: einbehalte.gewaehrleistungCents,
      faelligAm: calcFaelligkeit({
        art: "gewaehrleistung",
        buchungDatum: parsed.data.rechnungsdatum,
        abnahmeDatum: project?.abnahmeDate ?? null,
        warrantyEndDatum: project?.warrantyEnd ?? null,
        vertragstyp: auftrag.vertragstyp,
      }),
      buchungDatum: parsed.data.rechnungsdatum,
    });
  }

  // Auftragsstatus auf laufend, falls noch offen
  if (auftrag.status === "offen") {
    await db
      .update(schema.nuAuftraege)
      .set({ status: "laufend", updatedAt: new Date() })
      .where(eq(schema.nuAuftraege.id, auftrag.id));
  }

  // void userId — nur für audit reserved
  void userId;

  revalidatePath(`/nu/${auftrag.nuId}/auftraege/${auftrag.id}`);
  revalidatePath(`/nu/${auftrag.nuId}/sicherheiten`);
  return ok({ id });
}

export async function updateNuRechnungStatus(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const parsed = nuRechnungStatusSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  const existing = await loadRechnung(workspaceId, parsed.data.id);
  if (!existing) return fail("Rechnung nicht gefunden.");
  if (!canTransitionRechnung(existing.status, parsed.data.status)) {
    return fail(
      `Status-Wechsel ${existing.status} → ${parsed.data.status} nicht erlaubt.`
    );
  }
  await db
    .update(schema.nuEingangsrechnungen)
    .set({
      status: parsed.data.status,
      zahlungsdatum: parsed.data.zahlungsdatum,
      freigabeAm:
        parsed.data.status === "geprueft" || parsed.data.status === "gezahlt"
          ? new Date()
          : existing.freigabeAm,
      freigabeDurch:
        parsed.data.status === "geprueft" || parsed.data.status === "gezahlt"
          ? userId
          : existing.freigabeDurch,
      updatedAt: new Date(),
    })
    .where(eq(schema.nuEingangsrechnungen.id, parsed.data.id));

  const auftrag = await loadAuftrag(workspaceId, existing.nuAuftragId);
  if (auftrag) {
    revalidatePath(`/nu/${auftrag.nuId}/auftraege/${auftrag.id}`);
  }
  return ok({ id: parsed.data.id });
}

/* ============== SICHERHEITS-KONTO ============== */

export async function freigebenSicherheit(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = nuKontoFreigabeSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }
  const [existing] = await db
    .select()
    .from(schema.nuSicherheitsKonto)
    .where(
      and(
        eq(schema.nuSicherheitsKonto.id, parsed.data.id),
        eq(schema.nuSicherheitsKonto.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!existing) return fail("Konto-Eintrag nicht gefunden.");
  if (existing.freigegebenAm) {
    return fail("Eintrag ist bereits freigegeben.");
  }
  if (parsed.data.freigabeBetragCents > existing.einbehaltenerBetragCents) {
    return fail(
      "Freigabe-Betrag darf den einbehaltenen Betrag nicht übersteigen."
    );
  }
  await db
    .update(schema.nuSicherheitsKonto)
    .set({
      freigegebenAm: new Date(),
      freigabeBetragCents: parsed.data.freigabeBetragCents,
      notes: parsed.data.notes
        ? `${existing.notes ? existing.notes + "\n" : ""}Freigabe: ${parsed.data.notes}`
        : existing.notes,
    })
    .where(eq(schema.nuSicherheitsKonto.id, parsed.data.id));
  const auftrag = await loadAuftrag(workspaceId, existing.nuAuftragId);
  if (auftrag) {
    revalidatePath(`/nu/${auftrag.nuId}/sicherheiten`);
    revalidatePath(`/nu/${auftrag.nuId}/auftraege/${auftrag.id}`);
  }
  return ok(undefined);
}

/* ============== REDIRECT-WRAPPERS ============== */

export async function createNuAuftragRedirect(formData: FormData): Promise<void> {
  const result = await createNuAuftrag(null, formData);
  const nuId = String(formData.get("nuId") ?? "");
  if (!result.ok) {
    redirect(
      `/nu/${nuId}/auftraege/new?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  redirect(`/nu/${nuId}/auftraege/${result.data.id}`);
}

export async function createNuRechnungRedirect(formData: FormData): Promise<void> {
  const result = await createNuRechnung(null, formData);
  const auftragId = String(formData.get("nuAuftragId") ?? "");
  if (!result.ok) {
    redirect(
      `/nu/auftraege/${auftragId}/rechnung/new?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  // Nach Erfolg zurück zur Auftrags-Detail-Seite — dort steht auch die Liste
  // der Rechnungen drin. Wir haben den auftragId, brauchen aber noch nuId.
  const workspaceId = await getCurrentWorkspaceId();
  const auftrag = await loadAuftrag(workspaceId, auftragId);
  if (auftrag) {
    redirect(`/nu/${auftrag.nuId}/auftraege/${auftragId}?created=${result.data.id}`);
  }
  redirect(`/nu`);
}
