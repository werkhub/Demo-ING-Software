/**
 * Tabellen-Ansicht der Projekte. Server-Komponente — keine Interaktivität
 * außer sortierbaren Header-Links (URL-getrieben über `?sort=`).
 *
 * Zeile = Projekt. Spalten gruppiert: Stamm · Vertrag/Termine · Finanzen ·
 * NU/Sicherheiten · Risiko/Fristen · Zuständigkeiten · Fortschritt.
 */
import { Link } from "@/i18n/navigation";
import {
  AlertTriangle,
  Briefcase,
  HardHat,
  Lock,
  Scale,
  Search,
  UserSquare2,
} from "lucide-react";
import type { ProjectStatus, ContractType, ProjectContact } from "@/db/schema";
import { fmtMoney, formatDateShort, urgencyLabel } from "@/lib/utils";
import type { getProjectsTableRows } from "@/db/queries";

type Row = Awaited<ReturnType<typeof getProjectsTableRows>>[number];
type ContactRole = ProjectContact["role"];

const statusClass: Record<ProjectStatus, string> = {
  Geplant:
    "bg-[color:var(--color-info-soft)] text-[color:var(--color-info)] border-[color:var(--color-info-border)]",
  Bauphase:
    "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
  Abnahme:
    "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
  Gewährleistung:
    "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent)] border-[color:var(--color-border)]",
  Abgeschlossen:
    "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
};

const contractTypeShort: Record<ContractType, string> = {
  bgb_werkvertrag: "BGB",
  vob_vertrag: "VOB/B",
  verbraucherbauvertrag: "VBV",
};

const contactRoleLabel: Record<ContactRole, string> = {
  ag_vertreter: "AG-Vertreter",
  architekt: "Architekt",
  fachplaner: "Fachplaner",
  bauleiter_ag: "Bauleiter AG",
  nachunternehmer: "Nachunternehmer",
  sachverstaendiger: "Sachverständiger",
  anwalt: "Anwalt",
  sonstiges: "Sonstiges",
};

const contactRoleIcon: Partial<Record<ContactRole, typeof Briefcase>> = {
  ag_vertreter: Briefcase,
  architekt: UserSquare2,
  bauleiter_ag: HardHat,
  anwalt: Scale,
  sachverstaendiger: Search,
};

function deadlineToneClass(daysRemaining: number): string {
  if (daysRemaining <= 1) return "text-[color:var(--color-critical)]";
  if (daysRemaining <= 7) return "text-[color:var(--color-warning)]";
  return "text-[color:var(--color-fg-muted)]";
}

function riskTone(score: number | null): string {
  if (score === null) return "text-[color:var(--color-fg-muted)]";
  if (score >= 70) return "text-[color:var(--color-critical)]";
  if (score >= 40) return "text-[color:var(--color-warning)]";
  return "text-[color:var(--color-success)]";
}

type SortHeaderProps = {
  label: string;
  sortKey: string;
  currentSort: string;
  baseQuery: URLSearchParams;
  align?: "left" | "right";
  className?: string;
  dataCol: string;
};

