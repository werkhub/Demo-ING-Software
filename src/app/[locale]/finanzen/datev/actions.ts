"use server";

import path from "node:path";
import fs from "node:fs/promises";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspace,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { genId } from "@/lib/utils";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { formDataToObject } from "@/lib/validation/schemas";
import {
  buildExtfFile,
  type Buchungssatz,
  type ExtfHeader,
} from "@/lib/datev/extf";
import {
  buildLohnBuchungen,
  buildVerkaufBuchungen,
} from "@/lib/datev/builders";
import type { DatevExportArt, DatevKontenrahmen } from "@/db/schema";

const exportSchema = z.object({
  art: z.enum(["verkauf", "einkauf_nu", "lohn"]),
  zeitraumVon: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  zeitraumBis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  kontenrahmen: z.enum(["skr03", "skr04"]),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

const idSchema = z.object({ id: z.string().trim().min(1) });

const UPLOAD_BASE = path.join(process.cwd(), "data", "uploads", "datev");

async function ensureUploadDir(workspaceId: string): Promise<string> {
  const dir = path.join(UPLOAD_BASE, workspaceId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

function isoToYyyymmdd(iso: string): string {
  return iso.replaceAll("-", "");
}

function buildHeader(
  workspace: Awaited<ReturnType<typeof getCurrentWorkspace>>,
  art: DatevExportArt,
  zeitraumVon: string,
  zeitraumBis: string,
  kontenrahmen: DatevKontenrahmen
): ExtfHeader {
  const now = new Date();
  const wjStart = workspace.datevWjStartMmdd ?? "0101";
  const wjMm = wjStart.slice(0, 2);
  const wjDd = wjStart.slice(2, 4);
  return {
    beraterNr: workspace.datevBeraterNr ?? 0,
    mandantNr: workspace.datevMandantNr ?? 0,
    wjBeginnYyyymmdd: `${now.getFullYear()}${wjMm}${wjDd}`,
    sachkontenlaenge: kontenrahmen === "skr04" ? 4 : 4,
    datumVonYyyymmdd: isoToYyyymmdd(zeitraumVon),
    datumBisYyyymmdd: isoToYyyymmdd(zeitraumBis),
    bezeichnung: `${art} ${zeitraumVon}–${zeitraumBis}`,
    diktatkuerzel: "LB",
    buchungstyp: 1,
    waehrung: "EUR",
  };
}

export async function createDatevExport(
  _prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const [workspaceId, userId, workspace] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
    getCurrentWorkspace(),
  ]);

  const parsed = exportSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) {
    return fail("Eingabe ungültig.", parsed.error.flatten().fieldErrors);
  }

  const { art, zeitraumVon, zeitraumBis, kontenrahmen, notes } = parsed.data;

  if (zeitraumVon > zeitraumBis) {
    return fail("Zeitraum-Von muss vor Zeitraum-Bis liegen.");
  }
  if (workspace.datevBeraterNr === null || workspace.datevBeraterNr === undefined) {
    return fail(
      "DATEV-Berater-Nr. nicht gesetzt. Erst in den Workspace-Einstellungen konfigurieren."
    );
  }
  if (workspace.datevMandantNr === null || workspace.datevMandantNr === undefined) {
    return fail("DATEV-Mandant-Nr. nicht gesetzt.");
  }

  // Buchungssätze bauen
  let buchungen: Buchungssatz[] = [];
  if (art === "verkauf") {
    const ars = await db
      .select()
      .from(schema.ausgangsrechnungen)
      .where(eq(schema.ausgangsrechnungen.workspaceId, workspaceId));
    buchungen = buildVerkaufBuchungen({
      ars,
      rahmen: kontenrahmen,
      mappingJson: workspace.datevKontenMappingJson,
      zeitraumVon,
      zeitraumBis,
    });
  } else if (art === "lohn") {
    const stunden = await db
      .select()
      .from(schema.stunden)
      .where(eq(schema.stunden.workspaceId, workspaceId));
    const ma = await db
      .select()
      .from(schema.mitarbeiter)
      .where(eq(schema.mitarbeiter.workspaceId, workspaceId));
    const maMap = new Map(ma.map((m) => [m.id, m]));
    buchungen = buildLohnBuchungen({
      stunden,
      mitarbeiter: maMap,
      rahmen: kontenrahmen,
      mappingJson: workspace.datevKontenMappingJson,
      zeitraumVon,
      zeitraumBis,
    });
  } else {
    return fail(
      "NU-Eingang-Export kommt mit Modul 3.6 (NU-Operations). Aktuell nicht verfügbar."
    );
  }

  // Header + EXTF-Buffer
  const header = buildHeader(
    workspace,
    art,
    zeitraumVon,
    zeitraumBis,
    kontenrahmen
  );
  const buffer = buildExtfFile(header, buchungen);

  // Persist auf Disk
  const id = genId("dx");
  const dir = await ensureUploadDir(workspaceId);
  const filename = `EXTF_${art}_${zeitraumVon}_${zeitraumBis}_${kontenrahmen}.csv`;
  const filePath = path.join(dir, `${id}_${filename}`);
  await fs.writeFile(filePath, buffer);

  // Summe in Cents (für Audit)
  const summeCents = buchungen.reduce(
    (sum, b) => sum + Math.round(b.umsatzEur * 100),
    0
  );

  await db.insert(schema.datevExports).values({
    id,
    workspaceId,
    art,
    zeitraumVon,
    zeitraumBis,
    kontenrahmen,
    filename,
    filePath,
    anzahlBuchungen: buchungen.length,
    summeCents,
    waehrung: "EUR",
    erstelltVon: userId,
    notes,
  });

  revalidatePath("/finanzen/datev");
  return ok({ id });
}

export async function deleteDatevExport(
  _prev: ActionResult<void> | null,
  formData: FormData
): Promise<ActionResult<void>> {
  const workspaceId = await getCurrentWorkspaceId();
  const parsed = idSchema.safeParse(formDataToObject(formData));
  if (!parsed.success) return fail("ID fehlt.");
  const [row] = await db
    .select()
    .from(schema.datevExports)
    .where(
      and(
        eq(schema.datevExports.id, parsed.data.id),
        eq(schema.datevExports.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!row) return fail("Export nicht gefunden.");
  // File löschen (best-effort)
  try {
    await fs.unlink(row.filePath);
  } catch {
    // already missing — ok
  }
  await db
    .delete(schema.datevExports)
    .where(eq(schema.datevExports.id, parsed.data.id));
  revalidatePath("/finanzen/datev");
  return ok(undefined);
}

/* ============== REDIRECT-WRAPPER ============== */

export async function createDatevExportRedirect(
  formData: FormData
): Promise<void> {
  const result = await createDatevExport(null, formData);
  if (!result.ok) {
    redirect(
      `/finanzen/datev/new?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  redirect(`/finanzen/datev?created=${result.data.id}`);
}
