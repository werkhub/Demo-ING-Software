/**
 * Mock-Provider für den KI-Assistenten — Heuristik über den Workspace-Snapshot.
 *
 * Erkennt drei Antwort-Klassen:
 *   1. Daten-Fragen (Status, Kontakte, Abrechnung, Risiko, Frist)
 *   2. Navigations-Fragen ("wo finde ich X")
 *   3. How-To-Fragen ("wie mache ich X")
 *
 * Lokalisiert in de + en, gesteuert über `snapshot.locale`. Sobald Claude
 * scharfgeschaltet ist (`KI_ASSISTANT_PROVIDER=claude`), übernimmt der echte
 * Provider — der Mock bleibt Fallback und Demo-Modus.
 */
import "server-only";
import type {
  KiAssistantInput,
  KiAssistantOutput,
  KiAssistantProvider,
} from "./provider";
import type {
  FeatureCatalogEntry,
  ProjectSnapshot,
  WorkspaceSnapshot,
} from "./snapshot";
import type { Locale } from "./feature-index";

/* -------------------------------------------------------------------------- */
/*                              Lokalisierung                                 */
/* -------------------------------------------------------------------------- */

type L = Record<Locale, string>;

const TXT = {
  header: { de: "**Quick-Antwort · Demo-Modus**", en: "**Quick answer · Demo mode**" } as L,
  headerHint: {
    de: "_Heuristik über Workspace-Daten und Modul-Index — Live-Claude-Anbindung folgt._",
    en: "_Heuristic over workspace data and module index — live Claude integration coming._",
  } as L,
  paid: { de: "Bezahlt (brutto)", en: "Paid (gross)" } as L,
  open: { de: "Offene Forderungen (brutto)", en: "Open receivables (gross)" } as L,
  contacts: { de: "Kontakte", en: "Contacts" } as L,
  billing: { de: "Abrechnung", en: "Billing" } as L,
  risks: { de: "Risiken & Fristen", en: "Risks & deadlines" } as L,
  totalBilling: { de: "Abrechnung gesamt", en: "Total billing" } as L,
  riskState: { de: "Risiko-Lage", en: "Risk situation" } as L,
  topRisks: { de: "Top-Risiken", en: "Top risks" } as L,
  projects: { de: "Projekte", en: "Projects" } as L,
  noContacts: {
    de: '_Keine Bauleiter- oder AG-Kontakte hinterlegt. Im Projekt unter "Kontakte" pflegen._',
    en: '_No site manager or client contacts on file. Add them under "Contacts" on the project._',
  } as L,
  bauleiter: { de: "Bauleiter (intern)", en: "Site manager (internal)" } as L,
  agKontakt: { de: "AG-Ansprechpartner", en: "Client contact" } as L,
  noRisks: { de: "Keine akuten Risiken erkannt.", en: "No acute risks detected." } as L,
  critFrist: {
    de: "kritische Frist(en) (≤ 1 Tag)",
    en: "critical deadline(s) (≤ 1 day)",
  } as L,
  thisWeek: {
    de: "Frist(en) diese Woche",
    en: "deadline(s) this week",
  } as L,
  highRiskOps: {
    de: "High-Risk-Vorgänge (Risk ≥ 60)",
    en: "high-risk cases (risk ≥ 60)",
  } as L,
  openOps: { de: "offene Vorgänge gesamt", en: "open cases total" } as L,
  openMaengel: { de: "offene Mangel(e)", en: "open defect(s)" } as L,
  status: { de: "Status", en: "Status" } as L,
  progress: { de: "Fortschritt", en: "Progress" } as L,
  honorar: { de: "Honorar netto", en: "Fee (net)" } as L,
  navHeader: { de: "Wegweiser", en: "Way finder" } as L,
  notVisible: {
    de: "Dieses Modul existiert in LexBau, ist in deinem Workspace aber aktuell nicht aktiviert",
    en: "This module exists in LexBau but is not currently active in your workspace",
  } as L,
  reasons: {
    wrong_workspace_type: {
      de: "Workspace-Typ passt nicht (z. B. Bauunternehmer- statt Ingenieurbüro-Funktion)",
      en: "Workspace type does not match (e.g. contractor- vs engineering-firm feature)",
    },
    discipline_missing: {
      de: "Keine passende Fachdisziplin am Workspace gesetzt",
      en: "No matching discipline configured on the workspace",
    },
    client_focus_mismatch: {
      de: "Auftraggeber-Schwerpunkt passt nicht",
      en: "Client focus does not match",
    },
    company_size_too_small: {
      de: "Bürogröße liegt unter dem Mindestwert dieses Moduls",
      en: "Company size is below the module minimum",
    },
    admin_only: {
      de: "Nur für Workspace-Admins sichtbar",
      en: "Visible only to workspace admins",
    },
    flag_disabled: {
      de: "Workspace-Flag ist deaktiviert (z. B. HinSchG)",
      en: "Workspace flag is disabled (e.g. HinSchG)",
    },
  } satisfies Record<NonNullable<FeatureCatalogEntry["visibilityReason"]>, L>,
  howtoHeader: {
    de: "Schritte",
    en: "Steps",
  } as L,
  workflowsTitle: {
    de: "Typische Abläufe",
    en: "Typical workflows",
  } as L,
  related: { de: "Verwandte Module", en: "Related modules" } as L,
  workspaceLabel: { de: "Workspace", en: "Workspace" } as L,
  roleLabel: { de: "Rolle", en: "Role" } as L,
  noProjectsHint: {
    de: "Keine Projekte vorhanden — lege ein Projekt unter [Projekte](/projekte) an.",
    en: "No projects yet — create one under [Projects](/projekte).",
  } as L,
};

