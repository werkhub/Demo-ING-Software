import { Link } from "@/i18n/navigation";
import type { Rechnung, Project } from "@/db/schema";
import { fmtMoney, formatDateShort } from "@/lib/utils";

const STATUS_TONE: Record<Rechnung["status"], string> = {
  eingegangen:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  geprueft:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  freigegeben:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  abgelehnt:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
};

const STATUS_LABEL: Record<Rechnung["status"], string> = {
  eingegangen: "Eingegangen",
  geprueft: "Geprüft",
  freigegeben: "Freigegeben",
  abgelehnt: "Abgelehnt",
};

function anomalyTone(score: number): string {
  if (score >= 60)
    return "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]";
  if (score >= 25)
    return "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]";
  return "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]";
}

const XML_FORMAT_LABEL: Record<string, string> = {
  xrechnung_ubl: "XR · UBL",
  xrechnung_cii: "XR · CII",
  zugferd: "ZUGFeRD",
  ubl_unspezifisch: "UBL",
  cii_unspezifisch: "CII",
  unbekannt: "?",
};

const XML_VALIDATION_TONE: Record<string, string> = {
  valid:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  warnings:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  invalid:
    "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
  nicht_validiert:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

export function RechnungListTable({
  rows,
  projects,
}: {
  rows: Rechnung[];
  projects: Pick<Project, "id" | "identifier" | "name">[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)] py-12 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
        Noch keine Eingangsrechnungen.{" "}
        <Link href="/rechnungen/new" className="underline">
          Erste Rechnung hochladen
        </Link>
      </p>
    );
  }
  const projectMap = new Map(projects.map((p) => [p.id, p]));

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--color-border)]">
            <Th>Datum</Th>
            <Th>Lieferant</Th>
            <Th>Projekt</Th>
            <Th className="text-right">Brutto</Th>
            <Th>E-Rechnung</Th>
            <Th className="text-right">Anomalie</Th>
            <Th>Status</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const project = r.projectId ? projectMap.get(r.projectId) : null;
            return (
              <tr
                key={r.id}
                className="border-b border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)] transition-colors"
              >
                <td className="py-3 px-4 align-top text-xs">
                  <Link
                    href={`/rechnungen/${r.id}`}
                    className="hover:text-[color:var(--color-accent)] transition-colors"
                  >
                    {r.invoiceDate ? formatDateShort(r.invoiceDate) : "—"}
                    <br />
                    <span className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                      {r.id}
                    </span>
                  </Link>
                </td>
                <td className="py-3 px-3 align-top">
                  <Link
                    href={`/rechnungen/${r.id}`}
                    className="text-sm font-medium hover:text-[color:var(--color-accent)] transition-colors"
                  >
                    {r.supplierName}
                  </Link>
                </td>
                <td className="py-3 px-3 align-top text-xs">
                  {project ? (
                    <Link
                      href={`/projekte/${project.id}`}
                      className="hover:text-[color:var(--color-accent)] transition-colors"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                        {project.identifier}
                      </span>
                      <br />
                      {project.name}
                    </Link>
                  ) : (
                    <span className="text-[color:var(--color-fg-muted)]">—</span>
                  )}
                </td>
                <td className="py-3 px-3 align-top text-right">
                  {r.totalGross !== null ? fmtMoney(r.totalGross) : "—"}
                </td>
                <td className="py-3 px-3 align-top">
                  {r.xmlFormat ? (
                    <span className="inline-flex flex-col gap-1">
                      <span className="font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-0.5 bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]">
                        {XML_FORMAT_LABEL[r.xmlFormat] ?? r.xmlFormat}
                      </span>
                      {r.xmlValidationStatus &&
                      r.xmlValidationStatus !== "nicht_validiert" ? (
                        <span
                          className={`font-mono text-[9px] uppercase tracking-wider border rounded-sm px-1.5 py-0.5 ${XML_VALIDATION_TONE[r.xmlValidationStatus] ?? ""}`}
                        >
                          {r.xmlValidationStatus}
                        </span>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-[10px] text-[color:var(--color-fg-muted)] opacity-60">
                      —
                    </span>
                  )}
                </td>
                <td className="py-3 px-3 align-top text-right">
                  <span
                    className={`inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-0.5 ${anomalyTone(r.anomalyScore)}`}
                    title={`${r.anomalyCount} Befunde`}
                  >
                    <span>{r.anomalyScore}</span>
                    <span className="opacity-60">·</span>
                    <span>{r.anomalyCount}</span>
                  </span>
                </td>
                <td className="py-3 px-3 align-top">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-0.5 ${STATUS_TONE[r.status]}`}
                  >
                    {STATUS_LABEL[r.status]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] text-left py-2.5 px-3 ${className}`}
    >
      {children}
    </th>
  );
}
