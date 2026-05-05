import { z } from "zod";
import { ALL_BUCKETS } from "@/lib/dsgvo/buckets";

export const auskunftSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(2, "Identifier zu kurz (min. 2 Zeichen).")
    .max(200, "Identifier zu lang."),
});

export type AuskunftInput = z.infer<typeof auskunftSchema>;

export const loeschenSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(2, "Identifier zu kurz (min. 2 Zeichen).")
    .max(200, "Identifier zu lang."),
  reason: z
    .string()
    .trim()
    .min(5, "Begründung erforderlich (z. B. Antragsnummer)."),
  except: z
    .array(z.enum([...ALL_BUCKETS] as [string, ...string[]]))
    .optional()
    .default([]),
});

export type LoeschenInput = z.infer<typeof loeschenSchema>;
