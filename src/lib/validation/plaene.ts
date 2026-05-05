import { z } from "zod";

export const PLAN_TYPEN = [
  "architektur",
  "statik",
  "tga",
  "elektro",
  "sanitaer",
  "detail",
  "sonstiges",
] as const;

export const PLAN_STATUS = [
  "entwurf",
  "zur_freigabe",
  "freigegeben",
  "aufgehoben",
] as const;

export const FREIGABE_STATUS = [
  "offen",
  "zugestimmt",
  "abgelehnt",
  "zurueckgestellt",
] as const;

const optionalString = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    "Datum im Format YYYY-MM-DD erwartet."
  );

export const planCreateSchema = z.object({
  projektId: z.string().trim().min(1, "Projekt fehlt."),
  planTyp: z.enum(PLAN_TYPEN),
  planNr: z.string().trim().min(1, "Plan-Nr fehlt.").max(60),
  bezeichnung: z.string().trim().min(2, "Bezeichnung zu kurz.").max(200),
  masstab: optionalString,
  datum: optionalIsoDate,
  planerName: optionalString,
  notes: optionalString,
});

export const planUpdateSchema = planCreateSchema.extend({
  id: z.string().trim().min(1, "Plan-ID fehlt."),
  status: z.enum(PLAN_STATUS),
});

export const versionCreateSchema = z.object({
  planId: z.string().trim().min(1, "Plan-ID fehlt."),
  datum: optionalIsoDate,
  kommentar: optionalString,
  /** Index-Label nach Ingenieurbüro-Konvention (A/B/C oder 0/1/2). */
  indexLabel: z
    .string()
    .trim()
    .max(8, "Max. 8 Zeichen.")
    .regex(/^([A-Za-z]+|\d+)$/, "Nur A-Z oder Ziffern.")
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : null)),
  indexKategorie: z.enum(["entwurf", "freigegeben"]).default("freigegeben"),
});

/** Plan-Versand (neuer Eintrag). */
export const planVersandCreateSchema = z.object({
  planVersionId: z.string().trim().min(1, "Version-ID fehlt."),
  empfaengerName: z.string().trim().min(2, "Empfänger fehlt.").max(200),
  empfaengerEmail: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  empfaengerRolle: optionalString,
  versandDatum: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum YYYY-MM-DD."),
  versandweg: z.enum(["email", "brief", "einschreiben", "uebergabe", "upload"]),
  betreff: optionalString,
  kommentar: optionalString,
});

/** Eingangsbestätigung markieren. */
export const planVersandBestaetigenSchema = z.object({
  id: z.string().trim().min(1),
  eingangBestaetigtAm: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum YYYY-MM-DD."),
});

export const freigabeCreateSchema = z.object({
  planVersionId: z.string().trim().min(1, "Version-ID fehlt."),
  freigabeDurchUserId: optionalString,
  freigabeDurchName: optionalString,
  freigabeRolle: optionalString,
});

export const freigabeUpdateSchema = z.object({
  id: z.string().trim().min(1, "Freigabe-ID fehlt."),
  freigabeStatus: z.enum(FREIGABE_STATUS),
  freigabeKommentar: optionalString,
});

export const dokumentCreateSchema = z.object({
  projektId: z.string().trim().min(1, "Projekt fehlt."),
  kategorie: z.string().trim().min(1, "Kategorie fehlt.").max(60),
  bezeichnung: z.string().trim().min(2).max(200),
  vertraulichPct: z
    .union([z.string(), z.number(), z.literal("")])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || v === null) return 0;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) return 0;
      return Math.min(100, Math.max(0, Math.round(n)));
    }),
  notes: optionalString,
});

export const idOnlySchema = z.object({
  id: z.string().trim().min(1, "ID fehlt."),
});

export type PlanCreateInput = z.infer<typeof planCreateSchema>;
export type PlanUpdateInput = z.infer<typeof planUpdateSchema>;
export type VersionCreateInput = z.infer<typeof versionCreateSchema>;
export type FreigabeCreateInput = z.infer<typeof freigabeCreateSchema>;
export type FreigabeUpdateInput = z.infer<typeof freigabeUpdateSchema>;
export type DokumentCreateInput = z.infer<typeof dokumentCreateSchema>;
