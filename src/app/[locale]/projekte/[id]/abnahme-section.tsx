import { Link } from "@/i18n/navigation";
import { formatDateShort, urgencyClasses } from "@/lib/utils";
import {
  VORGANG_STATUS_LABEL,
  VORGANG_STATUS_TONE,
} from "@/lib/vorgang";
import { RiskScorePill } from "@/components/vorgang/RiskScorePill";
import type { ContractType } from "@/db/schema";
import { createAbnahmeMangelVorgang } from "./abnahme-actions";

type FristMin = {
  id: string;
  task: string;
  deadline: string;
  legalBasis: string | null;
  daysRemaining: number;
  urgency: "critical" | "warning" | "info";
};

type VorgangMin = {
  id: string;
  title: string;
  status:
    | "offen"
    | "in_bearbeitung"
    | "wartet_auf_anwalt"
    | "abgeschlossen"
    | "archiviert";
  category: "maengelruege" | "anlieferung" | "vertragspflicht" | "sonstiges";
  riskScore: number;
  dueDate: string | null;
  createdAt: Date;
};

const CONTRACT_LABEL: Record<ContractType, string> = {
  bgb_werkvertrag: "BGB",
  vob_vertrag: "VOB",
  verbraucherbauvertrag: "Verbraucher",
};

/**
 * Abnahme-Sektion auf der Projekt-Detail-Seite. Wird NUR gerendert, wenn
 * `project.status === "Abnahme"`. Deckt die juristisch explosivste Phase
 * mit drei Bausteinen ab:
 *   1. Stichtags-Block (Abnahme, Schlussrechnungs-Frist, Gewährleistungs-Ende)
 *   2. Mängelliste-Erfassung — pro Mangel ein Vorgang
 *   3. Abnahme-Mängel-Vorgangs-Liste (Filter: maengelruege seit Abnahme-Datum)
 */
