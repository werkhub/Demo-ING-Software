/**
 * Workspace-Snapshot für den KI-Assistenten.
 *
 * Sammelt alle relevanten Domänen-Daten in eine kompakte, JSON-serialisierbare
 * Struktur, die a) der Mock-Provider als Heuristik-Basis nutzt, b) der Claude-
 * Provider später als Tool-Use-Kontext oder strukturierter System-Prompt
 * weitergibt. Antiken-Felder bewusst flach gehalten — der Snapshot soll
 * unter ~10 KB bleiben, damit der Token-Verbrauch beherrschbar ist.
 */
import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { parseDisciplines } from "@/lib/workspace/disciplines";
import { withDerivedFields } from "@/db/queries/_internal";
import { MODULES, type ModuleDefinition, type ModuleId } from "@/lib/modules";
import type {
  ClientFocus,
  Discipline,
  WorkspaceRole,
} from "@/db/schema";
import { FEATURE_INDEX, type Locale } from "./feature-index";

export type ProjectSnapshot = {
  id: string;
  identifier: string;
  name: string;
  status: string;
  progress: number;
  ag: string;
  hoaiParagraph: string | null;
  hoaiHonorarsummeNettoCents: number | null;
  abrechnetGrossCents: number;
  offenForderungGrossCents: number;
  offenVorgaenge: number;
  highRiskVorgaenge: number;
  fristenKritisch: number;
  fristenWarning: number;
  maengelOffen: number;
  bauleiterName: string | null;
  agAnsprechName: string | null;
};

export type FeatureCatalogEntry = {
  id: ModuleId;
  /** Sidebar-Label aus modules.ts (deutsch — Übersetzung später per i18n). */
  label: string;
  /** Pfad — der Drawer-Renderer macht daraus klickbare Links. */
  href: string;
  section: string;
  /**
   * Sichtbarkeit für den aktuellen Workspace. Module, die nicht sichtbar
   * sind, bleiben im Catalog (mit `visible: false`), damit der Assistent
   * Antworten der Form „Modul X existiert, ist aber für deinen Workspace
   * nicht aktiviert" geben kann.
   */
  visible: boolean;
  /** Grund der Nicht-Sichtbarkeit — leer bei `visible: true`. */
  visibilityReason?:
    | "wrong_workspace_type"
    | "discipline_missing"
    | "client_focus_mismatch"
    | "company_size_too_small"
    | "admin_only"
    | "flag_disabled";
  /** Aus FEATURE_INDEX in der Snapshot-Locale, falls vorhanden. */
  description: string | null;
  useCases: readonly string[];
  workflows: readonly { title: string; steps: readonly string[] }[];
  relatedModules: readonly ModuleId[];
};

export type WorkspaceSnapshot = {
  locale: Locale;
  workspace: {
    id: string;
    name: string;
    workspaceRole: WorkspaceRole;
    disciplines: Discipline[];
    clientFocus: ClientFocus;
    companySize: number | null;
  };
  totals: {
    projects: number;
    activeProjects: number;
    openVorgaenge: number;
    highRiskVorgaenge: number;
    fristenKritisch: number;
    fristenDieseWoche: number;
    abrechnetGrossCents: number;
    offenForderungGrossCents: number;
    eingangsrechnungenAnomalien: number;
  };
  projects: ProjectSnapshot[];
  topRisks: Array<{
    projectIdentifier: string;
    projectName: string;
    kind: "frist" | "vorgang" | "mangel";
    title: string;
    detail: string;
  }>;
  /**
   * Feature-Katalog für Navigations-/How-To-Antworten. Enthält jedes
   * Sidebar-Modul mit Label, Pfad und Sichtbarkeitsstatus. Module aus
   * FEATURE_INDEX bekommen zusätzlich Beschreibung, Use-Cases und
   * Workflow-Hinweise in der Snapshot-Locale.
   */
  features: FeatureCatalogEntry[];
};

/**
 * Prüft die Sichtbarkeit eines Moduls für einen Workspace — analoge Logik
 * zu `passesAdminAndFlagFilter` in roles.ts, aber liefert zusätzlich den
 * Grund der Nicht-Sichtbarkeit zurück. Eigene Implementation hier (statt
 * Reuse), weil der Assistent den Reason braucht und roles.ts nur boolean
 * gibt.
 */
