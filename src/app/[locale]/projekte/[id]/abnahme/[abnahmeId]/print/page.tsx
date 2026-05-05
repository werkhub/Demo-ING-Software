import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  getAbnahme,
  getMaengelByAbnahme,
  getProjectById,
} from "@/db/queries";
import {
  ABNAHME_BEURTEILUNG_LABEL,
  ABNAHME_KIND_LABEL,
  ABNAHME_KIND_LEGAL_BASIS,
  computeWarrantyEnd,
  parseAttendees,
} from "@/lib/abnahme";
import { MANGEL_PRIORITAET_LABEL, mangelTitle } from "@/lib/maengel";
import { formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AbnahmePrintPage({
  params,
}: {
  params: Promise<{ id: string; abnahmeId: string }>;
}) {
  const { id, abnahmeId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const abnahme = await getAbnahme(abnahmeId);
  if (!abnahme || abnahme.projectId !== project.id) notFound();

  const maengel = await getMaengelByAbnahme(abnahmeId);
  const attendees = parseAttendees(abnahme.attendees);

  const workspaceId = await getCurrentWorkspaceId();
  const [workspace] = await db
    .select({ name: schema.workspaces.name })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, workspaceId))
    .limit(1);

  const warranty = computeWarrantyEnd(
    abnahme.abnahmeDate,
    project.contractType
  );
  const today = new Date().toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-white text-black p-12 print:p-0">
      <div className="max-w-[800px] mx-auto print:max-w-none">
        {/* Briefkopf */}
        <div className="flex justify-between items-start mb-10 pb-4 border-b border-black/20">
          <div className="text-sm">
            <p className="font-semibold">
              {workspace?.name ?? "[Ihre Firma]"}
            </p>
          </div>
          <div className="text-right text-sm">
            <p>{today}</p>
          </div>
        </div>

        {/* Titel */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Abnahmeprotokoll
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            {ABNAHME_KIND_LABEL[abnahme.kind]} ·{" "}
            {ABNAHME_KIND_LEGAL_BASIS[abnahme.kind]}
          </p>
        </div>

        {/* Stammdaten */}
        <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <Row label="Bauvorhaben" value={`${project.identifier} — ${project.name}`} />
          <Row label="Auftraggeber" value={project.ag} />
          {project.siteAddress ? (
            <Row label="Bauort" value={project.siteAddress} />
          ) : null}
          <Row label="Abnahme-Datum" value={formatDateShort(abnahme.abnahmeDate)} />
          {abnahme.abnahmeOrt ? (
            <Row label="Abnahme-Ort" value={abnahme.abnahmeOrt} />
          ) : null}
          {abnahme.scope ? <Row label="Umfang" value={abnahme.scope} /> : null}
          <Row
            label="Beurteilung"
            value={ABNAHME_BEURTEILUNG_LABEL[abnahme.gesamtbeurteilung]}
          />
          {warranty ? (
            <Row label="Gewährleistung bis" value={formatDateShort(warranty)} />
          ) : null}
        </div>

        {/* Teilnehmer */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b border-black/20 pb-1">
            Teilnehmer
          </h2>
          {attendees.length === 0 ? (
            <p className="text-sm text-gray-500 italic">— nicht erfasst —</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="text-left py-1 font-normal text-gray-600">Name</th>
                  <th className="text-left py-1 font-normal text-gray-600">Funktion</th>
                  <th className="text-left py-1 font-normal text-gray-600 w-32">
                    Unterschrift
                  </th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((p, i) => (
                  <tr
                    key={`${p.name}-${i}`}
                    className="border-b border-black/5"
                  >
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-gray-600">{p.role}</td>
                    <td className="py-2 border-b border-black/30 h-12"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Vertragsstrafe-Vorbehalt */}
        {abnahme.vertragsstrafeAgreed ? (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b border-black/20 pb-1">
              Vertragsstrafen-Vorbehalt — § 11 Abs. 4 VOB/B
            </h2>
            {abnahme.vertragsstrafeReserved ? (
              <div className="text-sm">
                <p className="font-semibold">Vorbehalt erklärt:</p>
                <p className="mt-1 italic">
                  „
                  {abnahme.vertragsstrafeReservationText ??
                    "Der AG behält sich die Geltendmachung der vereinbarten Vertragsstrafe gem. § 11 Abs. 4 VOB/B ausdrücklich vor."}
                  "
                </p>
              </div>
            ) : (
              <p className="text-sm text-red-700">
                Kein Vorbehalt erklärt — Vertragsstrafe verfällt mit der
                Abnahme.
              </p>
            )}
          </div>
        ) : null}

        {/* Mängel */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b border-black/20 pb-1">
            Festgestellte Mängel ({maengel.length})
          </h2>
          {maengel.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              Keine Mängel festgestellt.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="text-left py-1 font-normal text-gray-600">#</th>
                  <th className="text-left py-1 font-normal text-gray-600">Mangel</th>
                  <th className="text-left py-1 font-normal text-gray-600">Priorität</th>
                  <th className="text-left py-1 font-normal text-gray-600">Frist</th>
                </tr>
              </thead>
              <tbody>
                {maengel.map((m, i) => {
                  const headLine = mangelTitle(m);
                  const restLines = m.beschreibung
                    .split("\n")
                    .slice(1)
                    .join("\n");
                  return (
                    <tr key={m.id} className="border-b border-black/5 align-top">
                      <td className="py-2 pr-2">{i + 1}</td>
                      <td className="py-2 pr-3">
                        <div className="font-medium">{headLine}</div>
                        <div className="text-gray-600 text-xs mt-0.5">
                          {m.kategorie ? `${m.kategorie} · ` : ""}
                          {m.ortImBauwerk ?? ""}
                        </div>
                        {restLines ? (
                          <div className="text-gray-700 text-xs mt-1 whitespace-pre-wrap">
                            {restLines}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-2 text-xs">
                        {MANGEL_PRIORITAET_LABEL[m.prioritaet]}
                      </td>
                      <td className="py-2 text-xs">
                        {m.fristsetzungDatum
                          ? formatDateShort(m.fristsetzungDatum)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Übergabeunterlagen */}
        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b border-black/20 pb-1">
            Übergabeunterlagen
          </h2>
          <p className="text-sm">
            {abnahme.handoverComplete
              ? "Vollständig übergeben."
              : "Unvollständig — Nachreichungen offen."}
          </p>
          {abnahme.handoverNotes ? (
            <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">
              {abnahme.handoverNotes}
            </p>
          ) : null}
        </div>

        {/* Unterschriften */}
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
              Auftraggeber · Datum / Ort
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-3 border-t border-black/20 text-[10px] text-gray-500 flex justify-between">
          <span>
            {ABNAHME_KIND_LABEL[abnahme.kind]} · {ABNAHME_KIND_LEGAL_BASIS[abnahme.kind]}
          </span>
          <span>Abnahme-ID: {abnahme.id}</span>
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
