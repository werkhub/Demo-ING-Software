import { Link } from "@/i18n/navigation";
import type { Vorgang, Project, User } from "@/db/schema";
import { formatDateShort } from "@/lib/utils";
import {
  VORGANG_CATEGORY_LABEL,
  VORGANG_STATUS_LABEL,
  VORGANG_STATUS_TONE,
} from "@/lib/vorgang";
import { RiskScorePill } from "./RiskScorePill";

export type VorgangRow = Vorgang & {
  projectIdentifier?: string | null;
  projectName?: string | null;
  assignedToName?: string | null;
};

export function VorgangListTable({
  rows,
  projects,
  users,
}: {
  rows: Vorgang[];
  projects: Pick<Project, "id" | "identifier" | "name">[];
  users: Pick<User, "id" | "name">[];
}) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)] py-12 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
        Noch keine Vorgänge. Lege den ersten über{" "}
        <Link href="/vorgaenge/new" className="underline">
          /vorgaenge/new
        </Link>{" "}
        an.
      </p>
    );
  }
  const projectMap = new Map(projects.map((p) => [p.id, p]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return (
    <div className="overflow-x-auto -mx-4 md:mx-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-[color:var(--color-border)]">
            <Th>Titel</Th>
            <Th>Projekt</Th>
            <Th>Kategorie</Th>
            <Th>Frist</Th>
            <Th>Verantwortlich</Th>
            <Th>Status</Th>
            <Th className="text-right">Risk</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => {
            const project = v.projectId ? projectMap.get(v.projectId) : null;
            const assignee = v.assignedTo ? userMap.get(v.assignedTo) : null;
            return (
              <tr
                key={v.id}
                className="border-b border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)] transition-colors"
              >
                <td className="py-3 px-4 align-top">
                  <Link
                    href={`/vorgaenge/${v.id}`}
                    className="block group"
                  >
                    <p className="text-sm font-medium text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors line-clamp-2">
                      {v.title}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-0.5">
                      {v.id}
                    </p>
                  </Link>
                </td>
                <td className="py-3 px-3 align-top">
                  {project ? (
                    <Link
                      href={`/projekte/${project.id}`}
                      className="text-xs hover:text-[color:var(--color-accent)] transition-colors"
                    >
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                        {project.identifier}
                      </span>
                      <br />
                      <span>{project.name}</span>
                    </Link>
                  ) : (
                    <span className="text-xs text-[color:var(--color-fg-muted)]">—</span>
                  )}
                </td>
                <td className="py-3 px-3 align-top">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                    {VORGANG_CATEGORY_LABEL[v.category]}
                  </span>
                </td>
                <td className="py-3 px-3 align-top text-xs">
                  {v.dueDate ? formatDateShort(v.dueDate) : "—"}
                </td>
                <td className="py-3 px-3 align-top text-xs">
                  {assignee?.name ?? "—"}
                </td>
                <td className="py-3 px-3 align-top">
                  <span
                    className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-0.5 ${VORGANG_STATUS_TONE[v.status]}`}
                  >
                    {VORGANG_STATUS_LABEL[v.status]}
                  </span>
                </td>
                <td className="py-3 px-3 align-top text-right">
                  <RiskScorePill score={v.riskScore} />
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
