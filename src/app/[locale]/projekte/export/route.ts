/**
 * CSV-Export der Projekt-Tabellenansicht. Berücksichtigt q/status/sort wie die
 * Tabelle selbst, exportiert aber ALLE Spalten (auch ausgeblendete) — der
 * Excel-Nutzer soll selbst entscheiden, was er sieht.
 *
 * Encoding: CP1252 (Excel-DE-kompatibel), Trenner Semikolon — analog
 * /projekte/[id]/nachkalkulation/export.
 */
import { NextResponse } from "next/server";
import { getProjectsTableRows } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import { toCp1252 } from "@/lib/datev/encoding";
import type { ProjectContact } from "@/db/schema";

const CONTACT_ROLES: ProjectContact["role"][] = [
  "ag_vertreter",
  "architekt",
  "bauleiter_ag",
  "anwalt",
  "sachverstaendiger",
];

const ROLE_LABEL: Record<ProjectContact["role"], string> = {
  ag_vertreter: "AG-Vertreter",
  architekt: "Architekt",
  fachplaner: "Fachplaner",
  bauleiter_ag: "Bauleiter AG",
  nachunternehmer: "Nachunternehmer",
  sachverstaendiger: "Sachverständiger",
  anwalt: "Anwalt",
  sonstiges: "Sonstiges",
};

