import { notFound } from "next/navigation";
import {
  getArPositionen,
  getAusgangsrechnung,
  getProjectById,
} from "@/db/queries";
import { AR_KIND_LABEL } from "@/lib/ausgangsrechnungen";
import { fmtMoney, formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ArPrintPage({
  params,
}: {
  params: Promise<{ id: string; arId: string }>;
}) {
  const { id, arId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const ar = await getAusgangsrechnung(arId);
  if (!ar || ar.projectId !== project.id) notFound();
  const positionen = await getArPositionen(arId);

  return (
    <div className="min-h-screen bg-white text-black p-12 print:p-0">
      <div className="max-w-[820px] mx-auto print:max-w-none">
        {/* Briefkopf */}
        <div className="flex justify-between items-start mb-8 pb-4 border-b border-black/20">
          <div className="text-sm">
            <p className="font-semibold">{ar.partyAn ?? "[Auftragnehmer]"}</p>
            {ar.partyAnAddress ? (
              <p className="text-gray-600 whitespace-pre-line">
                {ar.partyAnAddress}
              </p>
            ) : null}
          </div>
          <div className="text-right text-sm space-y-0.5">
            {ar.partyAnTaxId ? (
              <p className="text-xs">Steuernummer: {ar.partyAnTaxId}</p>
            ) : null}
            {ar.partyAnVatId ? (
              <p className="text-xs">USt-IdNr.: {ar.partyAnVatId}</p>
            ) : null}
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

        {/* Rechnungs-Header */}
        <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <h1 className="text-xl font-bold">
              {AR_KIND_LABEL[ar.kind]}
              {ar.kind === "abschlag" && ar.abschlagNo
                ? ` Nr. ${ar.abschlagNo}`
                : ""}
            </h1>
            {ar.subjectLine ? (
              <p className="text-sm text-gray-600 mt-0.5">{ar.subjectLine}</p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              Rechnungsnummer
            </p>
            <p className="font-mono font-semibold">{ar.number}</p>
            <p className="text-xs uppercase tracking-wider text-gray-500 mt-1">
              Rechnungsdatum
            </p>
            <p className="font-mono font-semibold">
              {formatDateShort(ar.invoiceDate)}
            </p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row
            label="Bauvorhaben"
            value={`${project.identifier} — ${project.name}`}
          />
          {project.siteAddress ? (
            <Row label="Bauort" value={project.siteAddress} />
          ) : null}
          {ar.serviceStart || ar.serviceEnd ? (
            <Row
              label="Leistungszeitraum"
              value={`${formatDateShort(ar.serviceStart)} — ${formatDateShort(ar.serviceEnd)}`}
            />
          ) : null}
          {ar.dueDate ? (
            <Row label="Zahlungsziel" value={formatDateShort(ar.dueDate)} />
          ) : null}
        </div>

        {/* Positionen */}
        <table className="w-full text-xs mb-4">
          <thead>
            <tr className="border-b border-black/30 text-left text-[10px] uppercase tracking-wider text-gray-600">
              <th className="py-1 pr-2 w-[8%]">OZ</th>
              <th className="py-1 pr-2 w-[40%]">Bezeichnung</th>
              <th className="py-1 pr-2 w-[10%] text-right">Menge</th>
              <th className="py-1 pr-2 w-[6%]">EH</th>
              <th className="py-1 pr-2 w-[14%] text-right">EP</th>
              <th className="py-1 pr-2 w-[14%] text-right">GP</th>
              <th className="py-1 w-[8%] text-right">MwSt %</th>
            </tr>
          </thead>
          <tbody>
            {positionen.map((p) => (
              <tr key={p.id} className="border-b border-black/5 align-top">
                <td className="py-2 pr-2 font-mono">{p.oz ?? ""}</td>
                <td className="py-2 pr-2">{p.description}</td>
                <td className="py-2 pr-2 text-right font-mono">
                  {p.quantity !== null ? p.quantity.toLocaleString("de-DE") : ""}
                </td>
                <td className="py-2 pr-2 font-mono">{p.unit ?? ""}</td>
                <td className="py-2 pr-2 text-right font-mono">
                  {p.unitPrice !== null ? fmtMoney(p.unitPrice) : ""}
                </td>
                <td className="py-2 pr-2 text-right font-mono">
                  {p.totalPrice !== null ? fmtMoney(p.totalPrice) : ""}
                </td>
                <td className="py-2 text-right font-mono">{p.vatPercent}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summen */}
        <div className="ml-auto w-full max-w-[400px] text-sm space-y-1 mt-4 mb-6">
          <SumRow label="Positionen netto" value={fmtMoney(ar.totalPositionsNet)} />
          {ar.previousAbschlaegeNet > 0 ? (
            <SumRow
              label="− vorherige Abschläge (netto)"
              value={`− ${fmtMoney(ar.previousAbschlaegeNet)}`}
            />
          ) : null}
          {ar.securityRetentionAmount > 0 ? (
            <SumRow
              label={`− Sicherheitseinbehalt ${ar.securityRetentionPercent ?? 0} %`}
              value={`− ${fmtMoney(ar.securityRetentionAmount)}`}
            />
          ) : null}
          <SumRow
            label="Auszahlbar netto"
            value={fmtMoney(ar.payoutNet)}
            bold
          />
          <SumRow
            label={`zzgl. MwSt ${ar.vatPercent} %`}
            value={fmtMoney(ar.payoutVat)}
          />
          <SumRow
            label="Auszahlbar brutto"
            value={fmtMoney(ar.payoutGross)}
            bold
            big
          />
        </div>

        {/* Skonto-Hinweis */}
        {ar.skontoPercent && ar.skontoDays ? (
          <p className="text-xs text-gray-700 mb-4">
            <strong>Skonto:</strong> {ar.skontoPercent} % bei Zahlung innerhalb
            {" "}{ar.skontoDays} Tagen.
          </p>
        ) : null}

        {/* Schlusszahlungs-Vorbehalt */}
        {ar.kind === "schluss" && ar.schlusszahlungsVorbehalt ? (
          <div className="border border-black/20 p-3 text-xs mb-4">
            <p className="font-semibold mb-1">
              Schlusszahlungs-Vorbehalt (§ 16 III S. 6 VOB/B):
            </p>
            <p className="whitespace-pre-wrap">{ar.schlusszahlungsVorbehalt}</p>
          </div>
        ) : null}

        {/* Footer */}
        <div className="mt-12 pt-3 border-t border-black/20 text-[10px] text-gray-500 flex justify-between">
          <span>
            Rechnungsangaben gem. § 14 UStG · Zahlung innerhalb 30 Tagen netto
            ohne Abzug, soweit nicht anders vereinbart (§ 16 III VOB/B).
          </span>
          <span>{ar.number}</span>
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

function SumRow({
  label,
  value,
  bold,
  big,
}: {
  label: string;
  value: string;
  bold?: boolean;
  big?: boolean;
}) {
  return (
    <div
      className={
        "flex justify-between items-baseline border-b border-black/10 py-1 " +
        (bold ? "font-semibold " : "") +
        (big ? "text-base border-black/30 border-b-2 pt-2 mt-1" : "")
      }
    >
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
