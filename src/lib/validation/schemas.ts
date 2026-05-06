import { z } from "zod";

const projectStatus = z.enum([
  "Geplant",
  "Bauphase",
  "Abnahme",
  "Gewährleistung",
  "Abgeschlossen",
]);

const contractType = z.enum([
  "bgb_werkvertrag",
  "vob_vertrag",
  "verbraucherbauvertrag",
]);

/** Optionales ISO-Datum YYYY-MM-DD aus FormData. Leerstring → null. */
const optionalIsoDate = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    { message: "Datum im Format YYYY-MM-DD erwartet." }
  );

const optionalContractType = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  contractType.nullable()
);

/** Boolean aus HTML-Checkbox: "on"/"true" → true, sonst false. */
const checkboxBool = z
  .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
  .optional()
  .transform((v) => v === "on" || v === "true");

const optionalPositiveNumber = z
  .union([z.string(), z.number(), z.literal("")])
  .optional()
  .transform((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  });

const projectBaseFields = {
  identifier: z
    .string()
    .trim()
    .min(1, "BV-Nummer fehlt.")
    .regex(
      /^[A-Za-z0-9-]{3,}$/,
      "BV-Nummer darf nur Buchstaben, Ziffern und Bindestriche enthalten (z. B. BV-2026-001)."
    ),
  name: z.string().trim().min(2, "Name zu kurz.").max(200, "Name zu lang."),
  ag: z.string().trim().min(2, "Auftraggeber fehlt.").max(200),
  value: z.coerce
    .number({ message: "Auftragsvolumen muss eine Zahl sein." })
    .positive("Auftragsvolumen muss > 0 sein.")
    .max(1_000_000_000, "Volumen unrealistisch hoch."),
  status: projectStatus.default("Bauphase"),
  contractType: optionalContractType,
  contractDate: optionalIsoDate,
  plannedCompletion: optionalIsoDate,
  abnahmeDate: optionalIsoDate,
  warrantyEnd: optionalIsoDate,
  siteAddress: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  penaltyClauseAgreed: checkboxBool,
  securityRetentionPercent: optionalPositiveNumber.refine(
    (v) => v === null || (v >= 0 && v <= 100),
    { message: "Sicherheitseinbehalt muss zwischen 0 und 100 liegen." }
  ),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
};

export const projectInputSchema = z.object(projectBaseFields);
export type ProjectInput = z.infer<typeof projectInputSchema>;

export const projectUpdateSchema = z.object({
  ...projectBaseFields,
  progress: z.coerce
    .number()
    .min(0, "Fortschritt min. 0.")
    .max(1, "Fortschritt max. 1 (= 100 %).")
    .optional()
    .default(0),
});
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;

export const projectIdSchema = z.object({
  id: z.string().trim().min(1, "Projekt-ID fehlt."),
});

/* ============== HOAI am Projekt (Sprint 2 Pivot) ============== */

const hoaiLeistungsbild = z.enum([
  "gebaeude",
  "ingenieurbau",
  "tragwerk",
  "tga",
]);
const hoaiHonorarzone = z.enum(["I", "II", "III", "IV", "V"]);
const hoaiSatz = z.enum(["min", "mittel", "max"]);

const hoaiCentsField = z.preprocess(
  (v) => {
    if (typeof v === "string") {
      const s = v.replace(/\s/g, "").replace(",", ".").trim();
      if (s.length === 0) return 0;
      const n = Number(s);
      if (Number.isNaN(n)) return 0;
      return Math.round(n * 100);
    }
    return v;
  },
  z.number().int().min(0).max(100_000_000_000)
);

/**
 * JSON-Stringified Array von Leistungsphasen (z.B. "[1,2,3,5,8]") oder
 * direkter Array-Input. Outputs als Array<number>.
 */
const hoaiLpsArray = z.preprocess(
  (v) => {
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        return [];
      }
    }
    return v;
  },
  z.array(z.number().int().min(1).max(9))
);

export const projectHoaiUpdateSchema = z.object({
  id: z.string().trim().min(1, "Projekt-ID fehlt."),
  hoaiLeistungsbild,
  hoaiHonorarzone,
  hoaiSatz,
  hoaiAnrechenbareKostenCents: hoaiCentsField,
  hoaiBeauftragteLpsJson: hoaiLpsArray,
  hoaiUmbauZuschlagPct: z.coerce.number().min(0).max(80).default(0),
  hoaiNebenkostenPct: z.coerce.number().min(0).max(50).default(0),
});
export type ProjectHoaiUpdateInput = z.infer<typeof projectHoaiUpdateSchema>;

export const fristInputSchema = z.object({
  task: z
    .string()
    .trim()
    .min(3, "Aufgabe zu kurz.")
    .max(300, "Aufgabe zu lang."),
  deadline: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet."),
  projectId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  legalBasis: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type FristInput = z.infer<typeof fristInputSchema>;

const bautagebuchCategory = z.enum([
  "allgemein",
  "anordnung",
  "behinderung",
  "mangel",
  "bedenken",
  "lieferung",
  "besichtigung",
  "personal",
]);

const optionalWeather = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  z
    .enum(["sonnig", "bewoelkt", "regen", "schnee", "frost", "sturm", "nebel"])
    .nullable()
);

const optionalInt = z
  .union([z.string(), z.number(), z.literal("")])
  .optional()
  .transform((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? Math.round(n) : null;
  });

const optionalNonNegativeNumber = z
  .union([z.string(), z.number(), z.literal("")])
  .optional()
  .transform((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n) || n < 0) return null;
    return n;
  });

