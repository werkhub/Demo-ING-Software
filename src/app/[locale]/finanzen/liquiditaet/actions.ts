"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/validation/schemas";
import {
  aggregateLohnByMonth,
  buildForecast,
  type ForecastInputAr,
  type ForecastInputLohnMonat,
  type ForecastInputMiete,
  type ForecastInputNuRechnung,
} from "@/lib/liquiditaet/forecast";

const szenarioInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  basisdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  horizontTage: z.coerce.number().int().min(7).max(365).default(90),
  annahmeFristTageAn: z.coerce.number().int().min(0).max(120).default(14),
  annahmeFristTageNu: z.coerce.number().int().min(0).max(120).default(30),
  kontostandStartCents: z.preprocess(
    (v) => {
      if (typeof v === "string") {
        const n = Number(v.replace(",", ".").trim());
        if (Number.isNaN(n)) return 0;
        return Math.round(n * 100);
      }
      return v;
    },
    z.number().int()
  ),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

const idSchema = z.object({ id: z.string().trim().min(1) });

async function loadAggregates(workspaceId: string): Promise<{
  ars: ForecastInputAr[];
  nuRechnungen: ForecastInputNuRechnung[];
  lohnMonate: ForecastInputLohnMonat[];
  mieten: ForecastInputMiete[];
}> {
  const [ars, nuR, stundenRows, geraeteMieten] = await Promise.all([
    db
      .select({
        invoiceDate: schema.ausgangsrechnungen.invoiceDate,
        dueDate: schema.ausgangsrechnungen.dueDate,
        bruttoCents: schema.ausgangsrechnungen.payoutGross,
        status: schema.ausgangsrechnungen.status,
        paidAt: schema.ausgangsrechnungen.paidAt,
      })
      .from(schema.ausgangsrechnungen)
      .where(eq(schema.ausgangsrechnungen.workspaceId, workspaceId)),
    db
      .select({
        rechnungsdatum: schema.nuEingangsrechnungen.rechnungsdatum,
        zahlungsdatum: schema.nuEingangsrechnungen.zahlungsdatum,
        bruttoCents: schema.nuEingangsrechnungen.bruttoCents,
        ausgezahltCents: schema.nuEingangsrechnungen.ausgezahltCents,
        status: schema.nuEingangsrechnungen.status,
      })
      .from(schema.nuEingangsrechnungen)
      .where(eq(schema.nuEingangsrechnungen.workspaceId, workspaceId)),
    db
      .select({
        datum: schema.stunden.datum,
        stunden: schema.stunden.stunden,
        stundensatzCents: schema.stunden.stundensatzCents,
      })
      .from(schema.stunden)
      .where(eq(schema.stunden.workspaceId, workspaceId)),
    // Geräte-Mieten optional — Tabelle hat ggf. monatlich-Felder. Wir
    // lassen das vorerst leer, weil das Geräte-Schema das nicht direkt
    // modelliert (Modul 3.3 hat eigentum/miet_partner, aber keinen
    // monatlichen Mietbetrag). Wenn vorhanden: ergänzen.
    Promise.resolve([] as ForecastInputMiete[]),
  ]);

  // payoutGross ist real (€). Convert to cents.
  const arsConverted: ForecastInputAr[] = ars.map((a) => ({
    invoiceDate: a.invoiceDate,
    dueDate: a.dueDate,
    bruttoCents: Math.round(Number(a.bruttoCents) * 100),
    status: a.status,
    paidAt: a.paidAt,
  }));
  const lohnMonate = aggregateLohnByMonth(stundenRows);
  return {
    ars: arsConverted,
    nuRechnungen: nuR.map((r) => ({
      rechnungsdatum: r.rechnungsdatum,
      zahlungsdatum: r.zahlungsdatum,
      bruttoCents: r.bruttoCents,
      ausgezahltCents: r.ausgezahltCents,
      status: r.status,
    })),
    lohnMonate,
    mieten: geraeteMieten,
  };
}

export async function createSzenario(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);
  const parsed = szenarioInputSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }

  const id = genId("liq");
  await db.insert(schema.liquiditaetSzenarien).values({
    id,
    workspaceId,
    name: parsed.data.name,
    basisdatum: parsed.data.basisdatum,
    horizontTage: parsed.data.horizontTage,
    annahmeZahlungsfristTageAn: parsed.data.annahmeFristTageAn,
    annahmeZahlungsfristTageNu: parsed.data.annahmeFristTageNu,
    kontostandStartCents: parsed.data.kontostandStartCents,
    notes: parsed.data.notes,
    erstelltVon: userId,
  });

  // Forecast bauen + Zeitreihe persistieren
  const inputs = await loadAggregates(workspaceId);
  const rows = buildForecast({
    config: {
      basisdatum: parsed.data.basisdatum,
      horizontTage: parsed.data.horizontTage,
      annahmeFristTageAn: parsed.data.annahmeFristTageAn,
      annahmeFristTageNu: parsed.data.annahmeFristTageNu,
      kontostandStartCents: parsed.data.kontostandStartCents,
    },
    ...inputs,
  });

  if (rows.length > 0) {
    await db.insert(schema.liquiditaetZeitreihe).values(
      rows.map((r) => ({
        id: genId("liqz"),
        szenarioId: id,
        workspaceId,
        datum: r.datum,
        einnahmenCents: r.einnahmenCents,
        ausgabenCents: r.ausgabenCents,
        saldoCents: r.saldoCents,
        kontostandCents: r.kontostandCents,
        kommentar: r.kommentar,
      }))
    );
  }

  revalidatePath("/finanzen/liquiditaet");
  return ok({ id });
}

export async function deleteSzenario(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = idSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fail("ID fehlt.");
  await db
    .delete(schema.liquiditaetSzenarien)
    .where(
      and(
        eq(schema.liquiditaetSzenarien.id, parsed.data.id),
        eq(schema.liquiditaetSzenarien.workspaceId, workspaceId)
      )
    );
  revalidatePath("/finanzen/liquiditaet");
  return ok(undefined);
}

/* Redirect-Wrapper */

export async function createSzenarioRedirect(formData: FormData): Promise<void> {
  const result = await createSzenario(null, formData);
  if (!result.ok) {
    redirect(
      `/finanzen/liquiditaet/new?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  redirect(`/finanzen/liquiditaet/${result.data.id}`);
}
