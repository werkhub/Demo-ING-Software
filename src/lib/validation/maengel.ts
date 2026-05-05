/**
 * Zod-Schemas für die phasen-übergreifende Mängel-Erfassung (CRUD + Anzeigen).
 *
 * Im Gegensatz zu `mangelInputSchema` aus `./schemas.ts` (Quick-Capture aus
 * dem Abnahme-Detail) deckt dieses Schema alle Phasen ab und verlangt
 * `phase` + `gemeldetAm` als Pflichtfelder.
 */
import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    { message: "Datum im Format YYYY-MM-DD erwartet." }
  );

const requiredIsoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet.");

const optionalCents = z
  .union([z.string(), z.number(), z.literal("")])
  .optional()
  .transform((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return Math.round(n * 100); // Eingabe in € → Cents
  });

export const mangelPhase = z.enum([
  "ausfuehrung",
  "abnahme",
  "gewaehrleistung",
]);
export const mangelPrioritaet = z.enum([
  "niedrig",
  "mittel",
  "hoch",
  "kritisch",
]);
export const mangelStatus = z.enum([
  "offen",
  "in_bearbeitung",
  "behoben",
  "abgelehnt",
  "strittig",
]);
export const mangelVersandweg = z.enum([
  "email",
  "brief",
  "einschreiben",
  "uebergabe",
]);

const mangelBaseFields = {
  projectId: z.string().trim().min(1, "Projekt fehlt."),
  phase: mangelPhase,
  abnahmeId: optionalText(64),
  beschreibung: z
    .string()
    .trim()
    .min(5, "Beschreibung zu kurz.")
    .max(2000, "Beschreibung zu lang."),
  kategorie: optionalText(200),
  ortImBauwerk: optionalText(200),
  gemeldetVon: optionalText(200),
  gemeldetAm: requiredIsoDate,
  prioritaet: mangelPrioritaet.default("mittel"),
  fristsetzungDatum: optionalIsoDate,
  behebungBis: optionalIsoDate,
  kostenGeschaetztCents: optionalCents,
  notes: optionalText(2000),
};

export const mangelCreateSchema = z.object(mangelBaseFields);
export type MangelCreateInput = z.infer<typeof mangelCreateSchema>;

export const mangelEditSchema = z.object({
  id: z.string().trim().min(1, "Mangel-ID fehlt."),
  ...mangelBaseFields,
  status: mangelStatus,
  behobenAm: optionalIsoDate,
  behobenDurchNuId: optionalText(64),
  kostenIstCents: optionalCents,
});
export type MangelEditInput = z.infer<typeof mangelEditSchema>;

export const mangelStatusSchema = z.object({
  id: z.string().trim().min(1, "Mangel-ID fehlt."),
  status: mangelStatus,
});

export const mangelDeleteSchema = z.object({
  id: z.string().trim().min(1, "Mangel-ID fehlt."),
});

export const mangelAnzeigeCreateSchema = z
  .object({
    mangelId: z.string().trim().min(1, "Mangel-ID fehlt."),
    anzeigeAnUserId: optionalText(64),
    anzeigeAnExtern: optionalText(500),
    versendetAm: requiredIsoDate,
    versandweg: mangelVersandweg,
    inhaltText: z
      .string()
      .trim()
      .min(10, "Inhalt zu kurz.")
      .max(10_000, "Inhalt zu lang."),
    notes: optionalText(2000),
  })
  .refine(
    (data) =>
      (data.anzeigeAnUserId && data.anzeigeAnUserId.length > 0) ||
      (data.anzeigeAnExtern && data.anzeigeAnExtern.length > 0),
    {
      message: "Mindestens ein Adressat (intern oder extern) ist Pflicht.",
      path: ["anzeigeAnExtern"],
    }
  );
export type MangelAnzeigeCreateInput = z.infer<
  typeof mangelAnzeigeCreateSchema
>;

export const mangelAnzeigeAntwortSchema = z.object({
  id: z.string().trim().min(1, "Anzeige-ID fehlt."),
  antwortText: z
    .string()
    .trim()
    .min(1, "Antwort darf nicht leer sein.")
    .max(10_000),
  antwortDatum: requiredIsoDate,
});