export const bautagebuchInputSchema = z.object({
  projectId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  entryDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet."),
  category: bautagebuchCategory.default("allgemein"),
  text: z
    .string()
    .trim()
    .min(10, "Bitte mindestens 10 Zeichen schreiben.")
    .max(5000, "Eintrag zu lang (max. 5000 Zeichen)."),
  weatherCondition: optionalWeather,
  temperatureCelsius: optionalInt.refine(
    (v) => v === null || (v >= -40 && v <= 60),
    { message: "Temperatur unrealistisch." }
  ),
  staffHoursOwn: optionalNonNegativeNumber.refine(
    (v) => v === null || v <= 1000,
    { message: "Stunden unrealistisch hoch." }
  ),
  staffHoursSubcontractors: optionalNonNegativeNumber.refine(
    (v) => v === null || v <= 1000,
    { message: "Stunden unrealistisch hoch." }
  ),
  equipment: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  attachmentRefs: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type BautagebuchInput = z.infer<typeof bautagebuchInputSchema>;

export const bautagebuchIdSchema = z.object({
  id: z.string().trim().min(1, "Eintrag-ID fehlt."),
});

export const queryInputSchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, "Bitte mindestens 5 Zeichen eingeben.")
    .max(2000, "Anfrage zu lang (max. 2000 Zeichen)."),
  projectId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type QueryInput = z.infer<typeof queryInputSchema>;

export const fristIdSchema = z.object({
  id: z.string().trim().min(1, "Frist-ID fehlt."),
});

export const workspaceVobSettingsSchema = z.object({
  vobPreferredExternalProvider: z.enum(["all", "juris", "din_media", "beck_online"]),
});
export type WorkspaceVobSettingsInput = z.infer<typeof workspaceVobSettingsSchema>;

export const workspaceRoleSchema = z.object({
  workspaceRole: z.enum(["bauunternehmer", "bauherr", "ingenieurbuero"]),
});
export type WorkspaceRoleInput = z.infer<typeof workspaceRoleSchema>;

/**
 * Workspace-Fachprofil — Disziplinen, Subprofil-Preset, Auftraggeber-
 * Schwerpunkt, optionale Bürogröße. Disziplinen werden als JSON-String
 * (hidden field, vom Form-Client als JSON.stringify(array) gesetzt)
 * akzeptiert; Mehrfach-FormData ohne Zod-Adapter ist im Action-Stack
 * sonst sperrig.
 */
const disciplineEnum = z.enum([
  "hochbau_objektplanung",
  "tragwerksplanung",
  "tga",
  "bauphysik",
  "verkehrsanlagen",
  "ingenieurbauwerke",
  "freianlagen",
  "vermessung",
  "bauwerkspruefung",
  "sigeko_projektsteuerung",
]);

export const workspaceDisciplinesSchema = z.object({
  disciplines: z.preprocess((raw) => {
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string") {
      const trimmed = raw.trim();
      if (trimmed.startsWith("[")) {
        try {
          return JSON.parse(trimmed);
        } catch {
          return [];
        }
      }
      if (trimmed.length === 0) return [];
      return trimmed.split(",").map((s) => s.trim()).filter(Boolean);
    }
    return [];
  }, z.array(disciplineEnum).max(20)),
  disciplineSubprofile: z.enum([
    "hochbau_klassisch",
    "tiefbau_infrastruktur",
    "tga_spezialist",
    "tragwerk_spezialist",
    "generalplanung",
    "pruefingenieur",
    "custom",
  ]),
  clientFocus: z.enum(["privat", "gemischt", "oeffentlich"]),
  companySize: z.preprocess((raw) => {
    if (raw === "" || raw === null || raw === undefined) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? Math.round(n) : null;
  }, z.number().int().min(1).max(100000).nullable()),
});
export type WorkspaceDisciplinesInput = z.infer<typeof workspaceDisciplinesSchema>;

export const nachtragInputSchema = z.object({
  projectId: z.string().trim().min(1, "Projekt fehlt."),
  title: z.string().trim().min(3, "Titel zu kurz.").max(200),
  description: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  value: z.coerce.number().min(0).max(1_000_000_000).default(0),
  legalBasis: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  status: z
    .enum([
      "entwurf",
      "angekuendigt",
      "eingereicht",
      "anerkannt",
      "abgelehnt",
      "geschlossen",
    ])
    .default("entwurf"),
  trigger: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z
      .enum([
        "anordnung_ag",
        "bauseits_geaendert",
        "mengenmehrung",
        "behinderung",
        "sonstiges",
      ])
      .nullable()
  ),
  announcedAt: optionalIsoDate,
  submittedAt: optionalIsoDate,
  decidedAt: optionalIsoDate,
});
export type NachtragInput = z.infer<typeof nachtragInputSchema>;

