import { Link } from "@/i18n/navigation";
import { getProjectsTableRows, getProjectsWithStats } from "@/db/queries";
import { fmtMoney, formatDateShort, urgencyLabel } from "@/lib/utils";
import { getCurrentWorkspace } from "@/lib/session";
import { Container } from "@/components/container";
import { ProjectsFilterBar } from "./projects-filter-bar";
import { ProjectsTable } from "./projects-table";
import { ProjectsTableShell } from "./projects-table-shell";
import type { ProjectStatus } from "@/db/schema";

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

type StatsRow = Awaited<ReturnType<typeof getProjectsWithStats>>[number];
type TableRow = Awaited<ReturnType<typeof getProjectsTableRows>>[number];

function applyFilters<T extends StatsRow>(
  projects: T[],
  search: { q: string; status: string; sort: string; flag: string }
): T[] {
  const q = search.q.trim().toLowerCase();
  const filtered = projects.filter((p) => {
    if (search.status && p.status !== search.status) return false;
    if (search.flag) {
      switch (search.flag) {
        case "critical":
          if (p.criticalIssues <= 0) return false;
          break;
        case "compliance": {
          if (!("subcontractorsCriticalCompliance" in p)) return false;
          const r = p as unknown as TableRow;
          if (
            r.subcontractorsCriticalCompliance <= 0 &&
            r.subcontractorsBlocked <= 0 &&
            r.subcontractorsCertExpiring <= 0
          ) {
            return false;
          }
          break;
        }
        case "securities-expiring": {
          if (!("securitiesExpiring30d" in p)) return false;
          const r = p as unknown as TableRow;
          if (r.securitiesExpiring30d <= 0) return false;
          break;
        }
        case "nachtraege-open": {
          if (!("nachtraegeOffenCount" in p)) return false;
          const r = p as unknown as TableRow;
          if (r.nachtraegeOffenCount <= 0) return false;
          break;
        }
        case "confidential":
          if (!p.vertraulich) return false;
          break;
      }
    }
    if (!q) return true;
    return (
      p.name.toLowerCase().includes(q) ||
      p.ag.toLowerCase().includes(q) ||
      p.identifier.toLowerCase().includes(q) ||
      (p.siteAddress?.toLowerCase().includes(q) ?? false)
    );
  });

  const sorted = [...filtered];
  switch (search.sort) {
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
    case "nachtraege-offen": {
      sorted.sort((a, b) => {
        const av =
          "nachtraegeOffenSum" in a
            ? ((a as unknown as TableRow).nachtraegeOffenSum ?? 0)
            : 0;
        const bv =
          "nachtraegeOffenSum" in b
            ? ((b as unknown as TableRow).nachtraegeOffenSum ?? 0)
            : 0;
        return bv - av;
      });
      break;
    }
    case "securities-sum": {
      sorted.sort((a, b) => {
        const av =
          "securitiesActiveSum" in a
            ? ((a as unknown as TableRow).securitiesActiveSum ?? 0)
            : 0;
        const bv =
          "securitiesActiveSum" in b
            ? ((b as unknown as TableRow).securitiesActiveSum ?? 0)
            : 0;
        return bv - av;
      });
      break;
    }
    case "risk": {
      sorted.sort((a, b) => {
        const av =
          "riskScoreMax" in a
            ? ((a as unknown as TableRow).riskScoreMax ?? -1)
            : -1;
        const bv =
          "riskScoreMax" in b
            ? ((b as unknown as TableRow).riskScoreMax ?? -1)
            : -1;
        return bv - av;
      });
      break;
    }
    default:
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  return sorted;
}

function deadlineToneClass(daysRemaining: number): string {
  if (daysRemaining <= 1) return "text-[color:var(--color-critical)]";
  if (daysRemaining <= 7) return "text-[color:var(--color-warning)]";
  return "text-[color:var(--color-fg-muted)]";
}

export const dynamic = "force-dynamic";

export default async function Projekte({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sort?: string;
    view?: string;
    flag?: string;
  }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "table" ? "table" : "cards";
  const workspace = await getCurrentWorkspace();
  const isIngenieurbuero = workspace.workspaceRole === "ingenieurbuero";

  const all =
    view === "table" ? await getProjectsTableRows() : await getProjectsWithStats();
  const filtered = applyFilters(all, {
    q: sp.q ?? "",
    status: sp.status ?? "",
    sort: sp.sort ?? "recent",
    flag: sp.flag ?? "",
  });

  const isFiltered = filtered.length !== all.length;

  return (
    <Container size={view === "table" ? "wide" : "default"}>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Bauvorhaben
        </p>
        <div className="mt-4 flex items-end justify-between gap-6 flex-wrap">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter">
              Projekte
            </h1>
            <p className="mt-3 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
              {all.length} Bauvorhaben · live aus der Datenbank · Fristen, Bautagebuch,
              Nachträge und Anfragen je Projekt verknüpft
            </p>
          </div>
          <Link
            href="/projekte/new"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Neues Projekt <span aria-hidden>→</span>
          </Link>
        </div>
      </section>

      {all.length > 0 ? (
        <section className="pb-6">
          <ProjectsFilterBar />
          {isFiltered ? (
            <p className="mt-3 text-xs text-[color:var(--color-fg-muted)]">
              {filtered.length} von {all.length} Projekten
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="pb-16">
        {all.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-16 text-center">
            <h2 className="text-xl font-semibold tracking-tight">Noch keine Projekte</h2>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)] max-w-md mx-auto">
              Lege dein erstes Bauvorhaben an, um mit der Recht-Verfolgung zu starten.
            </p>
            <Link
              href="/projekte/new"
              className="inline-flex mt-6 items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Erstes Projekt anlegen →
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-16 text-center">
            <h2 className="text-xl font-semibold tracking-tight">
              Kein Projekt entspricht den Filtern
            </h2>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              Bitte Filter anpassen oder zurücksetzen.
            </p>
          </div>
        ) : view === "table" ? (
          (() => {
            const tableAll = all as TableRow[];
            const flagCounts = {
              critical: tableAll.filter((p) => p.criticalIssues > 0).length,
              compliance: tableAll.filter(
                (p) =>
                  p.subcontractorsCriticalCompliance > 0 ||
                  p.subcontractorsBlocked > 0 ||
                  p.subcontractorsCertExpiring > 0
              ).length,
              "securities-expiring": tableAll.filter(
                (p) => p.securitiesExpiring30d > 0
              ).length,
              "nachtraege-open": tableAll.filter(
                (p) => p.nachtraegeOffenCount > 0
              ).length,
              confidential: tableAll.filter((p) => p.vertraulich).length,
            };
            return (
              <ProjectsTableShell flagCounts={flagCounts}>
                <ProjectsTable
                  rows={filtered as TableRow[]}
                  isIngenieurbuero={isIngenieurbuero}
                  searchParams={sp}
                />
              </ProjectsTableShell>
            );
          })()
        ) : (
          <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3">
            {filtered.map((p) => (
              <Link
                key={p.id}
                href={`/projekte/${p.id}`}
                className="bg-[color:var(--color-bg)] p-7 group hover:bg-[color:var(--color-bg-subtle)] transition-colors block"
              >
                <div className="flex items-start justify-between mb-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                    {p.identifier}
                  </p>
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${statusClass[p.status]}`}
                  >
                    {p.status}
                  </span>
                </div>
                <h3 className="text-lg font-semibold tracking-tight text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors">
                  {p.name}
                </h3>
                <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">{p.ag}</p>
                {p.siteAddress ? (
                  <p className="mt-1 text-[11px] text-[color:var(--color-fg-muted)] truncate">
                    {p.siteAddress}
                  </p>
                ) : null}
                <p className="mt-5 text-2xl font-semibold tracking-tight">
                  {isIngenieurbuero && p.hoaiHonorarsummeNettoCents
                    ? fmtMoney(p.hoaiHonorarsummeNettoCents / 100)
                    : fmtMoney(p.value)}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wider font-mono text-[color:var(--color-fg-muted)]">
                  {isIngenieurbuero
                    ? p.hoaiHonorarsummeNettoCents
                      ? `HOAI-Honorar netto · ${p.hoaiParagraph ?? ""}`
                      : "kein HOAI-Honorar gesetzt"
                    : "Auftragsvolumen"}
                </p>

                <div className="mt-5">
                  <div className="flex justify-between text-[11px] text-[color:var(--color-fg-muted)] mb-2">
                    <span className="font-mono uppercase tracking-[0.18em]">
                      Fortschritt
                    </span>
                    <span className="text-[color:var(--color-fg)] font-medium">
                      {Math.round(p.progress * 100)} %
                    </span>
                  </div>
                  <div className="h-px bg-[color:var(--color-border)] relative overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 bg-[color:var(--color-accent)]"
                      style={{ width: `${p.progress * 100}%` }}
                    />
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[color:var(--color-border)] grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[color:var(--color-fg-muted)]">Fristen: </span>
                    <span className="text-[color:var(--color-fg)] font-medium">
                      {p.openIssues}
                    </span>
                    {p.criticalIssues > 0 ? (
                      <span className="ml-1 text-[color:var(--color-critical)] font-medium">
                        ({p.criticalIssues} kritisch)
                      </span>
                    ) : null}
                  </div>
                  {p.nextDeadline ? (
                    <div
                      className={`truncate font-medium ${deadlineToneClass(p.nextDeadline.daysRemaining)}`}
                      title={`${p.nextDeadline.task} · ${formatDateShort(p.nextDeadline.deadline)}`}
                    >
                      {urgencyLabel(p.nextDeadline.daysRemaining)}
                    </div>
                  ) : (
                    <div className="text-[color:var(--color-fg-muted)]">
                      Keine Frist
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}
