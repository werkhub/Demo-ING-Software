import { Link } from "@/i18n/navigation";
import type { Project } from "@/db/schema";
import { getLpSollIst } from "@/lib/stunden/lp-aggregat";
import { LP_LABEL_SHORT } from "@/lib/hoai/leistungsphasen";
import { formatEur } from "@/lib/hoai/calculator";

const fmtPct = (n: number): string =>
  new Intl.NumberFormat("de-DE", {
    style: "percent",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(n);

export async function LpSollIstSection({
  workspaceId,
  project,
}: {
  workspaceId: string;
  project: Project;
}) {
  const rows = await getLpSollIst(workspaceId, project);

  // Falls Projekt keine HOAI-Konfig hat → Hinweis statt leerer Tabelle
  const hasHoaiConfig =
    !!project.hoaiLeistungsbild &&
    !!project.hoaiHonorarzone &&
    !!project.hoaiAnrechenbareKostenCents;

  return (
    <section className="border-t border-[color:var(--color-border)] pt-10 pb-10">
      <div className="flex items-end justify-between gap-4 flex-wrap mb-5">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            HOAI · Soll-Ist je Leistungsphase
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">
            Honorar vs. Stunden-Aufwand
          </h2>
        </div>
        <Link
          href={`/projekte/${project.id}/hoai`}
          className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] px-4 py-2 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          HOAI-Konfiguration
        </Link>
      </div>

      {!hasHoaiConfig ? (
        <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            HOAI-Konfiguration fehlt — keine Soll-Ist-Anzeige möglich.
          </p>
          <Link
            href={`/projekte/${project.id}/hoai`}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            HOAI jetzt einrichten
          </Link>
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[color:var(--color-fg-muted)]">
          Beauftragte Leistungsphasen konnten nicht aus der Konfiguration
          gelesen werden.
        </p>
      ) : (
        <div className="border border-[color:var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
              <tr>
                <th className="px-3 py-3 text-left">LP</th>
                <th className="px-3 py-3 text-right">Soll-Honorar</th>
                <th className="px-3 py-3 text-right">Ist-Stunden</th>
                <th className="px-3 py-3 text-right">Ist-Lohn</th>
                <th className="px-3 py-3 text-right">Abweichung</th>
                <th className="px-3 py-3 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.lp}
                  className="border-t border-[color:var(--color-border)]"
                >
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {LP_LABEL_SHORT[r.lp]}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {formatEur(r.sollHonorarCents)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-[color:var(--color-fg-muted)]">
                    {r.istStunden > 0
                      ? r.istStunden.toFixed(1) + " h"
                      : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {r.istLohnCents > 0 ? formatEur(r.istLohnCents) : "—"}
                  </td>
                  <td
                    className={`px-3 py-2.5 text-right font-mono text-xs ${
                      r.warnung === "ueber_soll"
                        ? "text-[color:var(--color-critical)]"
                        : r.warnung === "fruehwarn"
                          ? "text-[color:var(--color-warning)]"
                          : "text-[color:var(--color-fg-muted)]"
                    }`}
                  >
                    {r.istLohnCents > 0 ? fmtPct(r.abweichungPct) : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                        r.warnung === "ueber_soll"
                          ? "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]"
                          : r.warnung === "fruehwarn"
                            ? "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]"
                            : "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]"
                      }`}
                    >
                      {r.warnung === "ueber_soll"
                        ? "Über Soll"
                        : r.warnung === "fruehwarn"
                          ? "Frühwarn"
                          : "OK"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