function csvField(s: string | number | null | undefined): string {
  if (s === null || s === undefined) return "";
  const v = String(s);
  if (v.includes(";") || v.includes('"') || v.includes("\n") || v.includes("\r")) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function fmtEur(n: number): string {
  return n.toFixed(2).replace(".", ",");
}

function fmtPct(n: number): string {
  return (n * 100).toFixed(0).replace(".", ",");
}

function applySearch(
  rows: Awaited<ReturnType<typeof getProjectsTableRows>>,
  q: string,
  status: string,
  flag: string
) {
  const needle = q.trim().toLowerCase();
  return rows.filter((p) => {
    if (status && p.status !== status) return false;
    switch (flag) {
      case "critical":
        if (p.criticalIssues <= 0) return false;
        break;
      case "compliance":
        if (
          p.subcontractorsCriticalCompliance <= 0 &&
          p.subcontractorsBlocked <= 0 &&
          p.subcontractorsCertExpiring <= 0
        ) {
          return false;
        }
        break;
      case "securities-expiring":
        if (p.securitiesExpiring30d <= 0) return false;
        break;
      case "nachtraege-open":
        if (p.nachtraegeOffenCount <= 0) return false;
        break;
      case "confidential":
        if (!p.vertraulich) return false;
        break;
    }
    if (!needle) return true;
    return (
      p.name.toLowerCase().includes(needle) ||
      p.ag.toLowerCase().includes(needle) ||
      p.identifier.toLowerCase().includes(needle) ||
      (p.siteAddress?.toLowerCase().includes(needle) ?? false)
    );
  });
}

function applySort(
  rows: Awaited<ReturnType<typeof getProjectsTableRows>>,
  sort: string
) {
  const sorted = [...rows];
  switch (sort) {
    case "identifier":
      sorted.sort((a, b) => a.identifier.localeCompare(b.identifier, "de"));
      break;
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name, "de"));
      break;
    case "ag":
      sorted.sort((a, b) => a.ag.localeCompare(b.ag, "de"));
      break;
    case "status":
      sorted.sort((a, b) => a.status.localeCompare(b.status, "de"));
      break;
    case "value-desc":
      sorted.sort((a, b) => b.value - a.value);
      break;
    case "value-asc":
      sorted.sort((a, b) => a.value - b.value);
      break;
    case "progress-desc":
      sorted.sort((a, b) => b.progress - a.progress);
      break;
    case "deadline":
      sorted.sort((a, b) => {
        const da = a.nextDeadline?.daysRemaining ?? Infinity;
        const db = b.nextDeadline?.daysRemaining ?? Infinity;
        return da - db;
      });
      break;
    case "nachtraege-offen":
      sorted.sort((a, b) => b.nachtraegeOffenSum - a.nachtraegeOffenSum);
      break;
    case "securities-sum":
      sorted.sort((a, b) => b.securitiesActiveSum - a.securitiesActiveSum);
      break;
    case "risk":
      sorted.sort((a, b) => (b.riskScoreMax ?? -1) - (a.riskScoreMax ?? -1));
      break;
    default:
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return sorted;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const status = url.searchParams.get("status") ?? "";
  const sort = url.searchParams.get("sort") ?? "recent";
  const flag = url.searchParams.get("flag") ?? "";

  const workspace = await getCurrentWorkspace();
  const isIngenieurbuero = workspace.workspaceRole === "ingenieurbuero";

  const all = await getProjectsTableRows();
  const filtered = applySearch(all, q, status, flag);
  const rows = applySort(filtered, sort);

  const header = [
    "BV-Nr.",
    "Projekt",
    "Auftraggeber",
    "Status",
    "Vertragsart",
    "Vertragsdatum",
    "Plan-Fertigstellung",
    "Abnahme",
    "Gewährleistung bis",
    "Standort",
    isIngenieurbuero
      ? "HOAI-Honorar netto (EUR)"
      : "Auftragsvolumen netto (EUR)",
    "HOAI-Paragraph",
    "Nachträge offen Anzahl",
    "Nachträge offen Σ (EUR)",
    "Nachträge anerkannt Σ (EUR)",
    "Sicherheiten aktiv Anzahl",
    "Sicherheiten aktiv Σ (EUR)",
    "Sicherheiten ablaufend ≤30T",
    "NU Anzahl",
    "NU Compliance kritisch",
    "NU Zahlung gesperrt",
    "NU Bescheinigung ≤14T",
    "Vertrag Risk-Score",
    "Fristen offen",
    "Fristen kritisch",
    "Nächste Frist",
    "Nächste Frist Datum",
    ...CONTACT_ROLES.map((r) => `${ROLE_LABEL[r]} Name`),
    ...CONTACT_ROLES.map((r) => `${ROLE_LABEL[r]} Organisation`),
    ...CONTACT_ROLES.map((r) => `${ROLE_LABEL[r]} E-Mail`),
    "Fortschritt %",
    "Vertraulich",
  ];

  const lines: string[] = [header.map(csvField).join(";")];

  for (const p of rows) {
    const valueEur =
      isIngenieurbuero && p.hoaiHonorarsummeNettoCents
        ? p.hoaiHonorarsummeNettoCents / 100
        : p.value;

    const fields: (string | number | null)[] = [
      p.identifier,
      p.name,
      p.ag,
      p.status,
      p.contractType ?? "",
      p.contractDate ?? "",
      p.plannedCompletion ?? "",
      p.abnahmeDate ?? "",
      p.warrantyEnd ?? "",
      p.siteAddress ?? "",
      fmtEur(valueEur),
      p.hoaiParagraph ?? "",
      p.nachtraegeOffenCount,
      fmtEur(p.nachtraegeOffenSum),
      fmtEur(p.nachtraegeAnerkanntSum),
      p.securitiesActiveCount,
      fmtEur(p.securitiesActiveSum),
      p.securitiesExpiring30d,
      p.subcontractorsCount,
      p.subcontractorsCriticalCompliance,
      p.subcontractorsBlocked,
      p.subcontractorsCertExpiring,
      p.riskScoreMax ?? "",
      p.openIssues,
      p.criticalIssues,
      p.nextDeadline?.task ?? "",
      p.nextDeadline?.deadline ?? "",
    ];

    for (const role of CONTACT_ROLES) {
      fields.push(p.contactsByRole[role]?.name ?? "");
    }
    for (const role of CONTACT_ROLES) {
      fields.push(p.contactsByRole[role]?.organization ?? "");
    }
    for (const role of CONTACT_ROLES) {
      fields.push(p.contactsByRole[role]?.email ?? "");
    }

    fields.push(fmtPct(p.progress));
    fields.push(p.vertraulich ? "ja" : "nein");

    lines.push(fields.map(csvField).join(";"));
  }

  const csv = lines.join("\r\n") + "\r\n";
  const buffer = toCp1252(csv);
  const stichtag = new Date().toISOString().slice(0, 10);
  const filename = `projekte_${stichtag}.csv`;

  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=windows-1252",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