export const contactInputSchema = z.object({
  projectId: z.string().trim().min(1, "Projekt fehlt."),
  role: z.enum([
    "ag_vertreter",
    "architekt",
    "fachplaner",
    "bauleiter_ag",
    "nachunternehmer",
    "sachverstaendiger",
    "anwalt",
    "sonstiges",
  ]),
  name: z.string().trim().min(2, "Name zu kurz.").max(200),
  organization: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  email: z
    .union([z.string().trim().email("Ungültige E-Mail."), z.literal("")])
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  phone: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type ContactInput = z.infer<typeof contactInputSchema>;

export const beweisChecklistInputSchema = z.object({
  projectId: z.string().trim().min(1, "Projekt fehlt."),
  anlass: z.string().trim().min(2).max(50),
  checksState: z.string().min(2),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type BeweisChecklistInput = z.infer<typeof beweisChecklistInputSchema>;

export const idOnlySchema = z.object({
  id: z.string().trim().min(1),
});

export const contractInputSchema = z.object({
  projectId: z.string().trim().min(1, "Projekt fehlt."),
  title: z.string().trim().min(2, "Titel zu kurz.").max(200),
  kind: z.enum(["hauptvertrag", "nachtragsvertrag", "buergschaft", "vereinbarung"]),
  contractText: z
    .string()
    .trim()
    .min(20, "Vertragstext zu kurz (min. 20 Zeichen).")
    .max(200_000, "Vertragstext zu lang."),
  signedAt: optionalIsoDate,
  partyAg: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  partyAn: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type ContractInput = z.infer<typeof contractInputSchema>;

export const subcontractorInputSchema = z.object({
  projectId: z.string().trim().min(1, "Projekt fehlt."),
  name: z.string().trim().min(2, "Name zu kurz.").max(200),
  organization: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  gewerk: z.string().trim().min(2, "Gewerk fehlt.").max(200),
  contractValue: optionalPositiveNumber,
  contractType: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.enum(["bgb_werkvertrag", "vob_vertrag"]).nullable()
  ),
  passThroughStatus: z
    .enum([
      "nicht_geprueft",
      "klausel_vorhanden",
      "klausel_fehlend",
      "konfliktig",
    ])
    .default("nicht_geprueft"),
  isForeign: checkboxBool,
  requiresCompliance: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    // Default: Compliance an. Nur explizites "false" deaktiviert.
    .transform((v) => v !== "false"),
  email: z
    .union([z.string().trim().email("Ungültige E-Mail."), z.literal("")])
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  phone: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  riskNotes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type SubcontractorInput = z.infer<typeof subcontractorInputSchema>;

const certificateKind = z.enum([
  "freistellung_48b",
  "unbedenklich_finanzamt",
  "soka_bau",
  "unbedenklich_kk",
  "bg_bau",
  "mindestlohn",
  "a1_entsendung",
  "gewerbeanmeldung",
  "haftpflicht",
]);

const certificateStatus = z.enum([
  "gueltig",
  "abgelaufen",
  "fehlt",
  "angefordert",
]);

const requiredIsoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet.");

export const certificateInputSchema = z.object({
  subcontractorId: z.string().trim().min(1, "NU-ID fehlt."),
  kind: certificateKind,
  issuer: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  issuedAt: optionalIsoDate,
  validUntil: requiredIsoDate,
  status: certificateStatus.default("gueltig"),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type CertificateInput = z.infer<typeof certificateInputSchema>;

export const certificateUpdateSchema = certificateInputSchema.extend({
  id: z.string().trim().min(1, "Bescheinigungs-ID fehlt."),
});
export type CertificateUpdate = z.infer<typeof certificateUpdateSchema>;

export const certificateRequestSchema = z.object({
  subcontractorId: z.string().trim().min(1),
  kind: certificateKind,
});

export const paymentReleaseToggleSchema = z.object({
  id: z.string().trim().min(1, "NU-ID fehlt."),
  blocked: z
    .union([z.literal("true"), z.literal("false")])
    .transform((v) => v === "true"),
});

/* ============== SICHERHEITEN ============== */

const securityKind = z.enum([
  "vertragserfuellung",
  "maengelanspruch",
  "vorauszahlung",
  "bareinbehalt",
  "bauhandwerker",
]);

const securityDirection = z.enum([
  "provided_to_ag",
  "received_from_ag",
  "provided_by_nu",
]);

const securityReleaseTrigger = z.enum([
  "bei_abnahme",
  "bei_gewaehrleistungsende",
  "manuell",
]);

const securityStatus = z.enum([
  "aktiv",
  "rueckgabe_angefordert",
  "freigegeben",
  "verfallen",
]);

export const securityInputSchema = z
  .object({
    projectId: z.string().trim().min(1, "Projekt fehlt."),
    kind: securityKind,
    direction: securityDirection.default("provided_to_ag"),
    subcontractorId: z
      .string()
      .trim()
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    provider: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    referenceNumber: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    amount: z.coerce
      .number({ message: "Betrag muss eine Zahl sein." })
      .positive("Betrag muss > 0 sein.")
      .max(1_000_000_000),
    percentOfContract: optionalPositiveNumber.refine(
      (v) => v === null || (v >= 0 && v <= 200),
      { message: "Prozent zwischen 0 und 200 erwartet." }
    ),
    currency: z
      .string()
      .trim()
      .max(3)
      .optional()
      .transform((v) => (v && v.length > 0 ? v.toUpperCase() : "EUR")),
    issuedAt: optionalIsoDate,
    validFrom: optionalIsoDate,
    validUntil: optionalIsoDate,
    releaseTrigger: securityReleaseTrigger.default("manuell"),
    notes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  // Bei manuell ist validUntil Pflicht — bei den anderen Triggern reicht die
  // Ableitung aus dem Projekt-Lebenszyklus.
  .refine(
    (v) => v.releaseTrigger !== "manuell" || v.validUntil !== null,
    {
      message: "Bei 'manuell' ist Geltungsende erforderlich.",
      path: ["validUntil"],
    }
  );
export type SecurityInput = z.infer<typeof securityInputSchema>;

export const securityUpdateSchema = z
  .object({
    id: z.string().trim().min(1, "Sicherheits-ID fehlt."),
    kind: securityKind,
    direction: securityDirection,
    provider: z
      .string()
      .trim()
      .max(200)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    referenceNumber: z
      .string()
      .trim()
      .max(100)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
    amount: z.coerce.number().positive().max(1_000_000_000),
    percentOfContract: optionalPositiveNumber,
    issuedAt: optionalIsoDate,
    validFrom: optionalIsoDate,
    validUntil: optionalIsoDate,
    releaseTrigger: securityReleaseTrigger,
    status: securityStatus,
    releasedAt: optionalIsoDate,
    notes: z
      .string()
      .trim()
      .max(2000)
      .optional()
      .transform((v) => (v && v.length > 0 ? v : null)),
  })
  .refine(
    (v) => v.releaseTrigger !== "manuell" || v.validUntil !== null,
    {
      message: "Bei 'manuell' ist Geltungsende erforderlich.",
      path: ["validUntil"],
    }
  );
export type SecurityUpdate = z.infer<typeof securityUpdateSchema>;

export const securityStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "Sicherheits-ID fehlt."),
  status: securityStatus,
});

/* ============== ANZEIGEN (BHA / Bedenken) ============== */

const anzeigeKind = z.enum(["behinderung", "bedenken"]);
const anzeigeStatus = z.enum([
  "entwurf",
  "versendet",
  "bestaetigt",
  "zurueckgewiesen",
  "erledigt",
]);
const anzeigeRecipientRole = z.enum([
  "ag_vertreter",
  "bauleiter_ag",
  "architekt",
  "fachplaner",
  "sonstiges",
]);
const anzeigeCausedBy = z.enum([
  "ag_anordnung",
  "fehlende_plaene",
  "vorgewerk",
  "hoehere_gewalt",
  "wetter",
  "streik",
  "sonstiges",
]);
const anzeigeConcernAbout = z.enum([
  "ausfuehrungsart",
  "bauseits_stoffe",
  "vorleistung",
  "planvorgabe",
  "sonstiges",
]);

const optionalText2000 = z
  .string()
  .trim()
  .max(2000)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalText200 = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalRecipientRole = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  anzeigeRecipientRole.nullable()
);
const optionalCausedBy = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  anzeigeCausedBy.nullable()
);
const optionalConcernAbout = z.preprocess(
  (v) => (v === "" || v === undefined ? null : v),
  anzeigeConcernAbout.nullable()
);

const anzeigeBaseShape = {
  projectId: z.string().trim().min(1, "Projekt fehlt."),
  kind: anzeigeKind,
  title: z.string().trim().min(3, "Titel zu kurz.").max(200),
  subjectMatter: z
    .string()
    .trim()
    .min(10, "Sachverhalt zu kurz (min. 10 Zeichen).")
    .max(2000),
  bodyMarkdown: z
    .string()
    .trim()
    .min(20, "Volltext zu kurz (min. 20 Zeichen).")
    .max(50_000),
  recipientName: optionalText200,
  recipientEmail: z
    .union([z.string().trim().email("Ungültige E-Mail."), z.literal("")])
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  recipientRole: optionalRecipientRole,
  // BHA
  obstructionStart: optionalIsoDate,
  estimatedDurationDays: optionalInt.refine(
    (v) => v === null || (v >= 0 && v <= 3650),
    { message: "Dauer unrealistisch (max. 10 Jahre)." }
  ),
  estimatedExtraCost: optionalNonNegativeNumber,
  causedBy: optionalCausedBy,
  // Bedenken
  concernAbout: optionalConcernAbout,
  potentialDamage: optionalText2000,
  proposedSolution: optionalText2000,
  sourceBautagebuchEntryId: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  notes: optionalText2000,
};

// Pflichtfeld-Refines pro kind — BHA braucht Beginn+Ursache, Bedenken braucht
// concernAbout. Wird auf input und update gleichermaßen angewendet.
type AnzeigeRefineable = {
  kind: "behinderung" | "bedenken";
  causedBy: string | null;
  obstructionStart: string | null;
  concernAbout: string | null;
};

function applyKindRefines<T extends z.ZodObject<z.ZodRawShape>>(schema: T) {
  return schema
    .refine(
      (v) =>
        (v as AnzeigeRefineable).kind !== "behinderung" ||
        ((v as AnzeigeRefineable).causedBy !== null &&
          (v as AnzeigeRefineable).obstructionStart !== null),
      {
        message: "Bei BHA: Beginn und Ursache sind Pflicht.",
        path: ["obstructionStart"],
      }
    )
    .refine(
      (v) =>
        (v as AnzeigeRefineable).kind !== "bedenken" ||
        (v as AnzeigeRefineable).concernAbout !== null,
      {
        message: "Bei Bedenken: Bedenken-Gegenstand ist Pflicht.",
        path: ["concernAbout"],
      }
    );
}

export const anzeigeInputSchema = applyKindRefines(z.object(anzeigeBaseShape));
export type AnzeigeInput = z.infer<typeof anzeigeInputSchema>;

export const anzeigeUpdateSchema = applyKindRefines(
  z.object({
    id: z.string().trim().min(1, "Anzeige-ID fehlt."),
    ...anzeigeBaseShape,
  })
);
export type AnzeigeUpdate = z.infer<typeof anzeigeUpdateSchema>;

export const anzeigeStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "Anzeige-ID fehlt."),
  status: anzeigeStatus,
});

export const anzeigeMarkSentSchema = z.object({
  id: z.string().trim().min(1),
  sentAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet."),
});

export const anzeigeMarkAcknowledgedSchema = z.object({
  id: z.string().trim().min(1),
  acknowledgedAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet."),
});

export const anzeigeMarkRespondedSchema = z.object({
  id: z.string().trim().min(1),
  responseReceivedAt: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet."),
  responseSummary: z.string().trim().max(5000).default(""),
  rejected: z
    .union([z.literal("true"), z.literal("false"), z.literal("")])
    .optional()
    .transform((v) => v === "true"),
});

/* ============== ABNAHME ============== */

const abnahmeKind = z.enum([
  "foermlich",
  "fiktiv",
  "konkludent",
  "teilabnahme",
  "verweigert",
]);

const abnahmeBeurteilung = z.enum([
  "mangelfrei",
  "mit_unwesentlichen_maengeln",
  "mit_wesentlichen_maengeln",
  "verweigert",
]);

// Seit Migration 0029: prioritaet ersetzt severity, status um abgelehnt/strittig erweitert.
const mangelPrioritaet = z.enum(["niedrig", "mittel", "hoch", "kritisch"]);
const mangelStatus = z.enum([
  "offen",
  "in_bearbeitung",
  "behoben",
  "abgelehnt",
  "strittig",
]);
const mangelPhase = z.enum(["ausfuehrung", "abnahme", "gewaehrleistung"]);

const abnahmeBaseShape = {
  projectId: z.string().trim().min(1, "Projekt fehlt."),
  kind: abnahmeKind,
  abnahmeDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet."),
  abnahmeOrt: optionalText200,
  scope: optionalText200,
  gesamtbeurteilung: abnahmeBeurteilung,
  attendees: z
    .string()
    .trim()
    .max(20_000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  vertragsstrafeAgreed: checkboxBool,
  vertragsstrafeReserved: checkboxBool,
  vertragsstrafeReservationText: optionalText2000,
  handoverComplete: checkboxBool,
  handoverNotes: optionalText2000,
  notes: optionalText2000,
};

export const abnahmeInputSchema = z.object(abnahmeBaseShape);
export type AbnahmeInput = z.infer<typeof abnahmeInputSchema>;

export const abnahmeUpdateSchema = z.object({
  id: z.string().trim().min(1, "Abnahme-ID fehlt."),
  ...abnahmeBaseShape,
});
export type AbnahmeUpdate = z.infer<typeof abnahmeUpdateSchema>;

/**
 * Form-Schema für Mangel-Erfassung aus dem Abnahme-Detail (Quick-Capture).
 * Setzt phase=abnahme, gemeldetAm=heute. Für die generische Mangel-Form
 * (alle Phasen) siehe `src/lib/validation/maengel.ts`.
 */
export const mangelInputSchema = z.object({
  abnahmeId: z.string().trim().min(1, "Abnahme-ID fehlt."),
  beschreibung: z
    .string()
    .trim()
    .min(5, "Beschreibung zu kurz.")
    .max(2000, "Beschreibung zu lang."),
  prioritaet: mangelPrioritaet.default("mittel"),
  kategorie: optionalText200,
  ortImBauwerk: optionalText200,
  fristsetzungDatum: optionalIsoDate,
  notes: optionalText2000,
});
export type MangelInput = z.infer<typeof mangelInputSchema>;

export const mangelUpdateSchema = z.object({
  id: z.string().trim().min(1, "Mangel-ID fehlt."),
  beschreibung: z
    .string()
    .trim()
    .min(5, "Beschreibung zu kurz.")
    .max(2000, "Beschreibung zu lang."),
  prioritaet: mangelPrioritaet,
  kategorie: optionalText200,
  ortImBauwerk: optionalText200,
  fristsetzungDatum: optionalIsoDate,
  status: mangelStatus,
  behobenAm: optionalIsoDate,
  notes: optionalText2000,
});
export type MangelUpdate = z.infer<typeof mangelUpdateSchema>;

export const mangelStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "Mangel-ID fehlt."),
  status: mangelStatus,
});

export { mangelPhase, mangelPrioritaet, mangelStatus };

/* ============== HINSCHG ============== */

const hinschgCategory = z.enum([
  "korruption",
  "diskriminierung",
  "arbeitssicherheit",
  "umwelt",
  "datenschutz",
  "finanz",
  "arbeitsrecht",
  "sonstiges",
]);

const hinschgStatus = z.enum([
  "eingegangen",
  "in_pruefung",
  "massnahme_ergriffen",
  "abgeschlossen",
  "unbegruendet",
  "archiviert",
]);

/**
 * Public-Form: Meldung einreichen (kein Auth, kein Workspace-Kontext —
 * der Workspace wird per Slug oder Subdomain in der Action aufgelöst).
 */
export const meldungInputSchema = z.object({
  workspaceId: z.string().trim().min(1, "Workspace fehlt."),
  category: hinschgCategory.default("sonstiges"),
  subject: z.string().trim().min(5, "Betreff zu kurz.").max(200),
  bodyText: z
    .string()
    .trim()
    .min(20, "Bitte mindestens 20 Zeichen schreiben.")
    .max(20_000, "Meldung zu lang."),
  reporterDisplayName: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  reporterContact: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type MeldungInput = z.infer<typeof meldungInputSchema>;

/** Public-Form: Folge-Nachricht des Hinweisgebers per Token. */
export const reporterReplySchema = z.object({
  accessToken: z.string().trim().min(10, "Token fehlt."),
  bodyText: z
    .string()
    .trim()
    .min(5, "Nachricht zu kurz.")
    .max(20_000, "Nachricht zu lang."),
});

/** Office: Status der Meldung ändern. */
export const meldungStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "Meldungs-ID fehlt."),
  status: hinschgStatus,
});

