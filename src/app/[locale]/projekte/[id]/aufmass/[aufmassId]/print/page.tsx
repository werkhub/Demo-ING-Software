import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  getAufmass,
  getAufmassZeilen,
  getLvItems,
  getProjectById,
} from "@/db/queries";
import {
  AUFMASS_STATUS_LABEL,
  computeAufmassTotals,
} from "@/lib/aufmass";
import { fmtMoney, formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AufmassPrintPage({
  params,
}: {
  params: Promise<{ id: string; aufmassId: string }>;
}) {
  const { id, aufmassId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const a = await getAufmass(aufmassId);
  if (!a || a.projectId !== project.id) notFound();
  const zeilen = await getAufmassZeilen(aufmassId);
  const lvItems = await getLvItems(a.lvId);
  const totals = computeAufmassTotals(zeilen);

  const workspaceId = await getCurrentWorkspaceId();
  const [workspace] = await db
    .select({ name: schema.workspaces.name })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);

  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white text-black p-12 print:p-0">
      <div className="max-w-[820px] mx-auto print:max-w-none">
        <div className="flex justify-between items-start mb-8 pb-4 border-b border-black/20">
          <div className="text-sm">
            <p className="font-semibold">{workspace?.name ?? "[Auftragnehmer]"}</p>
            <p className="text-gray-600 text-xs">
              Aufmaß nach REB 23.003
            </p>
          </div>
          <div className="text-right text-sm">
            <p>{today}</p>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Aufmaß</h1>
          <p className="text-sm text-gray-600 mt-1">{a.name}</p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row label="Bauvorhaben" value={`${project.identifier} — ${project.name}`} />
          <Row label="Auftraggeber" value={project.ag} />
          {project.siteAddress ? (
            <Row label="Bauort" value={project.siteAddress} />
          ) : null}
          <Row label="Status" value={AUFMASS_STATUS_LABEL[a.status]} />
          {a.periodStart ? (
            <Row label="Periode von" value={formatDateShort(a.periodStart)} />
          ) : null}
          {a.periodEnd ? (
            <Row label="Periode bis" value={formatDateShort(a.periodEnd)} />
          ) : null}
        </div>

        <div className="mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b border-black/20 pb-1">
            Aufmaßzeilen ({zeilen.length})
          </h2>
          {zeilen.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Keine Zeilen erfasst.
            </p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-black/20 text-left text-[10px] uppercase tracking-wider text-gray-600">
                  <th className="py-1 pr-2 w-[8%]">OZ</th>
                  <th className="py-1 pr-2 w-[28%]">Beschreibung / Formel</th>
                  <th className="py-1 pr-2 w-[10%] text-right">Menge</th>
                  <th className="py-1 pr-2 w-[6%]">EH</th>
                  <th className="py-1 pr-2 w-[12%] text-right">EP</th>
                  <th className="py-1 pr-2 w-[14%] text-right">GP</th>
                  <th className="py-1 w-[12%]">Status</th>
                </tr>
              </thead>
              <tbody>
                {zeilen.map((z) => {
                  const lvi = lvItems.find((it) => it.id === z.lvItemId);
                  const oz = z.ozOverride ?? lvi?.oz ?? "—";
                  const useApproved = z.status === "gekuerzt";
                  return (
                    <tr key={z.id} className="border-b border-black/5 align-top">
                      <td className="py-2 pr-2 font-mono">{oz}</td>
                      <td className="py-2 pr-2">
                        <p>{z.description}</p>
                        {z.formula ? (
                          <p className="font-mono text-gray-500 text-[10px] mt-0.5">
                            {z.formula}
                          </p>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2 text-right font-mono">
                        {useApproved && z.approvedQuantity !== null
                          ? z.approvedQuantity.toLocaleString("de-DE")
                          : z.computedQuantity !== null
                            ? z.computedQuantity.toLocaleString("de-DE")
                            : ""}
                      </td>
                      <td className="py-2 pr-2 font-mono">{z.unit ?? ""}</td>
                      <td className="py-2 pr-2 text-right font-mono">
                        {z.unitPrice !== null ? fmtMoney(z.unitPrice) : ""}
                      </td>
                      <td className="py-2 pr-2 text-right font-mono font-medium">
                        {useApproved && z.approvedTotal !== null
                          ? fmtMoney(z.approvedTotal)
                          : z.totalPrice !== null
                            ? fmtMoney(z.totalPrice)
                            : ""}
                      </td>
                      <td className="py-2 text-[10px] uppercase tracking-wider text-gray-600">
                        {z.status === "offen" ? "—" : z.status}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-black/30">
                  <td colSpan={5} className="py-3 text-right font-semibold">
                    Aufmaßsumme erfasst (netto)
                  </td>
                  <td className="py-3 text-right font-mono font-semibold">
                    {fmtMoney(totals.totalNet)}
                  </td>
                  <td></td>
                </tr>
                {totals.totalApprovedNet !== totals.totalNet ? (
                  <tr className="border-t border-black/10">
                    <td
                      colSpan={5}
                      className="py-1 text-right font-semibold text-gray-600"
                    >
                      Anerkannt netto
                    </td>
                    <td className="py-1 text-right font-mono font-semibold">
                      {fmtMoney(totals.totalApprovedNet)}
                    </td>
                    <td></td>
                  </tr>
                ) : null}
              </tfoot>
            </table>
          )}
        </div>

        <div className="mt-12 grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="border-b border-black h-16"></div>
            <p className="mt-1 text-xs text-gray-600">
              Auftragnehmer · Datum / Ort
            </p>
          </div>
          <div>
            <div className="border-b border-black h-16"></div>
            <p className="mt-1 text-xs text-gray-600">
              Auftraggeber / Prüfer · Datum / Ort
            </p>
          </div>
        </div>

        <div className="mt-12 pt-3 border-t border-black/20 text-[10px] text-gray-500 flex justify-between">
          <span>Aufmaß nach REB 23.003</span>
          <span>Aufmaß-ID: {a.id}</span>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `if (typeof window !== "undefined") { setTimeout(() => window.print(), 200); }`,
          }}
        />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
