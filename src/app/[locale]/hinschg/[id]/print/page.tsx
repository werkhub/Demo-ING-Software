import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getMeldung, getMessagesByMeldung } from "@/db/queries";
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
} from "@/lib/hinschg";
import { formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MeldungPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMeldung(id);
  if (!m) notFound();
  const messages = await getMessagesByMeldung(id);

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
      <div className="max-w-[800px] mx-auto print:max-w-none">
        <div className="flex justify-between items-start mb-8 pb-4 border-b border-black/20">
          <div className="text-sm">
            <p className="font-semibold">{workspace?.name ?? "[Meldestelle]"}</p>
            <p className="text-gray-600 text-xs">
              Interne Meldestelle nach §§ 12 ff. HinSchG
            </p>
          </div>
          <div className="text-right text-sm">
            <p>Akte ausgedruckt: {today}</p>
          </div>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold">Meldungs-Akte</h1>
          <p className="text-sm text-gray-600 mt-1">
            ID {m.id} · vertraulich
          </p>
        </div>

        <div className="mb-8 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <Row label="Eingegangen" value={m.submittedAt.toLocaleString("de-DE")} />
          <Row label="Status" value={STATUS_LABEL[m.status]} />
          <Row label="Kategorie" value={CATEGORY_LABEL[m.category]} />
          <Row
            label="Hinweisgeber"
            value={
              m.isAnonymous
                ? `anonym${m.reporterDisplayName ? ` (${m.reporterDisplayName})` : ""}`
                : m.reporterDisplayName ?? "—"
            }
          />
          {m.reporterContact ? (
            <Row label="Kontakt" value={m.reporterContact} />
          ) : null}
          <Row
            label="Eingangsbestätigung"
            value={
              m.acknowledgedAt
                ? m.acknowledgedAt.toLocaleString("de-DE")
                : "ausstehend"
            }
          />
          <Row
            label="Rückmeldungs-Frist"
            value={formatDateShort(m.responseDeadline)}
          />
          {m.closedAt ? (
            <Row
              label="Abgeschlossen"
              value={m.closedAt.toLocaleString("de-DE")}
            />
          ) : null}
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b border-black/20 pb-1">
            Betreff
          </h2>
          <p className="text-base font-medium">{m.subject}</p>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b border-black/20 pb-1">
            Sachverhalt
          </h2>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {m.bodyText}
          </p>
        </div>

        {m.responseSummary ? (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b border-black/20 pb-1">
              Zusammenfassung der Maßnahmen
            </h2>
            <p className="text-sm whitespace-pre-wrap">{m.responseSummary}</p>
          </div>
        ) : null}

        {messages.length > 0 ? (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b border-black/20 pb-1">
              Kommunikation ({messages.length})
            </h2>
            <ul className="space-y-3">
              {messages.map((msg) => (
                <li key={msg.id} className="border-l-2 border-black/30 pl-3">
                  <p className="text-xs text-gray-600">
                    {msg.direction === "from_office"
                      ? "Meldestelle"
                      : "Hinweisgeber"}
                    {" · "}
                    {msg.createdAt.toLocaleString("de-DE")}
                  </p>
                  <p className="mt-1 text-sm whitespace-pre-wrap">
                    {msg.bodyText}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {m.internalNotes ? (
          <div className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider mb-2 border-b border-black/20 pb-1">
              Interne Notizen (vertraulich)
            </h2>
            <p className="text-sm whitespace-pre-wrap">{m.internalNotes}</p>
          </div>
        ) : null}

        <div className="mt-12 pt-3 border-t border-black/20 text-[10px] text-gray-500 flex justify-between">
          <span>HinSchG-Akte · § 11 HinSchG (Aufbewahrung 3 J. nach Abschluss)</span>
          <span>vertraulich · nur § 15 HinSchG</span>
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