function SortHeader({
  label,
  sortKey,
  currentSort,
  baseQuery,
  align = "left",
  className,
  dataCol,
}: SortHeaderProps) {
  const sp = new URLSearchParams(baseQuery);
  sp.set("sort", sortKey);
  const active = currentSort === sortKey;
  const arrow = active ? " ↓" : "";
  return (
    <th
      scope="col"
      data-col={dataCol}
      className={`px-3 py-3 ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}
    >
      <Link
        href={`?${sp.toString()}`}
        scroll={false}
        className={`inline-flex items-center gap-1 hover:text-[color:var(--color-fg)] transition-colors ${
          active ? "text-[color:var(--color-fg)]" : ""
        }`}
      >
        {label}
        {arrow}
      </Link>
    </th>
  );
}

function ContactBadge({
  role,
  contact,
}: {
  role: ContactRole;
  contact: { name: string; organization: string | null; email: string | null; phone: string | null } | undefined;
}) {
  const Icon = contactRoleIcon[role] ?? UserSquare2;
  const label = contactRoleLabel[role];
  if (!contact) {
    return (
      <span
        title={`${label}: nicht gepflegt`}
        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] opacity-40"
        aria-label={`${label}: nicht gepflegt`}
      >
        <Icon size={12} aria-hidden />
      </span>
    );
  }
  const tooltip = [
    `${label}: ${contact.name}`,
    contact.organization,
    contact.email,
    contact.phone,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <span
      title={tooltip}
      aria-label={tooltip}
      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg)]"
    >
      <Icon size={12} aria-hidden />
    </span>
  );
}

export function ProjectsTable({
  rows,
  isIngenieurbuero,
  searchParams,
}: {
  rows: Row[];
  isIngenieurbuero: boolean;
  searchParams: { q?: string; status?: string; sort?: string; view?: string };
}) {
  const currentSort = searchParams.sort ?? "recent";
  const baseQuery = new URLSearchParams();
  if (searchParams.q) baseQuery.set("q", searchParams.q);
  if (searchParams.status) baseQuery.set("status", searchParams.status);
  if (searchParams.view) baseQuery.set("view", searchParams.view);

  const valueLabel = isIngenieurbuero ? "HOAI / Volumen" : "Volumen";
  const ROLES: ContactRole[] = [
    "ag_vertreter",
    "architekt",
    "bauleiter_ag",
    "anwalt",
    "sachverstaendiger",
  ];

  const headerCellClass =
    "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] bg-[color:var(--color-bg-subtle)] border-b border-[color:var(--color-border)]";

  return (
    <div className="border border-[color:var(--color-border)] rounded-md overflow-hidden">
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <SortHeader
                label="BV-Nr."
                sortKey="identifier"
                currentSort={currentSort}
                baseQuery={baseQuery}
                dataCol="identifier"
                className={`${headerCellClass} sticky left-0 z-20 min-w-[110px]`}
              />
              <SortHeader
                label="Projekt"
                sortKey="name"
                currentSort={currentSort}
                baseQuery={baseQuery}
                dataCol="name"
                className={`${headerCellClass} min-w-[260px]`}
              />
              <SortHeader
                label="Auftraggeber"
                sortKey="ag"
                currentSort={currentSort}
                baseQuery={baseQuery}
                dataCol="ag"
                className={`${headerCellClass} min-w-[180px]`}
              />
              <SortHeader
                label="Status"
                sortKey="status"
                currentSort={currentSort}
                baseQuery={baseQuery}
                dataCol="status"
                className={`${headerCellClass} min-w-[120px]`}
              />
              <th
                scope="col"
                data-col="contract"
                className={`${headerCellClass} text-left px-3 py-3 min-w-[150px]`}
              >
                Vertrag
              </th>
              <th
                scope="col"
                data-col="termine"
                className={`${headerCellClass} text-left px-3 py-3 min-w-[160px]`}
              >
                Termine
              </th>
              <SortHeader
                label={valueLabel}
                sortKey="value-desc"
                currentSort={currentSort}
                baseQuery={baseQuery}
                align="right"
                dataCol="value"
                className={`${headerCellClass} min-w-[140px]`}
              />
              <SortHeader
                label="Nachträge offen"
                sortKey="nachtraege-offen"
                currentSort={currentSort}
                baseQuery={baseQuery}
                align="right"
                dataCol="nachtraege"
                className={`${headerCellClass} min-w-[140px]`}
              />
              <SortHeader
                label="Sicherheiten"
                sortKey="securities-sum"
                currentSort={currentSort}
                baseQuery={baseQuery}
                align="right"
                dataCol="securities"
                className={`${headerCellClass} min-w-[140px]`}
              />
              <th
                scope="col"
                data-col="nu"
                className={`${headerCellClass} text-left px-3 py-3 min-w-[140px]`}
              >
                NU · Compliance
              </th>
              <SortHeader
                label="Risk"
                sortKey="risk"
                currentSort={currentSort}
                baseQuery={baseQuery}
                align="right"
                dataCol="risk"
                className={`${headerCellClass} min-w-[80px]`}
              />
              <SortHeader
                label="Fristen"
                sortKey="deadline"
                currentSort={currentSort}
                baseQuery={baseQuery}
                dataCol="fristen"
                className={`${headerCellClass} min-w-[180px]`}
              />
              <th
                scope="col"
                data-col="contacts"
                className={`${headerCellClass} text-left px-3 py-3 min-w-[160px]`}
              >
                Zuständigkeiten
              </th>
              <SortHeader
                label="Fortschritt"
                sortKey="progress-desc"
                currentSort={currentSort}
                baseQuery={baseQuery}
                dataCol="progress"
                className={`${headerCellClass} min-w-[120px]`}
              />
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const valueDisplay =
                isIngenieurbuero && p.hoaiHonorarsummeNettoCents
                  ? fmtMoney(p.hoaiHonorarsummeNettoCents / 100)
                  : fmtMoney(p.value);
              const valueSubLabel =
                isIngenieurbuero && p.hoaiHonorarsummeNettoCents
                  ? `HOAI · ${p.hoaiParagraph ?? "—"}`
                  : null;

              return (
                <tr
                  key={p.id}
                  className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)] transition-colors group"
                >
                  <td
                    data-col="identifier"
                    className="px-3 py-3 sticky left-0 z-10 bg-[color:var(--color-bg)] group-hover:bg-[color:var(--color-bg-subtle)] transition-colors font-mono text-[11px] tracking-[0.06em] text-[color:var(--color-fg-muted)] border-r border-[color:var(--color-border)]"
                  >
                    <Link
                      href={`/projekte/${p.id}`}
                      className="hover:text-[color:var(--color-accent)]"
                    >
                      {p.identifier}
                    </Link>
                    {p.vertraulich ? (
                      <Lock
                        size={10}
                        className="inline-block ml-1 text-[color:var(--color-fg-muted)]"
                        aria-label="Vertraulich"
                      />
                    ) : null}
                  </td>
                  <td data-col="name" className="px-3 py-3 align-top">
                    <Link
                      href={`/projekte/${p.id}`}
                      className="font-medium text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] block"
                    >
                      {p.name}
                    </Link>
                    {p.siteAddress ? (
                      <p className="mt-0.5 text-[11px] text-[color:var(--color-fg-muted)] truncate max-w-[240px]">
                        {p.siteAddress}
                      </p>
                    ) : null}
                  </td>
                  <td data-col="ag" className="px-3 py-3 align-top text-[13px]">
                    {p.ag}
                  </td>
                  <td data-col="status" className="px-3 py-3 align-top">
                    <span
                      className={`inline-block font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${statusClass[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td data-col="contract" className="px-3 py-3 align-top text-[12px]">
                    {p.contractType ? (
                      <span className="font-mono text-[11px]">
                        {contractTypeShort[p.contractType]}
                      </span>
                    ) : (
                      <span className="text-[color:var(--color-fg-muted)]">—</span>
                    )}
                    <p className="text-[11px] text-[color:var(--color-fg-muted)] mt-0.5">
                      {p.contractDate
                        ? `Auftrag ${formatDateShort(p.contractDate)}`
                        : "ohne Vertragsdatum"}
                    </p>
                  </td>
                  <td
                    data-col="termine"
                    className="px-3 py-3 align-top text-[11px] text-[color:var(--color-fg-muted)]"
                  >
                    <p>
                      <span className="text-[color:var(--color-fg-muted)]">Plan: </span>
                      <span className="text-[color:var(--color-fg)]">
                        {formatDateShort(p.plannedCompletion)}
                      </span>
                    </p>
                    <p>
                      <span className="text-[color:var(--color-fg-muted)]">Abn.: </span>
                      <span className="text-[color:var(--color-fg)]">
                        {formatDateShort(p.abnahmeDate)}
                      </span>
                    </p>
                    <p>
                      <span className="text-[color:var(--color-fg-muted)]">Gew.: </span>
                      <span className="text-[color:var(--color-fg)]">
                        {formatDateShort(p.warrantyEnd)}
                      </span>
                    </p>
                  </td>
                  <td data-col="value" className="px-3 py-3 align-top text-right">
                    <p className="font-medium tabular-nums">{valueDisplay}</p>
                    {valueSubLabel ? (
                      <p className="text-[10px] uppercase tracking-wider font-mono text-[color:var(--color-fg-muted)] mt-0.5">
                        {valueSubLabel}
                      </p>
                    ) : null}
                  </td>
                  <td data-col="nachtraege" className="px-3 py-3 align-top text-right">
                    {p.nachtraegeOffenCount > 0 ? (
                      <>
                        <p className="font-medium tabular-nums">
                          {fmtMoney(p.nachtraegeOffenSum)}
                        </p>
                        <p className="text-[11px] text-[color:var(--color-fg-muted)] mt-0.5">
                          {p.nachtraegeOffenCount}{" "}
                          {p.nachtraegeOffenCount === 1 ? "Nachtrag" : "Nachträge"}
                        </p>
                      </>
                    ) : (
                      <p className="text-[color:var(--color-fg-muted)]">—</p>
                    )}
                    {p.nachtraegeAnerkanntSum > 0 ? (
                      <p
                        className="text-[10px] text-[color:var(--color-success)] mt-0.5 tabular-nums"
                        title="Σ anerkannte Nachträge"
                      >
                        +{fmtMoney(p.nachtraegeAnerkanntSum)} anerkannt
                      </p>
                    ) : null}
                  </td>
                  <td data-col="securities" className="px-3 py-3 align-top text-right">
                    {p.securitiesActiveCount > 0 ? (
                      <>
                        <p className="font-medium tabular-nums">
                          {fmtMoney(p.securitiesActiveSum)}
                        </p>
                        <p className="text-[11px] text-[color:var(--color-fg-muted)] mt-0.5">
                          {p.securitiesActiveCount} aktiv
                        </p>
                        {p.securitiesExpiring30d > 0 ? (
                          <p
                            className="text-[10px] text-[color:var(--color-warning)] mt-0.5"
                            title="Sicherheiten mit Geltungsende ≤ 30 Tagen"
                          >
                            {p.securitiesExpiring30d}× ≤ 30 T.
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-[color:var(--color-fg-muted)]">—</p>
                    )}
                  </td>
                  <td data-col="nu" className="px-3 py-3 align-top text-[12px]">
                    {p.subcontractorsCount === 0 ? (
                      <span className="text-[color:var(--color-fg-muted)]">—</span>
                    ) : (
                      <>
                        <p>
                          <span className="font-medium">{p.subcontractorsCount}</span>
                          <span className="text-[color:var(--color-fg-muted)]"> NU</span>
                        </p>
                        {p.subcontractorsCriticalCompliance > 0 ? (
                          <p
                            className="text-[11px] text-[color:var(--color-critical)] flex items-center gap-1 mt-0.5"
                            title="NU mit Compliance-Lücke"
                          >
                            <AlertTriangle size={11} aria-hidden />{" "}
                            {p.subcontractorsCriticalCompliance} kritisch
                          </p>
                        ) : null}
                        {p.subcontractorsBlocked > 0 ? (
                          <p
                            className="text-[10px] text-[color:var(--color-warning)] mt-0.5"
                            title="Zahlungsfreigabe gesperrt"
                          >
                            {p.subcontractorsBlocked}× Zahlung gesperrt
                          </p>
                        ) : null}
                        {p.subcontractorsCertExpiring > 0 ? (
                          <p
                            className="text-[10px] text-[color:var(--color-warning)] mt-0.5"
                            title="Pflicht-Bescheinigung läuft in ≤ 14 Tagen ab"
                          >
                            {p.subcontractorsCertExpiring}× Cert ≤ 14 T.
                          </p>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td
                    data-col="risk"
                    className={`px-3 py-3 align-top text-right tabular-nums ${riskTone(p.riskScoreMax)}`}
                    title={
                      p.riskScoreMax === null
                        ? "Kein Vertrag geprüft"
                        : `Höchster Risk-Score aus geprüften Verträgen`
                    }
                  >
                    {p.riskScoreMax === null ? "—" : p.riskScoreMax}
                  </td>
                  <td data-col="fristen" className="px-3 py-3 align-top text-[12px]">
                    {p.openIssues === 0 ? (
                      <p className="text-[color:var(--color-fg-muted)]">Keine</p>
                    ) : (
                      <>
                        <p>
                          <span className="font-medium">{p.openIssues}</span>
                          <span className="text-[color:var(--color-fg-muted)]"> offen</span>
                          {p.criticalIssues > 0 ? (
                            <span className="ml-1 text-[color:var(--color-critical)]">
                              ({p.criticalIssues} kritisch)
                            </span>
                          ) : null}
                        </p>
                        {p.nextDeadline ? (
                          <p
                            className={`text-[11px] mt-0.5 truncate max-w-[160px] ${deadlineToneClass(p.nextDeadline.daysRemaining)}`}
                            title={`${p.nextDeadline.task} · ${formatDateShort(p.nextDeadline.deadline)}`}
                          >
                            {urgencyLabel(p.nextDeadline.daysRemaining)} ·{" "}
                            {p.nextDeadline.task}
                          </p>
                        ) : null}
                      </>
                    )}
                  </td>
                  <td data-col="contacts" className="px-3 py-3 align-top">
                    <div className="flex items-center gap-1">
                      {ROLES.map((role) => (
                        <ContactBadge
                          key={role}
                          role={role}
                          contact={p.contactsByRole[role]}
                        />
                      ))}
                      {p.totalContacts >
                      Object.keys(p.contactsByRole).length ? (
                        <span
                          className="text-[10px] text-[color:var(--color-fg-muted)] ml-1"
                          title={`Insgesamt ${p.totalContacts} Kontakte`}
                        >
                          +{p.totalContacts - Object.keys(p.contactsByRole).length}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td data-col="progress" className="px-3 py-3 align-top">
                    <div className="flex items-center gap-2 min-w-[100px]">
                      <div className="flex-1 h-px bg-[color:var(--color-border)] relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-[color:var(--color-accent)]"
                          style={{ width: `${p.progress * 100}%` }}
                        />
                      </div>
                      <span className="font-mono text-[11px] tabular-nums">
                        {Math.round(p.progress * 100)}%
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
