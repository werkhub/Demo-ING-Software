import { Link } from "@/i18n/navigation";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { formatDateShort } from "@/lib/utils";
import type { PlanVersandweg } from "@/db/schema";
import { BestaetigenButton } from "./bestaetigen-button";

const VERSANDWEG_LABEL: Record<PlanVersandweg, string> = {
  email: "E-Mail",
  brief: "Brief",
  einschreiben: "Einschreiben",
  uebergabe: "Übergabe",
  upload: "Cloud-Upload",
};

export async function PlanVersandSection({
  workspaceId,
  planId,
  projectId,
  versionLabels,
}: {
  workspaceId: string;
  planId: string;
  projectId: string;
  versionLabels: Map<string, string>;
}) {
  const versionIds = Array.from(versionLabels.keys());
  if (versionIds.length === 0) return null;

  const eintraege = await db
    .select()
    .from(schema.plaeneVersand)
    .where(
      and(
        eq(schema.plaeneVersand.workspaceId, workspaceId),
        inArray(schema.plaeneVersand.planVersionId, versionIds)
      )
    )
    .orderBy(desc(schema.plaeneVersand.versandDatum));

  return (
    <section className="pb-8">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Versand-Doku ({eintraege.length})
        </h2>
        <Link
          href={`/projekte/${projectId}/plaene/${planId}/versand/new`}
          className="rounded-full border border-[color:var(--color-border)] px-3 py-1 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          + Versand erfassen
        </Link>
      </div>

      {eintraege.length === 0 ? (
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
          Noch kein Versand dokumentiert. Bei Honorarstreit ist die
          lückenlose Versand-Doku entscheidend (Beweismittel für „Bauherr
          hat Plan v3 erhalten").
        </p>
      ) : (
        <div className="mt-3 border border-[color:var(--color-border)] overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
              <tr>
                <th className="px-3 py-3 text-left">Datum</th>
                <th className="px-3 py-3 text-left">Index</th>
                <th className="px-3 py-3 text-left">Empfänger</th>
                <th className="px-3 py-3 text-left">Versandweg</th>
                <th className="px-3 py-3 text-left">Eingang</th>
                <th className="px-3 py-3 text-left">Kommentar</th>
              </tr>
            </thead>
            <tbody>
              {eintraege.map((e) => (
                <tr
                  key={e.id}
                  className="border-t border-[color:var(--color-border)]"
                >
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {formatDateShort(e.versandDatum)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-xs">
                    {versionLabels.get(e.planVersionId) ?? "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <p className="text-sm">{e.empfaengerName}</p>
                    {e.empfaengerEmail || e.empfaengerRolle ? (
                      <p className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                        {e.empfaengerRolle}
                        {e.empfaengerRolle && e.empfaengerEmail ? " · " : ""}
                        {e.empfaengerEmail}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {VERSANDWEG_LABEL[e.versandweg]}
                  </td>
                  <td className="px-3 py-2.5 text-xs">
                    {e.eingangBestaetigtAm ? (
                      <span className="inline-flex items-center gap-1 text-[color:var(--color-success)]">
                        ✓ {formatDateShort(e.eingangBestaetigtAm)}
                      </span>
                    ) : (
                      <BestaetigenButton id={e.id} />
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-[color:var(--color-fg-muted)] max-w-[28ch] truncate">
                    {e.kommentar ?? e.betreff ?? "—"}
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
