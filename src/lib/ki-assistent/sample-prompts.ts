/**
 * Beispiel-Prompts für den Floating-KI-Assistenten.
 *
 * Werden beim Öffnen des Drawers angezeigt und mit dem Namen eines real
 * vorhandenen Projekts vorbelegt — so klickt der User nicht in einen
 * leeren Demo-Platzhalter, sondern auf eine sofort sinnvolle Frage.
 *
 * Drei Kategorien pro Sample-Prompt:
 *   data         — Daten-Frage (Status, Kontakte, Risiko, Abrechnung)
 *   navigation   — „Wo finde ich X?"
 *   howto        — „Wie mache ich X?"
 *
 * Lokalisiert in de + en. Die UI wählt die passende Locale.
 */
import type { WorkspaceRole } from "@/db/schema";
import type { Locale } from "./feature-index";

export type SamplePromptKind = "data" | "navigation" | "howto";

export type SamplePrompt = {
  /** Kurzer Button-Label (≤ 40 Zeichen). Mit `{{project}}`-Platzhalter. */
  label: string;
  /** Vollständige Frage, ebenfalls mit `{{project}}`-Platzhalter. */
  template: string;
  kind: SamplePromptKind;
};

type LocalizedPrompt = Record<Locale, SamplePrompt>;

/* ------------------------------ Common ----------------------------------- */

const COMMON: LocalizedPrompt[] = [
  {
    de: {
      label: "Wo stehen wir bei {{project}}?",
      template:
        "Wo stehen wir bei {{project}}? Status, Fortschritt, offene Themen.",
      kind: "data",
    },
    en: {
      label: "How is {{project}} doing?",
      template:
        "How is {{project}} doing? Status, progress, open topics.",
      kind: "data",
    },
  },
  {
    de: {
      label: "Wer ist Projektleiter bei {{project}}?",
      template:
        "Wer ist bei {{project}} Projektleiter, und wer ist der Ansprechpartner auf AG-Seite?",
      kind: "data",
    },
    en: {
      label: "Who is the project manager for {{project}}?",
      template:
        "Who is the project manager for {{project}}, and who is the client-side contact?",
      kind: "data",
    },
  },
  {
    de: {
      label: "Wie viel ist bei {{project}} abgerechnet?",
      template:
        "Wie viel ist bei {{project}} bisher abgerechnet, und welche Forderungen sind noch offen?",
      kind: "data",
    },
    en: {
      label: "How much has been billed for {{project}}?",
      template:
        "How much has been billed for {{project}} so far, and which receivables are still open?",
      kind: "data",
    },
  },
  {
    de: {
      label: "Akute Risiken über alle Projekte",
      template:
        "Welche akuten Risiken gibt es aktuell über alle Projekte hinweg — kritische Fristen, High-Risk-Vorgänge, kritische Mängel?",
      kind: "data",
    },
    en: {
      label: "Acute risks across all projects",
      template:
        "Which acute risks exist across all projects right now — critical deadlines, high-risk cases, critical defects?",
      kind: "data",
    },
  },
  {
    de: {
      label: "Wo finde ich die Vorgangsliste?",
      template:
        "Wo in LexBau finde ich die Vorgangsliste, und wie lege ich einen neuen Vorgang an?",
      kind: "navigation",
    },
    en: {
      label: "Where do I find the case list?",
      template:
        "Where do I find the case list in LexBau, and how do I create a new case?",
      kind: "navigation",
    },
  },
  {
    de: {
      label: "Wie versende ich eine Behinderungsanzeige?",
      template:
        "Wie versende ich eine Behinderungsanzeige nach § 6 VOB/B in LexBau?",
      kind: "howto",
    },
    en: {
      label: "How do I send an obstruction notice?",
      template:
        "How do I send an obstruction notice (§ 6 VOB/B) in LexBau?",
      kind: "howto",
    },
  },
];

/* --------------------------- Bauunternehmer ------------------------------ */