export function AbnahmeSection({
  projectId,
  abnahmeDate,
  warrantyEnd,
  contractType,
  fristen,
  abnahmeMaengelVorgaenge,
}: {
  projectId: string;
  abnahmeDate: string | null;
  warrantyEnd: string | null;
  contractType: ContractType | null;
  fristen: FristMin[];
  abnahmeMaengelVorgaenge: VorgangMin[];
}) {
  const schlussrechnungsFrist = fristen.find(
    (f) => f.legalBasis === "§ 16 Abs. 3 VOB/B"
  );
  const gewaehrleistungsFrist = fristen.find(
    (f) =>
      f.legalBasis === "§ 13 Abs. 4 VOB/B" || f.legalBasis === "§ 634a BGB"
  );

  return (
    <section className="border-t border-[color:var(--color-border)] pt-10 pb-12">
      <div className="flex items-baseline justify-between gap-3 flex-wrap mb-2">
        <h2 className="text-xl font-semibold tracking-tight flex items-center gap-3">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.22em] border rounded-sm px-2 py-1 bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]"
          >
            Phase 3
          </span>
          Abnahme — Workflow
        </h2>
        <div className="flex items-center gap-3">
          <Link
            href={`/projekte/${projectId}/abnahme`}
            className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            → Abnahmeprotokolle
          </Link>
          <span className="text-xs text-[color:var(--color-fg-muted)]">
            {contractType ? `Vertragsgrundlage ${CONTRACT_LABEL[contractType]}` : "Vertragsgrundlage offen"}
          </span>
        </div>
      </div>
      <p className="text-sm text-[color:var(--color-fg-muted)] mb-6 max-w-2xl">
        Juristisch der explosivste Punkt: Übergang Gefahr und Vergütung,
        Beweislast-Umkehr für Mängel, Beginn Gewährleistungsfrist. Erfasse
        jetzt die Abnahme-Mängel — jeder wird automatisch ein Vorgang mit
        § 13 Abs. 5 VOB/B-Citation und § 640 BGB-Vorbehalt.
      </p>

      <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3 mb-8">
        <KeyDate label="Abnahme-Datum" value={formatDateShort(abnahmeDate)} />
        <KeyDate
          label="Schlussrechnungs-Frist"
          value={
            schlussrechnungsFrist
              ? `${formatDateShort(schlussrechnungsFrist.deadline)} (in ${schlussrechnungsFrist.daysRemaining} d)`
              : "—"
          }
          legalBasis="§ 16 Abs. 3 VOB/B · 30 d"
          urgency={schlussrechnungsFrist?.urgency}
        />
        <KeyDate
          label="Gewährleistungs-Ende"
          value={formatDateShort(warrantyEnd)}
          legalBasis={
            contractType === "vob_vertrag"
              ? "§ 13 Abs. 4 VOB/B · 4 J."
              : "§ 634a BGB · 5 J."
          }
        />
      </div>

      {gewaehrleistungsFrist ? (
        <div className="border-l-2 border-[color:var(--color-accent)] pl-4 py-2 mb-8 bg-[color:var(--color-bg-subtle)]">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            Gewährleistungs-Vorabwarnung angelegt
          </p>
          <p className="mt-1 text-sm text-[color:var(--color-fg)]">
            Frist: <strong>{formatDateShort(gewaehrleistungsFrist.deadline)}</strong>
            {" — "}
            <span className="text-[color:var(--color-fg-muted)]">
              60 Tage vor Verjährung. Letzte Chance, Mängel formell geltend zu machen.
            </span>
          </p>
        </div>
      ) : null}

      <div className="grid gap-10 md:grid-cols-2">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
            Mangel beim Abnahmeprotokoll erfassen
          </p>
          <form
            action={createAbnahmeMangelVorgang}
            className="space-y-3 border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-4"
          >
            <input type="hidden" name="projectId" value={projectId} />
            <textarea
              name="description"
              rows={4}
              required
              minLength={5}
              maxLength={2000}
              placeholder="z. B. Treppenhaus 1.OG: 18 m² horizontale Risse im Putz, vom AG vorgehalten…"
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none resize-y font-sans"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-accent)] text-white hover:bg-[color:var(--color-fg)] px-5 py-2 text-sm transition-colors"
            >
              Mangel erfassen → Vorgang anlegen
            </button>
            <p className="text-[11px] text-[color:var(--color-fg-muted)]">
              Erzeugt einen Vorgang Mängelrüge mit Pflicht-Citation auf
              § 13 Abs. 5 VOB/B und § 640 BGB. Bearbeitungsfrist 14 Tage.
            </p>
          </form>
        </div>

        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
            Erfasste Abnahme-Mängel · {abnahmeMaengelVorgaenge.length}
          </p>
          {abnahmeMaengelVorgaenge.length === 0 ? (
            <p className="text-sm text-[color:var(--color-fg-muted)] italic border border-dashed border-[color:var(--color-border)] rounded-md p-6 text-center">
              Noch kein Mangel erfasst. Erfasse alle bekannten Mängel im
              Abnahmeprotokoll — fehlende Vorbehalte beim Abnahmeprotokoll
              führen zu Beweislast-Umkehr.
            </p>
          ) : (
            <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
              {abnahmeMaengelVorgaenge.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/vorgaenge/${v.id}`}
                    className="flex items-center gap-3 py-3 group"
                  >
                    <p className="flex-1 text-sm text-[color:var(--color-fg)] group-hover:text-[color:var(--color-accent)] transition-colors truncate">
                      {v.title}
                    </p>
                    {v.dueDate ? (
                      <span className="text-[11px] text-[color:var(--color-fg-muted)] shrink-0">
                        Frist {formatDateShort(v.dueDate)}
                      </span>
                    ) : null}
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-2 py-0.5 shrink-0 ${VORGANG_STATUS_TONE[v.status]}`}
                    >
                      {VORGANG_STATUS_LABEL[v.status]}
                    </span>
                    <RiskScorePill score={v.riskScore} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function KeyDate({
  label,
  value,
  legalBasis,
  urgency,
}: {
  label: string;
  value: string;
  legalBasis?: string;
  urgency?: "critical" | "warning" | "info";
}) {
  return (
    <div className="bg-[color:var(--color-bg)] p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 text-xl font-semibold tracking-tight ${
          urgency === "critical"
            ? "text-[color:var(--color-critical)]"
            : urgency === "warning"
              ? "text-[color:var(--color-warning)]"
              : "text-[color:var(--color-fg)]"
        }`}
      >
        {value}
      </p>
      {legalBasis ? (
        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
          {legalBasis}
        </p>
      ) : null}
      {urgency ? (
        <span
          className={`mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-1.5 py-0.5 ${urgencyClasses(urgency)}`}
        >
          {urgency === "critical" ? "kritisch" : urgency === "warning" ? "in Sicht" : "ok"}
        </span>
      ) : null}
    </div>
  );
}
