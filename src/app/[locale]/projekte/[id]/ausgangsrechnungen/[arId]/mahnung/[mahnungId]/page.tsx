import { notFound } from "next/navigation";
import {
  getArMahnung,
  getAusgangsrechnung,
  getProjectById,
} from "@/db/queries";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import { MAHNUNG_LEVEL_LABEL, mahnungTotal } from "@/lib/mahnung";

export const dynamic = "force-dynamic";

export default async function MahnungPrintPage({
  params,
}: {
  params: Promise<{ id: string; arId: string; mahnungId: string }>;
}) {
  const { id, arId, mahnungId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const ar = await getAusgangsrechnung(arId);
  if (!ar || ar.projectId !== project.id) notFound();
  const m = await getArMahnung(mahnungId);
  if (!m || m.ausgangsrechnungId !== ar.id) notFound();

  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const total = mahnungTotal(ar, m);

  return (
    <div className="min-h-screen bg-white text-black p-12 print:p-0">
      <div className="max-w-[820px] mx-auto print:max-w-none">
        {/* Briefkopf */}
        <div className="flex justify-between items-start mb-8 pb-4 border-b border-black/20">
          <div className="text-sm">
            <p className="font-semibold">{ar.partyAn ?? "[Auftragnehmer]"}</p>
            {ar.partyAnAddress ? (
              <p className="text-gray-600 whitespace-pre-line text-xs">
                {ar.partyAnAddress}
              </p>
            ) : null}
          </div>
          <div className="text-right text-xs space-y-0.5">
            {ar.partyAnTaxId ? <p>Steuernr.: {ar.partyAnTaxId}</p> : null}
            {ar.partyAnVatId ? <p>USt-IdNr.: {ar.partyAnVatId}</p> : null}
          </div>
        </div>

        {/* Empfänger */}
        <div className="mb-8 text-sm">
          <p className="font-semibold">{ar.partyAg ?? "[Auftraggeber]"}</p>
          {ar.partyAgAddress ? (
            <p className="text-gray-600 whitespace-pre-line">
              {ar.partyAgAddress}
            </p>
          ) : null}
        </div>

        {/* Datum rechts */}
        <p className="text-right text-sm mb-6">{today}</p>

        {/* Titel */}
        <h1 className="text-2xl font-bold">{MAHNUNG_LEVEL_LABEL[m.level]}</h1>
        <p className="text-sm text-gray-600 mt-1 mb-8">
          zur Rechnung Nr. {ar.number} vom {formatDateShort(ar.invoiceDate)}
        </p>

        {/* Body Text — Markdown wird einfach als preformatted text gerendert */}
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm leading-relaxed mb-8">
          {m.bodyText ?? ""}
        </div>

        {/* Forderungs-Aufstellung als Tabelle */}
        <div className="border border-black/30 mb-8">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border-b border-black/20">
                  Position
                </th>
                <th className="text-right p-2 border-b border-black/20 w-32">
                  Betrag
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border-b border-black/10">
                  Hauptforderung (Rechnung {ar.number})
                </td>
                <td className="text-right p-2 border-b border-black/10 font-mono">
                  {fmtMoney(m.zinsBasisBetrag)}
                </td>
              </tr>
              <tr>
                <td className="p-2 border-b border-black/10 text-xs text-gray-700">
                  Verzugszinsen ({m.zinsTage} Tage × {m.zinsSatzPercent.toLocaleString("de-DE")} % p.a.)
                </td>
                <td className="text-right p-2 border-b border-black/10 font-mono">
                  {fmtMoney(m.verzugszinsen)}
                </td>
              </tr>
              <tr>
                <td className="p-2 border-b border-black/10 text-xs text-gray-700">
                  Mahngebühr
                </td>
                <td className="text-right p-2 border-b border-black/10 font-mono">
                  {fmtMoney(m.mahngebuehr)}
                </td>
              </tr>
              <tr className="bg-gray-50">
                <td className="p-2 font-semibold">Gesamtforderung</td>
                <td className="text-right p-2 font-mono font-semibold">
                  {fmtMoney(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-sm">
          <strong>Bitte überweisen Sie den Gesamtbetrag bis spätestens
          {" "}{formatDateShort(m.dueDate)}</strong> auf das in der Rechnung
          angegebene Konto.
        </p>

        <div className="mt-12 text-sm">
          <p>Mit freundlichen Grüßen</p>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-3 border-t border-black/20 text-[10px] text-gray-500 flex justify-between">
          <span>
            Verzugszinsen gem. § 288 BGB / § 16 III VOB/B · Mahngebühren
            BGH-konform
          </span>
          <span>{ar.number} · {MAHNUNG_LEVEL_LABEL[m.level]}</span>
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
