/**
 * Zod-Validierung für die Geräte-Domain (Stamm + Disposition + Wartung).
 *
 * Geld-Beträge werden in Euro eingegeben und in Cents persistiert — die
 * `cents`-Preprozessor-Logik analog Stunden-Modul.
 */
import { z } from "zod";

const requiredIsoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet.");

const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    { message: "Datum im Format YYYY-MM-DD erwartet." }
  );

const optionalTime = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine(
    (v) => v === null || /^\d{2}:\d{2}$/.test(v),
    { message: "Zeit im Format HH:MM erwartet." }
  );

const optionalText200 = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalText2000 = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalCents = z.preprocess(
  (v) => {
    if (v === "" || v === undefined || v === null) return null;
    if (typeof v === "string") {
      const s = v.replace(",", ".").trim();
      if (s.length === 0) return null;
      const n = Number(s);
      if (Number.isNaN(n)) return null;
      return Math.round(n * 100);
    }
    if (typeof v === "number") return Math.round(v * 100);
    return null;
  },
  z.number().int().min(0).max(1_000_000_000_00).nullable()
);

const optionalYear = z.preprocess(
  (v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return null;
    return Math.round(n);
  },
  z.number().int().min(1900).max(2100).nullable()
);

export const kategorieSchema = z.enum([
  "kran",
  "bagger",
  "radlader",
  "geruest",
  "handwerk",
  "fahrzeug",
  "sonstiges",
]);

export const geraetStatusSchema = z.enum([
  "verfuegbar",
  "disponiert",
  "in_wartung",
  "defekt",
  "ausgemustert",
]);

export const eigentumSchema = z.enum(["eigen", "miete", "leasing"]);

const geraeteBaseShape = {
  kategorie: kategorieSchema,
  bezeichnung: z
    .string()
    .trim()
    .min(2, "Bezeichnung zu kurz.")
    .max(200, "Bezeichnung zu lang."),
  inventarNr: optionalText200,
  hersteller: optionalText200,
  baujahr: optionalYear,
  status: geraetStatusSchema.default("verfuegbar"),
  eigentum: eigentumSchema.default("eigen"),
  mietPartner: optionalText200,
  mietBisDatum: optionalIsoDate,
  kaufdatum: optionalIsoDate,
  kaufpreisCents: optionalCents,
  currentValueCents: optionalCents,
  notes: optionalText2000,
};

// Bei Miete/Leasing ist mietBisDatum Pflicht — sonst läuft der Reminder ins Leere.
function applyMieteRefine<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
  return schema.refine(
    (v) => {
      const eigentum = (v as { eigentum: string }).eigentum;
      const mietBis = (v as { mietBisDatum: string | null }).mietBisDatum;
      if (eigentum === "miete" || eigentum === "leasing") {
        return mietBis !== null;
      }
      return true;
    },
    {
      message: "Bei Miete/Leasing ist das Rückgabedatum erforderlich.",
      path: ["mietBisDatum"],
    }
  );
}

export const geraeteInputSchema = applyMieteRefine(z.object(geraeteBaseShape));
export type GeraeteInput = z.infer<typeof geraeteInputSchema>;

export const geraeteUpdateSchema = applyMieteRefine(
  z.object({
    id: z.string().trim().min(1, "Geräte-ID fehlt."),
    ...geraeteBaseShape,
  })
);
export type GeraeteUpdate = z.infer<typeof geraeteUpdateSchema>;

export const geraeteIdSchema = z.object({
  id: z.string().trim().min(1, "Geräte-ID fehlt."),
});

/* ============== DISPOSITION ============== */

export const dispositionStatusSchema = z.enum([
  "geplant",
  "aktiv",
  "zurueck",
  "storniert",
]);

export const dispositionInputSchema = z
  .object({
    geraetId: z.string().trim().min(1, "Geräte-ID fehlt."),
    projektId: z.string().trim().min(1, "Projekt fehlt."),
    vonDatum: requiredIsoDate,
    bisDatum: requiredIsoDate,
    vonZeit: optionalTime,
    bisZeit: optionalTime,
    polierUserId: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    status: dispositionStatusSchema.default("geplant"),
    notes: optionalText2000,
  })
  .refine((v) => v.bisDatum >= v.vonDatum, {
    message: "Rückgabe darf nicht vor dem Beginn liegen.",
    path: ["bisDatum"],
  });
export type DispositionInput = z.infer<typeof dispositionInputSchema>;

export const dispositionStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "Dispositions-ID fehlt."),
  status: dispositionStatusSchema,
});

/* ============== WARTUNG ============== */

export const wartungArtSchema = z.enum([
  "uvv_pruefung",
  "tuev",
  "inspektion",
  "reparatur",
]);

export const wartungInputSchema = z.object({
  geraetId: z.string().trim().min(1, "Geräte-ID fehlt."),
  art: wartungArtSchema,
  faelligAm: requiredIsoDate,
  durchgefuehrtAm: optionalIsoDate,
  durchgefuehrtVon: optionalText200,
  kostenCents: optionalCents,
  prueferzeugnisFilename: optionalText200,
  notes: optionalText2000,
});
export type WartungInput = z.infer<typeof wartungInputSchema>;

export const wartungMarkDoneSchema = z.object({
  id: z.string().trim().min(1, "Wartungs-ID fehlt."),
  durchgefuehrtAm: requiredIsoDate,
  durchgefuehrtVon: optionalText200,
  kostenCents: optionalCents,
  prueferzeugnisFilename: optionalText200,
  notes: optionalText2000,
});