/** Office: Eingang bestätigen. */
export const meldungAckSchema = z.object({
  id: z.string().trim().min(1, "Meldungs-ID fehlt."),
});

/** Office: Antwort an Hinweisgeber + ggf. Status auf abgeschlossen. */
export const meldungOfficeReplySchema = z.object({
  id: z.string().trim().min(1, "Meldungs-ID fehlt."),
  bodyText: z
    .string()
    .trim()
    .min(5, "Antwort zu kurz.")
    .max(20_000, "Antwort zu lang."),
  setStatus: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    hinschgStatus.nullable()
  ),
  responseSummary: z
    .string()
    .trim()
    .max(5000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

/** Office: interne Notizen + Zuweisung. */
export const meldungInternalUpdateSchema = z.object({
  id: z.string().trim().min(1, "Meldungs-ID fehlt."),
  internalNotes: z
    .string()
    .trim()
    .max(20_000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  assignedToUserId: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

/** Workspace-Settings: HinSchG-Toggle + Office-E-Mail. */
export const hinschgSettingsSchema = z.object({
  hinschgEnabled: checkboxBool,
  hinschgOfficeContactEmail: z
    .union([z.string().trim().email("Ungültige E-Mail."), z.literal("")])
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
});

/**
 * Workspace-Settings: Geschäfts-Stammdaten für Ausgangsrechnungen / XRechnung.
 */
export const workspaceBusinessSchema = z.object({
  iban: z
    .string()
    .trim()
    .max(34)
    .optional()
    .transform((v) => (v && v.length > 0 ? v.replace(/\s+/g, "") : null)),
  bic: z
    .string()
    .trim()
    .max(11)
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : null)),
  bankName: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  taxId: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  vatId: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  address: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  email: z
    .union([z.string().trim().email("Ungültige E-Mail."), z.literal("")])
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  phone: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

/* ============== LV / GAEB ============== */

const lvItemKind = z.enum([
  "titel",
  "untertitel",
  "position",
  "eventual",
  "bedarfsposition",
  "stundenlohn",
]);

export const lvImportSchema = z.object({
  projectId: z.string().trim().min(1, "Projekt fehlt."),
});

export const lvItemUpdateSchema = z.object({
  id: z.string().trim().min(1, "Item-ID fehlt."),
  kind: lvItemKind,
  oz: optionalText200,
  shortText: z.string().trim().min(1, "Kurztext fehlt.").max(500),
  longText: z
    .string()
    .trim()
    .max(50_000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  quantity: optionalNonNegativeNumber,
  unit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  unitPrice: optionalNonNegativeNumber,
  vatPercent: z.coerce.number().min(0).max(100).default(19),
});
export type LvItemUpdate = z.infer<typeof lvItemUpdateSchema>;

export const lvItemAddSchema = z.object({
  lvId: z.string().trim().min(1, "LV-ID fehlt."),
  parentId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  kind: lvItemKind.default("position"),
  oz: optionalText200,
  shortText: z.string().trim().min(1, "Kurztext fehlt.").max(500),
  longText: z
    .string()
    .trim()
    .max(50_000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  quantity: optionalNonNegativeNumber,
  unit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  unitPrice: optionalNonNegativeNumber,
  vatPercent: z.coerce.number().min(0).max(100).default(19),
});

/* ============== AUFMASS ============== */

const aufmassStatus = z.enum([
  "entwurf",
  "eingereicht",
  "geprueft",
  "freigegeben",
  "abgerechnet",
]);
const aufmassZeileStatus = z.enum([
  "offen",
  "zugestimmt",
  "gekuerzt",
  "bestritten",
]);

export const aufmassCreateSchema = z.object({
  projectId: z.string().trim().min(1, "Projekt fehlt."),
  lvId: z.string().trim().min(1, "LV fehlt."),
  name: z.string().trim().min(2, "Name zu kurz.").max(200),
  periodStart: optionalIsoDate,
  periodEnd: optionalIsoDate,
  notes: optionalText2000,
});
export type AufmassCreateInput = z.infer<typeof aufmassCreateSchema>;

export const aufmassStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "Aufmaß-ID fehlt."),
  status: aufmassStatus,
});

export const aufmassZeileAddSchema = z.object({
  aufmassId: z.string().trim().min(1, "Aufmaß-ID fehlt."),
  lvItemId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  ozOverride: optionalText200,
  description: z.string().trim().min(1, "Beschreibung fehlt.").max(2000),
  formula: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  unit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  unitPrice: optionalNonNegativeNumber,
  notes: optionalText2000,
});

export const aufmassZeileUpdateSchema = z.object({
  id: z.string().trim().min(1, "Zeilen-ID fehlt."),
  ozOverride: optionalText200,
  description: z.string().trim().min(1, "Beschreibung fehlt.").max(2000),
  formula: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  unit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  unitPrice: optionalNonNegativeNumber,
  notes: optionalText2000,
});

export const aufmassZeileStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "Zeilen-ID fehlt."),
  status: aufmassZeileStatus,
  approvedQuantity: optionalNonNegativeNumber,
});

/* ============== AUFMASS-PRÜFER (Modul 13) ============== */

export const prueferTokenCreateSchema = z.object({
  aufmassId: z.string().trim().min(1, "Aufmaß-ID fehlt."),
  label: z
    .string()
    .trim()
    .min(2, "Bezeichnung zu kurz.")
    .max(200, "Bezeichnung zu lang."),
  validDays: z.coerce
    .number()
    .int()
    .min(1, "Mindestens 1 Tag.")
    .max(365, "Maximal 365 Tage.")
    .default(14),
});
export type PrueferTokenCreateInput = z.infer<typeof prueferTokenCreateSchema>;

export const prueferTokenIdSchema = z.object({
  tokenId: z.string().trim().min(1, "Token-ID fehlt."),
});

/**
 * Public-Form: Prüfer aktualisiert Zeilen-Status. Token validiert die
 * Berechtigung — keine Workspace-Auth.
 */
export const prueferZeileStatusSchema = z
  .object({
    token: z.string().trim().min(10, "Token fehlt."),
    zeileId: z.string().trim().min(1, "Zeilen-ID fehlt."),
    status: z.enum(["zugestimmt", "gekuerzt", "bestritten"]),
    approvedQuantity: optionalNonNegativeNumber,
  })
  .refine(
    (v) => v.status !== "gekuerzt" || v.approvedQuantity !== null,
    {
      message: 'Bei „Gekürzt" ist die anerkannte Menge Pflicht.',
      path: ["approvedQuantity"],
    }
  );
export type PrueferZeileStatusInput = z.infer<typeof prueferZeileStatusSchema>;

/* ============== AUSGANGSRECHNUNGEN ============== */

const arKind = z.enum(["abschlag", "schluss"]);
const arStatus = z.enum([
  "entwurf",
  "versendet",
  "teilweise_bezahlt",
  "bezahlt",
  "mahnung_1",
  "mahnung_2",
  "mahnung_3",
  "gerichtlich",
]);

const requiredIsoDateAr = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet.");

const optionalPositiveInt = z
  .union([z.string(), z.number(), z.literal("")])
  .optional()
  .transform((v) => {
    if (v === "" || v === undefined || v === null) return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
  });

export const ausgangsrechnungCreateSchema = z.object({
  projectId: z.string().trim().min(1, "Projekt fehlt."),
  aufmassId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  kind: arKind,
  abschlagNo: optionalPositiveInt,
  invoiceDate: requiredIsoDateAr,
  serviceStart: optionalIsoDate,
  serviceEnd: optionalIsoDate,
  dueDate: optionalIsoDate,
  skontoPercent: optionalNonNegativeNumber.refine(
    (v) => v === null || (v >= 0 && v <= 100),
    { message: "Skonto-Prozent muss zwischen 0 und 100 liegen." }
  ),
  skontoDays: optionalPositiveInt,
  vatPercent: z.coerce.number().min(0).max(100).default(19),
  subjectLine: optionalText200,
  previousAbschlaegeNet: z.coerce.number().min(0).default(0),
  securityRetentionPercent: optionalNonNegativeNumber.refine(
    (v) => v === null || (v >= 0 && v <= 100),
    { message: "Sicherheitseinbehalt zwischen 0 und 100." }
  ),
  partyAg: optionalText200,
  partyAgAddress: optionalText2000,
  partyAn: optionalText200,
  partyAnAddress: optionalText2000,
  partyAnTaxId: optionalText200,
  partyAnVatId: optionalText200,
  buyerReference: optionalText200,
  purchaseOrderRef: optionalText200,
  notes: optionalText2000,
});
export type AusgangsrechnungCreateInput = z.infer<
  typeof ausgangsrechnungCreateSchema
>;

export const ausgangsrechnungUpdateSchema = z.object({
  id: z.string().trim().min(1, "Rechnungs-ID fehlt."),
  invoiceDate: requiredIsoDateAr,
  serviceStart: optionalIsoDate,
  serviceEnd: optionalIsoDate,
  dueDate: optionalIsoDate,
  skontoPercent: optionalNonNegativeNumber,
  skontoDays: optionalPositiveInt,
  vatPercent: z.coerce.number().min(0).max(100).default(19),
  subjectLine: optionalText200,
  previousAbschlaegeNet: z.coerce.number().min(0).default(0),
  securityRetentionPercent: optionalNonNegativeNumber,
  partyAg: optionalText200,
  partyAgAddress: optionalText2000,
  partyAn: optionalText200,
  partyAnAddress: optionalText2000,
  partyAnTaxId: optionalText200,
  partyAnVatId: optionalText200,
  buyerReference: optionalText200,
  purchaseOrderRef: optionalText200,
  schlusszahlungsVorbehalt: optionalText2000,
  notes: optionalText2000,
});
export type AusgangsrechnungUpdateInput = z.infer<
  typeof ausgangsrechnungUpdateSchema
>;

export const ausgangsrechnungStatusUpdateSchema = z.object({
  id: z.string().trim().min(1),
  status: arStatus,
});

export const ausgangsrechnungMarkPaidSchema = z.object({
  id: z.string().trim().min(1),
  paidAt: requiredIsoDateAr,
  paidAmount: z.coerce.number().min(0),
});

export const arPositionAddSchema = z.object({
  ausgangsrechnungId: z.string().trim().min(1),
  oz: optionalText200,
  description: z.string().trim().min(1, "Beschreibung fehlt.").max(2000),
  quantity: optionalNonNegativeNumber,
  unit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  unitPrice: optionalNonNegativeNumber,
  vatPercent: z.coerce.number().min(0).max(100).default(19),
});

export const arPositionUpdateSchema = z.object({
  id: z.string().trim().min(1),
  oz: optionalText200,
  description: z.string().trim().min(1).max(2000),
  quantity: optionalNonNegativeNumber,
  unit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  unitPrice: optionalNonNegativeNumber,
  vatPercent: z.coerce.number().min(0).max(100).default(19),
});

export const arMahnungCreateSchema = z.object({
  ausgangsrechnungId: z.string().trim().min(1),
  level: z.coerce.number().int().min(1).max(3),
  issuedAt: requiredIsoDateAr,
  /** Optional Override — Default ist defaultZinsSatzPercent aus Vertragstyp. */
  zinsSatzPercent: optionalNonNegativeNumber,
  /** Optional Override — Default ist STANDARD_MAHNGEBUEHR[level]. */
  mahngebuehr: optionalNonNegativeNumber,
  notes: optionalText2000,
});

export const arMahnungUpdateBodySchema = z.object({
  id: z.string().trim().min(1),
  bodyText: z.string().trim().min(20).max(50_000),
});

export const arMahnungMarkSentSchema = z.object({
  id: z.string().trim().min(1),
  sentAt: requiredIsoDateAr,
});

/* ============== STUNDEN (Modul 3.2) ============== */

const lohnart = z.enum(["stunden", "monat"]);

const optionalIsoDateStunden = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    { message: "Datum im Format YYYY-MM-DD erwartet." }
  );