function t(key: keyof typeof TXT, locale: Locale): string {
  const entry = TXT[key];
  if (entry && typeof entry === "object" && "de" in entry) {
    return (entry as L)[locale];
  }
  return "";
}

/* -------------------------------------------------------------------------- */
/*                                 Helpers                                    */
/* -------------------------------------------------------------------------- */

function fmtEuro(cents: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "en" ? "en-GB" : "de-DE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function normalizeToken(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ");
}

function matchProject(
  question: string,
  projects: ProjectSnapshot[]
): ProjectSnapshot | null {
  const q = normalizeToken(question);
  for (const p of projects) {
    if (q.includes(normalizeToken(p.identifier))) return p;
  }
  const candidates = projects
    .map((p) => {
      const tokens = normalizeToken(p.name)
        .split(" ")
        .filter((tok) => tok.length >= 4);
      const score = tokens.filter((tok) => q.includes(tok)).length;
      return { p, score, longest: Math.max(0, ...tokens.map((tok) => tok.length)) };
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score || b.longest - a.longest);
  return candidates[0]?.p ?? null;
}

/**
 * Findet ein passendes Modul für eine Navigations-/Howto-Frage. Matched über
 * Modul-Label (verfügbar in beiden Locales über die menschenlesbare Form),
 * Use-Case-Stichworte und Beschreibung.
 */
function matchFeature(
  question: string,
  features: FeatureCatalogEntry[]
): FeatureCatalogEntry | null {
  const q = normalizeToken(question);
  let best: { f: FeatureCatalogEntry; score: number } | null = null;
  for (const f of features) {
    const haystack = [
      f.label,
      f.description ?? "",
      ...f.useCases,
      ...f.workflows.flatMap((w) => [w.title, ...w.steps]),
    ]
      .map(normalizeToken)
      .join(" ");
    let score = 0;
    // Label-Direkttreffer (wertvollster Hit)
    const labelTokens = normalizeToken(f.label)
      .split(" ")
      .filter((tok) => tok.length >= 4);
    for (const tok of labelTokens) {
      if (q.includes(tok)) score += 3;
    }
    // Use-Case- und Workflow-Stichworte
    for (const tok of q.split(" ").filter((tk) => tk.length >= 4)) {
      if (haystack.includes(tok)) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { f, score };
    }
  }
  return best?.f ?? null;
}

type Topic =
  | "status"
  | "kontakt"
  | "rechnung"
  | "risiko"
  | "frist"
  | "navigation"
  | "howto"
  | "uebersicht";

function detectTopics(question: string): Set<Topic> {
  const q = normalizeToken(question);
  const topics = new Set<Topic>();
  if (
    q.includes("wo stehen") ||
    q.includes("status") ||
    q.includes("fortschritt") ||
    q.includes("stand") ||
    q.includes("phase") ||
    q.includes("how is") ||
    q.includes("progress")
  ) topics.add("status");
  if (
    q.includes("wer ") ||
    q.includes("projektleiter") ||
    q.includes("bauleiter") ||
    q.includes("ansprech") ||
    q.includes("zustandig") ||
    q.includes("verantwort") ||
    q.includes("who ") ||
    q.includes("contact") ||
    q.includes("manager") ||
    q.includes("responsible")
  ) topics.add("kontakt");
  if (
    q.includes("abgerechn") ||
    q.includes("rechnung") ||
    q.includes("bezahlt") ||
    q.includes("offen") ||
    q.includes("forderung") ||
    q.includes("honorar") ||
    q.includes("invoice") ||
    q.includes("paid") ||
    q.includes("billed") ||
    q.includes("receivable") ||
    q.includes("billing")
  ) topics.add("rechnung");
  if (
    q.includes("risiko") ||
    q.includes("kritisch") ||
    q.includes("akut") ||
    q.includes("problem") ||
    q.includes("gefahr") ||
    q.includes("achtung") ||
    q.includes("risk") ||
    q.includes("urgent") ||
    q.includes("warning") ||
    q.includes("issue")
  ) topics.add("risiko");
  if (
    q.includes("frist") ||
    q.includes("deadline") ||
    q.includes("termine") ||
    q.includes("fallig") ||
    q.includes("due")
  ) topics.add("frist");
  // Navigation: "wo finde", "wo ist", "where", "where can i find"
  if (
    q.includes("wo finde") ||
    q.includes("wo ist") ||
    q.includes("wo sind") ||
    q.includes("wo kann") ||
    q.includes("where") ||
    q.includes("find")
  ) topics.add("navigation");
  // How-To: "wie", "how do/can i", "anleitung", "schritt"
  if (
    /\bwie\b/.test(q) ||
    q.includes("how do") ||
    q.includes("how can") ||
    q.includes("how to") ||
    q.includes("anleitung") ||
    q.includes("schritt") ||
    q.includes("steps") ||
    q.includes("tutorial")
  ) topics.add("howto");
  if (topics.size === 0) topics.add("uebersicht");
  return topics;
}

/* -------------------------------------------------------------------------- */
/*                            Antwort-Bausteine                               */
/* -------------------------------------------------------------------------- */

function projectStatusBlock(p: ProjectSnapshot, locale: Locale): string {
  const lines = [
    `**${p.identifier} · ${p.name}**`,
    `${t("status", locale)}: ${p.status} · ${t("progress", locale)} ${(p.progress * 100).toFixed(0)} %`,
    `AG / Client: ${p.ag}`,
  ];
  if (p.hoaiParagraph) {
    lines.push(
      `HOAI: ${p.hoaiParagraph}${
        p.hoaiHonorarsummeNettoCents !== null
          ? ` · ${t("honorar", locale)} ${fmtEuro(p.hoaiHonorarsummeNettoCents, locale)}`
          : ""
      }`
    );
  }
  return lines.join("\n");
}

function projectKontaktBlock(p: ProjectSnapshot, locale: Locale): string {
  const lines: string[] = [];
  if (p.bauleiterName)
    lines.push(`· ${t("bauleiter", locale)}: **${p.bauleiterName}**`);
  if (p.agAnsprechName)
    lines.push(`· ${t("agKontakt", locale)}: ${p.agAnsprechName}`);
  if (lines.length === 0) lines.push(t("noContacts", locale));
  return lines.join("\n");
}

function projectRechnungBlock(p: ProjectSnapshot, locale: Locale): string {
  return [
    `${t("paid", locale)}: **${fmtEuro(p.abrechnetGrossCents, locale)}**`,
    `${t("open", locale)}: **${fmtEuro(p.offenForderungGrossCents, locale)}**`,
  ].join("\n");
}

function projectRiskBlock(p: ProjectSnapshot, locale: Locale): string {
  const lines: string[] = [];
  if (p.fristenKritisch > 0)
    lines.push(`· **${p.fristenKritisch}** ${t("critFrist", locale)}`);
  if (p.fristenWarning > 0)
    lines.push(`· ${p.fristenWarning} ${t("thisWeek", locale)}`);
  if (p.highRiskVorgaenge > 0)
    lines.push(`· **${p.highRiskVorgaenge}** ${t("highRiskOps", locale)}`);
  if (p.offenVorgaenge > 0)
    lines.push(`· ${p.offenVorgaenge} ${t("openOps", locale)}`);
  if (p.maengelOffen > 0)
    lines.push(`· ${p.maengelOffen} ${t("openMaengel", locale)}`);
  if (lines.length === 0) lines.push(t("noRisks", locale));
  return lines.join("\n");
}

function buildProjectAnswer(
  p: ProjectSnapshot,
  topics: Set<Topic>,
  locale: Locale
): string {
  const parts: string[] = [projectStatusBlock(p, locale)];
  if (topics.has("kontakt") || topics.has("uebersicht")) {
    parts.push(`\n**${t("contacts", locale)}**\n${projectKontaktBlock(p, locale)}`);
  }
  if (topics.has("rechnung") || topics.has("uebersicht")) {
    parts.push(`\n**${t("billing", locale)}**\n${projectRechnungBlock(p, locale)}`);
  }
  if (topics.has("risiko") || topics.has("frist") || topics.has("uebersicht")) {
    parts.push(`\n**${t("risks", locale)}**\n${projectRiskBlock(p, locale)}`);
  }
  return parts.join("\n");
}

function buildWorkspaceAnswer(
  snapshot: WorkspaceSnapshot,
  topics: Set<Topic>,
  locale: Locale
): string {
  const totals = snapshot.totals;
  const parts: string[] = [
    `**${snapshot.workspace.name}** · ${totals.activeProjects}/${totals.projects} ${
      locale === "en" ? "active projects" : "aktive Projekte"
    }`,
  ];
  if (topics.has("rechnung") || topics.has("uebersicht")) {
    parts.push(
      `\n**${t("totalBilling", locale)}**\n· ${t("paid", locale)}: **${fmtEuro(totals.abrechnetGrossCents, locale)}**\n· ${t("open", locale)}: **${fmtEuro(totals.offenForderungGrossCents, locale)}**\n· ${
        locale === "en"
          ? "Incoming invoices with anomalies"
          : "Eingangsrechnungen mit Anomalien"
      }: ${totals.eingangsrechnungenAnomalien}`
    );
  }
  if (topics.has("risiko") || topics.has("frist") || topics.has("uebersicht")) {
    parts.push(
      `\n**${t("riskState", locale)}**\n· ${totals.fristenKritisch} ${t(
        "critFrist",
        locale
      )} · ${totals.fristenDieseWoche} ${t("thisWeek", locale)}\n· ${totals.openVorgaenge} ${t(
        "openOps",
        locale
      )} · ${totals.highRiskVorgaenge} ${t("highRiskOps", locale)}`
    );
    if (snapshot.topRisks.length > 0) {
      parts.push(
        `\n**${t("topRisks", locale)}**\n${snapshot.topRisks
          .map(
            (r) =>
              `· _${r.projectIdentifier}_ (${r.kind}): **${r.title}** — ${r.detail}`
          )
          .join("\n")}`
      );
    }
  }
  if (topics.has("status") || topics.has("uebersicht")) {
    if (snapshot.projects.length === 0) {
      parts.push(`\n${t("noProjectsHint", locale)}`);
    } else {
      parts.push(
        `\n**${t("projects", locale)}**\n${snapshot.projects
          .slice(0, 8)
          .map(
            (p) =>
              `· _${p.identifier}_ [${p.name}](/projekte/${p.id}) — ${p.status} (${(p.progress * 100).toFixed(0)} %)`
          )
          .join("\n")}${
          snapshot.projects.length > 8
            ? `\n· … (${snapshot.projects.length - 8} ${
                locale === "en" ? "more" : "weitere"
              })`
            : ""
        }`
      );
    }
  }
  return parts.join("\n");
}

function buildFeatureAnswer(
  feature: FeatureCatalogEntry,
  topics: Set<Topic>,
  locale: Locale
): string {
  const parts: string[] = [];
  // Header mit Link auf das Modul (falls sichtbar)
  if (feature.visible) {
    parts.push(
      `**[${feature.label}](${feature.href})**${
        feature.description ? ` — ${feature.description}` : ""
      }`
    );
    parts.push(`\n${t("navHeader", locale)}: ${feature.href}`);
  } else {
    parts.push(`**${feature.label}**${
      feature.description ? ` — ${feature.description}` : ""
    }`);
    const reason = feature.visibilityReason
      ? TXT.reasons[feature.visibilityReason][locale]
      : "";
    parts.push(`\n_${t("notVisible", locale)}${reason ? ` — ${reason}` : ""}._`);
  }
  // Workflows nur anzeigen, wenn How-To gefragt oder Default
  const showWorkflows =
    topics.has("howto") ||
    (!topics.has("navigation") && feature.workflows.length > 0);
  if (showWorkflows && feature.workflows.length > 0) {
    parts.push(`\n**${t("workflowsTitle", locale)}**`);
    for (const wf of feature.workflows) {
      const stepLines = wf.steps.map((s, i) => `${i + 1}. ${s}`).join("\n");
      parts.push(`\n_${wf.title}_\n${stepLines}`);
    }
  }
  // Verwandte Module
  if (feature.relatedModules.length > 0) {
    parts.push(
      `\n${t("related", locale)}: ${feature.relatedModules.join(", ")}`
    );
  }
  return parts.join("\n");
}

/* -------------------------------------------------------------------------- */
/*                                Provider                                    */
/* -------------------------------------------------------------------------- */

export class MockKiProvider implements KiAssistantProvider {
  readonly name = "mock";

  async answer(input: KiAssistantInput): Promise<KiAssistantOutput> {
    const { question, snapshot } = input;
    const locale = snapshot.locale;
    const topics = detectTopics(question);

    const wantsFeature =
      topics.has("navigation") || topics.has("howto");

    let body: string;
    if (wantsFeature) {
      const feature = matchFeature(question, snapshot.features);
      if (feature) {
        body = buildFeatureAnswer(feature, topics, locale);
      } else {
        // Fallback: Workspace-Antwort, aber mit Modul-Liste oben
        const visibleModules = snapshot.features
          .filter((f) => f.visible && f.description)
          .slice(0, 12);
        const moduleList = visibleModules
          .map((f) => `· [${f.label}](${f.href}) — ${f.description}`)
          .join("\n");
        body = `_${
          locale === "en"
            ? "I could not pinpoint a specific module. Here is what is available:"
            : "Kein passendes Modul gefunden. Verfügbar sind:"
        }_\n\n${moduleList}`;
      }
    } else {
      const project = matchProject(question, snapshot.projects);
      body = project
        ? buildProjectAnswer(project, topics, locale)
        : buildWorkspaceAnswer(snapshot, topics, locale);
    }

    const footer =
      `\n\n---\n_${t("workspaceLabel", locale)}: ${snapshot.workspace.name}` +
      ` · ${t("roleLabel", locale)}: ${snapshot.workspace.workspaceRole}_`;

    return {
      markdown: `${t("header", locale)}\n${t("headerHint", locale)}\n\n${body}${footer}`,
      providerName: this.name,
    };
  }
}