function evaluateVisibility(
  module: ModuleDefinition,
  ctx: {
    workspaceRole: WorkspaceRole;
    disciplines: readonly Discipline[];
    clientFocus: ClientFocus;
    companySize: number | null;
    hinschgEnabled: boolean;
  }
): { visible: boolean; reason?: FeatureCatalogEntry["visibilityReason"] } {
  if (module.adminOnly) {
    // Hinweis: Admin-Status kennen wir hier nicht — wir behandeln das nicht
    // als Hard-Filter, sondern lassen den Reason "admin_only" durch, der
    // Provider zeigt einen Hinweis, falls er das Modul empfehlen würde.
    return { visible: false, reason: "admin_only" };
  }
  if (module.requiresWorkspaceFlag === "hinschgEnabled" && !ctx.hinschgEnabled) {
    return { visible: false, reason: "flag_disabled" };
  }
  if (module.requiresWorkspaceType && module.requiresWorkspaceType !== ctx.workspaceRole) {
    return { visible: false, reason: "wrong_workspace_type" };
  }
  if (module.requiresAnyDiscipline && module.requiresAnyDiscipline.length > 0) {
    const have = new Set<Discipline>(ctx.disciplines);
    if (!module.requiresAnyDiscipline.some((d) => have.has(d))) {
      return { visible: false, reason: "discipline_missing" };
    }
  }
  if (module.requiresAnyClientFocus && module.requiresAnyClientFocus.length > 0) {
    if (!module.requiresAnyClientFocus.includes(ctx.clientFocus)) {
      return { visible: false, reason: "client_focus_mismatch" };
    }
  }
  if (module.requiresCompanySizeMin !== undefined) {
    if (ctx.companySize !== null && ctx.companySize < module.requiresCompanySizeMin) {
      return { visible: false, reason: "company_size_too_small" };
    }
  }
  return { visible: true };
}

function buildFeatureCatalog(
  locale: Locale,
  ctx: {
    workspaceRole: WorkspaceRole;
    disciplines: readonly Discipline[];
    clientFocus: ClientFocus;
    companySize: number | null;
    hinschgEnabled: boolean;
  }
): FeatureCatalogEntry[] {
  return MODULES.map((m) => {
    const vis = evaluateVisibility(m as ModuleDefinition, ctx);
    const fx = FEATURE_INDEX[m.id as ModuleId];
    return {
      id: m.id as ModuleId,
      label: m.label,
      href: m.href,
      section: m.section,
      visible: vis.visible,
      visibilityReason: vis.reason,
      description: fx ? fx.description[locale] : null,
      useCases: fx ? fx.useCases[locale] : [],
      workflows: fx ? fx.workflows[locale] : [],
      relatedModules: fx?.relatedModules ?? [],
    } satisfies FeatureCatalogEntry;
  });
}