const requiredIsoDateStunden = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet.");

const cents = z.preprocess(
  (v) => {
    if (typeof v === "string") {
      const s = v.replace(",", ".").trim();
      if (s.length === 0) return 0;
      const n = Number(s);
      if (Number.isNaN(n)) return 0;
      return Math.round(n * 100);
    }
    return v;
  },
  z.number().int().min(0).max(1_000_000_00)
);

const stundenZahl = z.preprocess(
  (v) => {
    if (typeof v === "string") {
      const n = Number(v.replace(",", ".").trim());
      if (Number.isNaN(n)) return 0;
      return n;
    }
    return v;
  },
  z.number().min(0).max(24)
);

export const mitarbeiterInputSchema = z.object({
  name: z.string().trim().min(2).max(120),
  personalnummer: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  lohnart,
  stundensatzCents: cents,
  monatsgehaltCents: cents.optional().default(0),
  monatsSollStunden: z
    .preprocess(
      (v) => {
        if (typeof v === "string") {
          const n = Number(v.replace(",", ".").trim());
          if (Number.isNaN(n)) return 173.33;
          return n;
        }
        return v;
      },
      z.number().min(1).max(300)
    )
    .optional()
    .default(173.33),
  kostenstelle: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  gewerk: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  eintrittDatum: optionalIsoDateStunden,
  austrittDatum: optionalIsoDateStunden,
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const mitarbeiterUpdateSchema = mitarbeiterInputSchema.extend({
  id: z.string().trim().min(1),
  aktiv: z.preprocess(
    (v) =>
      v === "on" || v === "true" || v === true || v === 1 || v === "1",
    z.boolean()
  ),
});

export const mitarbeiterIdSchema = z.object({
  id: z.string().trim().min(1),
});

export const stundenInputSchema = z.object({
  mitarbeiterId: z.string().trim().min(1),
  projektId: z.string().trim().min(1),
  datum: requiredIsoDateStunden,
  stunden: stundenZahl,
  taetigkeit: z
    .string()
    .trim()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  lvPositionId: z
    .string()
    .trim()
    .max(40)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  /** HOAI-Leistungsphase 1-9 (optional, bei Ingenieurbüros relevant). */
  leistungsphase: z
    .preprocess(
      (v) => {
        if (v === "" || v === undefined || v === null) return null;
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
      },
      z.number().int().min(1).max(9).nullable()
    )
    .optional()
    .default(null),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const stundenUpdateSchema = stundenInputSchema.extend({
  id: z.string().trim().min(1),
});

export const stundenIdSchema = z.object({
  id: z.string().trim().min(1),
});

export const stundenWocheLockSchema = z.object({
  jahr: z.coerce.number().int().min(2020).max(2100),
  kw: z.coerce.number().int().min(1).max(53),
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

/* ============== NU-OPERATIONS (Modul 3.6) ============== */

const nuVertragstyp = z.enum(["vob", "bgb", "werkvertrag"]);
const nuAuftragStatus = z.enum(["offen", "laufend", "fertig", "gekuendigt"]);
const nuRechnungStatus = z.enum([
  "eingegangen",
  "geprueft",
  "gezahlt",
  "strittig",
]);

const optionalIsoDateNu = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .refine(
    (v) => v === null || /^\d{4}-\d{2}-\d{2}$/.test(v),
    { message: "Datum im Format YYYY-MM-DD erwartet." }
  );

const requiredIsoDateNu = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet.");

const centsNu = z.preprocess(
  (v) => {
    if (typeof v === "string") {
      const s = v.replace(",", ".").trim();
      if (s.length === 0) return 0;
      const n = Number(s);
      if (Number.isNaN(n)) return 0;
      return Math.round(n * 100);
    }
    return v;
  },
  z.number().int().min(0).max(1_000_000_000_00)
);

const pctZeroOrPositive = z.coerce.number().min(0).max(100);

export const nuAuftragInputSchema = z.object({
  nuId: z.string().trim().min(1),
  projektId: z.string().trim().min(1),
  auftragsnr: z.string().trim().min(1).max(60),
  auftragsdatum: requiredIsoDateNu,
  gewerk: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  auftragssummeNettoCents: centsNu,
  ustSatzPct: z.coerce.number().min(0).max(30).default(19),
  vertragstyp: nuVertragstyp.default("vob"),
  sicherheitseinbehaltPct: pctZeroOrPositive.default(0),
  gewaehrleistungseinbehaltPct: pctZeroOrPositive.default(0),
  vertragsstrafePct: pctZeroOrPositive.default(0),
  leistungsBeginn: optionalIsoDateNu,
  leistungsEnde: optionalIsoDateNu,
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const nuAuftragUpdateSchema = nuAuftragInputSchema.extend({
  id: z.string().trim().min(1),
  status: nuAuftragStatus,
});

export const nuAuftragIdSchema = z.object({
  id: z.string().trim().min(1),
});

export const nuRechnungInputSchema = z.object({
  nuAuftragId: z.string().trim().min(1),
  rechnungsnr: z.string().trim().min(1).max(60),
  rechnungsdatum: requiredIsoDateNu,
  bruttoCents: centsNu,
  nettoCents: centsNu,
  ustCents: centsNu.optional().default(0),
  einbehaltSkontoCents: centsNu.optional().default(0),
  bauabzugEinbehaltCents: centsNu.optional().default(0),
  notes: z
    .string()
    .trim()
    .max(1000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const nuRechnungStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: nuRechnungStatus,
  zahlungsdatum: optionalIsoDateNu,
});

export const nuKontoFreigabeSchema = z.object({
  id: z.string().trim().min(1),
  freigabeBetragCents: centsNu,
  notes: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type NuAuftragInput = z.infer<typeof nuAuftragInputSchema>;
export type NuRechnungInput = z.infer<typeof nuRechnungInputSchema>;

export function formDataToObject(formData: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    obj[key] = value;
  }
  return obj;
}

/* ============== VORGÄNGE (UC1) ============== */

export const vorgangCategorySchema = z.enum([
  "maengelruege",
  "anlieferung",
  "vertragspflicht",
  "sonstiges",
]);

export const vorgangStatusSchema = z.enum([
  "offen",
  "in_bearbeitung",
  "wartet_auf_anwalt",
  "abgeschlossen",
  "archiviert",
]);

const optionalAssignee = z
  .string()
  .trim()
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

export const vorgangInputSchema = z.object({
  title: z.string().trim().min(3, "Titel zu kurz.").max(200, "Titel zu lang."),
  projectId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  category: vorgangCategorySchema.default("sonstiges"),
  status: vorgangStatusSchema.default("offen"),
  assignedTo: optionalAssignee,
  dueDate: optionalIsoDate,
});
export type VorgangInputData = z.infer<typeof vorgangInputSchema>;

export const vorgangUpdateSchema = vorgangInputSchema.extend({
  riskScore: z.coerce.number().min(0).max(100).optional().default(0),
});
export type VorgangUpdateData = z.infer<typeof vorgangUpdateSchema>;

export const vorgangIdSchema = z.object({
  id: z.string().trim().min(1, "Vorgang-ID fehlt."),
});

export const vorgangStatusUpdateSchema = z.object({
  id: z.string().trim().min(1),
  status: vorgangStatusSchema,
});

export const vorgangDraftSchema = z.object({
  vorgangId: z.string().trim().min(1, "Vorgang-ID fehlt."),
  recipientEmail: z
    .union([z.string().trim().email("Ungültige E-Mail."), z.literal("")])
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  subject: z.string().trim().max(300).default(""),
  bodyMarkdown: z
    .string()
    .max(50_000, "Entwurfstext zu lang.")
    .default(""),
});
export type VorgangDraftData = z.infer<typeof vorgangDraftSchema>;

export const vorgangLinkSchema = z.object({
  vorgangId: z.string().trim().min(1),
  targetKind: z.enum([
    "project",
    "contract",
    "bautagebuch",
    "frist",
    "vorgang",
    "rechnung",
  ]),
  targetId: z.string().trim().min(1),
});

/* ============== TRIGGER-ACTIONS ============== */

const optionalProjectId = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

const optionalEmail = z
  .union([z.string().trim().email("Ungültige E-Mail."), z.literal("")])
  .optional()
  .transform((v) => (v && v !== "" ? v : null));

export const triggerByEntryIdSchema = z.object({
  entryId: z.string().trim().min(1, "Eintrag-ID fehlt.").max(200),
});

export const triggerByContractIdSchema = z.object({
  id: z.string().trim().min(1, "Vertrag-ID fehlt.").max(200),
});

export const ruegeTriggerSchema = z.object({
  text: z
    .string()
    .trim()
    .min(30, "Rüge-Text zu kurz (min. 30 Zeichen).")
    .max(50_000, "Rüge-Text zu lang (max. 50.000 Zeichen)."),
  projectId: optionalProjectId,
  recipientEmail: optionalEmail,
});

export const vergabeTriggerSchema = z.object({
  /** Plattform-URL ist optional — Analyse kann auch nur aus Text laufen. */
  url: z
    .union([z.string().trim().url("Ungültige URL."), z.literal("")])
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  /** Aufforderungs-/BVB-/ZVB-Auszug. Mindestens eines von text|url muss befüllt sein. */
  text: z
    .string()
    .trim()
    .max(100_000, "Text zu lang (max. 100.000 Zeichen).")
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  /** Datei-Liste als JSON-String aus dem Client (Name + Größe — kein Upload in dieser Phase). */
  filesJson: z
    .string()
    .trim()
    .max(20_000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  projectId: optionalProjectId,
}).refine((d) => d.url || (d.text && d.text.length >= 50), {
  message: "Bitte URL oder mindestens 50 Zeichen Text einfügen.",
  path: ["text"],
});

export const abnahmeMangelSchema = z.object({
  projectId: z.string().trim().min(1, "Projekt-ID fehlt.").max(200),
  description: z
    .string()
    .trim()
    .min(5, "Mangel-Beschreibung zu kurz (min. 5 Zeichen).")
    .max(2000, "Mangel-Beschreibung zu lang (max. 2000 Zeichen)."),
});

export const projectStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "Projekt-ID fehlt.").max(200),
  status: z.enum([
    "Geplant",
    "Bauphase",
    "Abnahme",
    "Gewährleistung",
    "Abgeschlossen",
  ]),
});

export const passThroughStatusUpdateSchema = z.object({
  id: z.string().trim().min(1, "NU-ID fehlt.").max(200),
  passThroughStatus: z.enum([
    "nicht_geprueft",
    "klausel_vorhanden",
    "klausel_fehlend",
    "konfliktig",
  ]),
});

/* ============== RECHNUNGEN (UC5) ============== */

export const rechnungInputSchema = z.object({
  supplierName: z
    .string()
    .trim()
    .min(2, "Lieferant fehlt.")
    .max(200, "Lieferant zu lang."),
  projectId: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  invoiceDate: optionalIsoDate,
  dueDate: optionalIsoDate,
  totalNet: optionalNonNegativeNumber,
  totalGross: optionalNonNegativeNumber,
  currency: z
    .string()
    .trim()
    .max(3)
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : "EUR")),
});
export type RechnungInputData = z.infer<typeof rechnungInputSchema>;

export const rechnungIdSchema = z.object({
  id: z.string().trim().min(1, "Rechnungs-ID fehlt."),
});

export const rechnungStatusUpdateSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(["eingegangen", "geprueft", "freigegeben", "abgelehnt"]),
});

/* ============== MATERIAL & LIEFERSCHEINE (Modul 3.4) ============== */

const bestellungStatus = z.enum([
  "offen",
  "teilgeliefert",
  "vollstaendig",
  "storniert",
]);

const lieferscheinStatus = z.enum([
  "eingegangen",
  "geprueft",
  "reklamation",
  "abgeschlossen",
]);

const materialMatchStatus = z.enum(["ok", "abweichung", "unklar"]);

const requiredIsoDateMaterial = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Datum im Format YYYY-MM-DD erwartet.");

const centsMaterial = z.preprocess(
  (v) => {
    if (typeof v === "string") {
      const s = v.replace(",", ".").trim();
      if (s.length === 0) return 0;
      const n = Number(s);
      if (Number.isNaN(n)) return 0;
      return Math.round(n * 100);
    }
    return v;
  },
  z.number().int().min(0).max(1_000_000_000_00)
);

export const bestellungPositionInputSchema = z.object({
  posNr: z.string().trim().min(1, "Pos-Nr fehlt.").max(20),
  bezeichnung: z.string().trim().min(1, "Bezeichnung fehlt.").max(500),
  menge: z.coerce.number().min(0).max(1_000_000),
  einheit: z.string().trim().min(1, "Einheit fehlt.").max(20),
  einzelpreisCents: centsMaterial,
  gesamtpreisCents: centsMaterial,
  lvPositionId: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const bestellungInputSchema = z.object({
  projektId: z.string().trim().min(1, "Projekt fehlt."),
  lieferantName: z.string().trim().min(2, "Lieferant fehlt.").max(200),
  lieferantId: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  bestellnummer: z.string().trim().min(1, "Bestellnummer fehlt.").max(60),
  datum: requiredIsoDateMaterial,
  summeNettoCents: centsMaterial,
  ustSatzPct: z.coerce.number().min(0).max(30).default(19),
  /** JSON-Array der Positionen — als Hidden-Field aus dem Form. */
  positionenJson: z
    .string()
    .trim()
    .optional()
    .default("[]"),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type BestellungInput = z.infer<typeof bestellungInputSchema>;

export const lieferscheinPositionInputSchema = z.object({
  bezeichnung: z.string().trim().min(1, "Bezeichnung fehlt.").max(500),
  menge: z.coerce.number().min(0).max(1_000_000),
  einheit: z.string().trim().min(1, "Einheit fehlt.").max(20),
  bestellposId: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  mangelText: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const lieferscheinInputSchema = z.object({
  projektId: z.string().trim().min(1, "Projekt fehlt."),
  bestellungId: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  lsNr: z.string().trim().min(1, "LS-Nr fehlt.").max(60),
  datum: requiredIsoDateMaterial,
  lieferantName: z.string().trim().min(2, "Lieferant fehlt.").max(200),
  angenommenVon: z
    .string()
    .trim()
    .max(120)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  positionenJson: z
    .string()
    .trim()
    .optional()
    .default("[]"),
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});
export type LieferscheinInput = z.infer<typeof lieferscheinInputSchema>;

export const lieferscheinReklamationSchema = z.object({
  id: z.string().trim().min(1, "LS-ID fehlt."),
  mangelText: z.string().trim().min(5, "Mangel-Beschreibung zu kurz.").max(2000),
});

export const materialMatchInputSchema = z.object({
  bestellungId: z.string().trim().min(1, "Bestellung-ID fehlt."),
  rechnungId: z.string().trim().min(1, "Rechnungs-ID fehlt."),
  /** JSON-Array von LS-IDs. Leer-Array OK, falls kein LS verknüpft. */
  lsIdsJson: z.string().trim().optional().default("[]"),
  toleranzPctMenge: z.coerce.number().min(0).max(100).optional().default(2),
  toleranzCents: z.coerce.number().int().min(0).optional().default(0),
});

export { bestellungStatus, lieferscheinStatus, materialMatchStatus };

/* ============== RECHNUNGEN (UC5 — Positionen) ============== */

export const rechnungPositionSchema = z.object({
  rechnungId: z.string().trim().min(1),
  positionIndex: z.coerce.number().int().min(0),
  lvPosition: z
    .string()
    .trim()
    .max(50)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  description: z.string().trim().min(1).max(500),
  quantity: z.coerce.number().min(0).default(0),
  unit: z
    .string()
    .trim()
    .max(20)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  unitPrice: z.coerce.number().min(0).default(0),
  totalPrice: z.coerce.number().min(0).default(0),
});
export type RechnungPositionData = z.infer<typeof rechnungPositionSchema>;