const BAUUNTERNEHMER: LocalizedPrompt[] = [
  {
    de: {
      label: "Offene Mängel bei {{project}}",
      template:
        "Welche Mängel sind bei {{project}} aktuell offen, und welche Fristen laufen?",
      kind: "data",
    },
    en: {
      label: "Open defects on {{project}}",
      template:
        "Which defects on {{project}} are currently open, and which deadlines are running?",
      kind: "data",
    },
  },
  {
    de: {
      label: "Anomalien Eingangsrechnungen",
      template:
        "Welche Eingangsrechnungen haben aktuell Anomalien, und bei welchem Projekt gehören sie hin?",
      kind: "data",
    },
    en: {
      label: "Anomalies on incoming invoices",
      template:
        "Which incoming invoices currently have anomalies, and which project do they belong to?",
      kind: "data",
    },
  },
  {
    de: {
      label: "Wie scanne ich einen Vertrag?",
      template:
        "Wie scanne ich einen Vertrag auf Risikoklauseln und welche Schritte sind danach nötig?",
      kind: "howto",
    },
    en: {
      label: "How do I scan a contract?",
      template:
        "How do I scan a contract for risk clauses, and what are the next steps?",
      kind: "howto",
    },
  },
];

/* ------------------------------ Bauherr ---------------------------------- */

const BAUHERR: LocalizedPrompt[] = [
  {
    de: {
      label: "Was muss ich diese Woche entscheiden?",
      template:
        "Was steht diese Woche zur Entscheidung an — Anordnungen, Bemusterungen, Mängel, die ich rügen sollte?",
      kind: "data",
    },
    en: {
      label: "What do I need to decide this week?",
      template:
        "What is up for decision this week — orders, sampling rounds, defects to formally notify?",
      kind: "data",
    },
  },
  {
    de: {
      label: "Sicherheiten-Status alle Projekte",
      template:
        "Wie ist der Sicherheiten-Status über alle Projekte? Bürgschaften, Bareinbehalte, Rückgabe-Termine.",
      kind: "data",
    },
    en: {
      label: "Securities status across projects",
      template:
        "What is the security status across all projects? Bonds, retentions, return dates.",
      kind: "data",
    },
  },
];

/* --------------------------- Ingenieurbüro ------------------------------ */

const INGENIEURBUERO: LocalizedPrompt[] = [
  {
    de: {
      label: "HOAI-Stand bei {{project}}",
      template:
        "Welche Leistungsphasen sind bei {{project}} beauftragt, was ist davon erledigt, und wie sieht der Honorarstand aus?",
      kind: "data",
    },
    en: {
      label: "HOAI status on {{project}}",
      template:
        "Which HOAI service phases on {{project}} are commissioned, what is completed, and what is the fee status?",
      kind: "data",
    },
  },
  {
    de: {
      label: "Wo finde ich den HOAI-Rechner?",
      template:
        "Wo finde ich den HOAI-Rechner und wie berechne ich ein Honorar nach § 35?",
      kind: "navigation",
    },
    en: {
      label: "Where is the HOAI calculator?",
      template:
        "Where is the HOAI calculator and how do I compute a fee for § 35?",
      kind: "navigation",
    },
  },
  {
    de: {
      label: "Wie erfasse ich Stunden je Leistungsphase?",
      template:
        "Wie erfasse ich Stunden je Mitarbeiter und Leistungsphase und welche Plausi-Checks gibt es?",
      kind: "howto",
    },
    en: {
      label: "How do I record hours per service phase?",
      template:
        "How do I record hours per employee and HOAI phase, and which plausibility checks exist?",
      kind: "howto",
    },
  },
];

function pickByLocale(
  prompts: LocalizedPrompt[],
  locale: Locale
): SamplePrompt[] {
  return prompts.map((p) => p[locale]);
}

export function getSamplePrompts(
  role: WorkspaceRole,
  locale: Locale = "de"
): SamplePrompt[] {
  const common = pickByLocale(COMMON, locale);
  switch (role) {
    case "bauunternehmer":
      return [...common, ...pickByLocale(BAUUNTERNEHMER, locale)];
    case "bauherr":
      return [...common, ...pickByLocale(BAUHERR, locale)];
    case "ingenieurbuero":
      return [...common, ...pickByLocale(INGENIEURBUERO, locale)];
  }
}

/**
 * Ersetzt `{{project}}` in der Template-String durch einen lesbaren
 * Projektnamen. Wenn keine Projekte existieren, fällt die Vorlage auf
 * „einem Projekt" / „a project" zurück.
 */
export function fillPromptTemplate(
  template: string,
  projectName: string | null,
  locale: Locale = "de"
): string {
  if (!template.includes("{{project}}")) return template;
  const replacement = projectName
    ? `"${projectName}"`
    : locale === "en"
      ? "a project"
      : "einem Projekt";
  return template.replaceAll("{{project}}", replacement);
}