export async function buildWorkspaceSnapshot(
  locale: Locale = "de"
): Promise<WorkspaceSnapshot> {
  const workspaceId = await getCurrentWorkspaceId();
  const [
    workspace,
    projects,
    fristenAll,
    vorgaengeAll,
    ausgangsrechnungenAll,
    rechnungenAll,
    maengelAll,
    contacts,
    users,
  ] = await Promise.all([
    db
      .select()
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, workspaceId))
      .limit(1)
      .then((r) => r[0]),
    db
      .select()
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.fristen)
      .where(eq(schema.fristen.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.vorgaenge)
      .where(eq(schema.vorgaenge.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.ausgangsrechnungen)
      .where(eq(schema.ausgangsrechnungen.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.rechnungen)
      .where(eq(schema.rechnungen.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.maengel)
      .where(eq(schema.maengel.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.projectContacts)
      .where(eq(schema.projectContacts.workspaceId, workspaceId)),
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        memberRole: schema.users.memberRole,
        roleLabel: schema.users.roleLabel,
        status: schema.users.status,
      })
      .from(schema.users)
      .where(eq(schema.users.workspaceId, workspaceId)),
  ]);

  if (!workspace) {
    throw new Error("Workspace nicht gefunden — Snapshot abgebrochen.");
  }

  const fristen = fristenAll.map(withDerivedFields);
  const offeneFristen = fristen.filter((f) => !f.completed);
  const fristenKritischTotal = offeneFristen.filter(
    (f) => f.urgency === "critical"
  ).length;
  const fristenDieseWoche = offeneFristen.filter(
    (f) => f.daysRemaining >= 0 && f.daysRemaining <= 7
  ).length;

  const offeneVorgaenge = vorgaengeAll.filter(
    (v) => v.status !== "abgeschlossen" && v.status !== "archiviert"
  );
  const highRiskTotal = offeneVorgaenge.filter((v) => v.riskScore >= 60).length;

  // Bauleiter-Auswahl: irgend ein User mit memberRole=bauleiter; sonst gf.
  const bauleiterUser =
    users.find((u) => u.memberRole === "bauleiter" && u.status === "active") ??
    users.find((u) => u.memberRole === "gf" && u.status === "active") ??
    null;

  // Eingangsrechnungs-Anomalien
  const eingangsrechnungenAnomalien = rechnungenAll.reduce(
    (sum, r) => sum + (r.anomalyCount ?? 0),
    0
  );

  // Pro Projekt aggregieren
  const projectSnapshots: ProjectSnapshot[] = projects.map((p) => {
    const projOffeneVorgaenge = offeneVorgaenge.filter(
      (v) => v.projectId === p.id
    );
    const projOffeneFristen = offeneFristen.filter(
      (f) => f.projectId === p.id
    );
    const projAusgang = ausgangsrechnungenAll.filter(
      (a) => a.projectId === p.id
    );
    const abrechnet = projAusgang
      .filter((a) => a.status === "bezahlt" || a.status === "teilweise_bezahlt")
      .reduce((s, a) => s + (a.paidAmount ?? 0), 0);
    const offenForderung = projAusgang
      .filter(
        (a) =>
          a.status !== "bezahlt" &&
          a.status !== "entwurf" &&
          a.status !== "gerichtlich"
      )
      .reduce((s, a) => s + (a.payoutGross - (a.paidAmount ?? 0)), 0);

    const projMaengel = maengelAll.filter(
      (m) => m.projectId === p.id && m.status !== "behoben"
    ).length;

    const agContact = contacts.find(
      (c) => c.projectId === p.id && c.role === "ag_vertreter"
    );

    return {
      id: p.id,
      identifier: p.identifier,
      name: p.name,
      status: p.status,
      progress: p.progress,
      ag: p.ag,
      hoaiParagraph: p.hoaiParagraph ?? null,
      hoaiHonorarsummeNettoCents: p.hoaiHonorarsummeNettoCents ?? null,
      abrechnetGrossCents: abrechnet,
      offenForderungGrossCents: offenForderung,
      offenVorgaenge: projOffeneVorgaenge.length,
      highRiskVorgaenge: projOffeneVorgaenge.filter((v) => v.riskScore >= 60)
        .length,
      fristenKritisch: projOffeneFristen.filter((f) => f.urgency === "critical")
        .length,
      fristenWarning: projOffeneFristen.filter((f) => f.urgency === "warning")
        .length,
      maengelOffen: projMaengel,
      bauleiterName: bauleiterUser?.name ?? null,
      agAnsprechName: agContact?.name ?? null,
    };
  });

  // Top-Risiken (max 8): kritische Fristen + High-Risk-Vorgänge + offene Mängel
  const topRisks: WorkspaceSnapshot["topRisks"] = [];
  for (const f of offeneFristen.filter((f) => f.urgency === "critical")) {
    const proj = projects.find((p) => p.id === f.projectId);
    if (!proj) continue;
    topRisks.push({
      projectIdentifier: proj.identifier,
      projectName: proj.name,
      kind: "frist",
      title: f.task,
      detail: `Fällig in ${f.daysRemaining} Tag(en)${
        f.legalBasis ? ` · ${f.legalBasis}` : ""
      }`,
    });
  }
  for (const v of offeneVorgaenge
    .filter((v) => v.riskScore >= 60)
    .sort((a, b) => b.riskScore - a.riskScore)) {
    const proj = projects.find((p) => p.id === v.projectId);
    if (!proj) continue;
    topRisks.push({
      projectIdentifier: proj.identifier,
      projectName: proj.name,
      kind: "vorgang",
      title: v.title,
      detail: `Risk-Score ${v.riskScore} · ${v.category} · ${v.status}`,
    });
  }
  for (const m of maengelAll.filter(
    (m) => m.prioritaet === "kritisch" && m.status !== "behoben"
  )) {
    const proj = projects.find((p) => p.id === m.projectId);
    if (!proj) continue;
    const firstLine = (m.beschreibung ?? "").split("\n")[0]?.slice(0, 100) ?? "Mangel";
    topRisks.push({
      projectIdentifier: proj.identifier,
      projectName: proj.name,
      kind: "mangel",
      title: firstLine,
      detail: `${m.prioritaet} · ${m.status}${m.fristsetzungDatum ? ` · Frist ${m.fristsetzungDatum}` : ""}`,
    });
  }
  topRisks.length = Math.min(topRisks.length, 8);

  const totalAbrechnet = projectSnapshots.reduce(
    (s, p) => s + p.abrechnetGrossCents,
    0
  );
  const totalOffenForderung = projectSnapshots.reduce(
    (s, p) => s + p.offenForderungGrossCents,
    0
  );

  const disciplines = parseDisciplines(workspace.disciplinesJson);
  const features = buildFeatureCatalog(locale, {
    workspaceRole: workspace.workspaceRole,
    disciplines,
    clientFocus: workspace.clientFocus,
    companySize: workspace.companySize,
    hinschgEnabled: workspace.hinschgEnabled,
  });

  return {
    locale,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      workspaceRole: workspace.workspaceRole,
      disciplines,
      clientFocus: workspace.clientFocus,
      companySize: workspace.companySize,
    },
    totals: {
      projects: projects.length,
      activeProjects: projects.filter((p) => p.status !== "Abgeschlossen").length,
      openVorgaenge: offeneVorgaenge.length,
      highRiskVorgaenge: highRiskTotal,
      fristenKritisch: fristenKritischTotal,
      fristenDieseWoche,
      abrechnetGrossCents: totalAbrechnet,
      offenForderungGrossCents: totalOffenForderung,
      eingangsrechnungenAnomalien,
    },
    projects: projectSnapshots,
    topRisks,
    features,
  };
}

