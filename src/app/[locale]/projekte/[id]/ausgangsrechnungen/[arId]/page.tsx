import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import {
  ArKindBadge,
  ArStatusBadge,
} from "@/components/ar-status-badge";
import {
  getArMahnungen,
  getArPositionen,
  getAusgangsrechnung,
  getProjectById,
} from "@/db/queries";
import {
  AR_STATUS_LABEL,
  isArEditable,
  nextAllowedArStatuses,
} from "@/lib/ausgangsrechnungen";
import { isReverseCharge } from "@/lib/steuer/reverse-charge";
import {
  MAHNUNG_LEVEL_LABEL,
  STANDARD_MAHNGEBUEHR,
  mahnungTotal,
  verzugsTage,
} from "@/lib/mahnung";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import {
  deleteArPosition,
  deleteAusgangsrechnung,
  generateXRechnung,
  generateZugferd,
  markArPaid,
  updateArStatus,
} from "../ar-actions";
import {
  createMahnungVoid,
  deleteMahnung,
  markMahnungSent,
} from "../mahnung-actions";
import { HoaiBreakdownSection } from "./hoai-breakdown-section";

export const dynamic = "force-dynamic";

const todayIso = () => new Date().toISOString().slice(0, 10);

export default async function ArDetailPage({
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
  const mahnungen = await getArMahnungen(arId);
  const editable = isArEditable(ar.status);
  const rcCheck = isReverseCharge(ar, project);
  const allowedNext = nextAllowedArStatuses(ar.status);
  const tageVerzug = verzugsTage(ar);
  const isOverdue = tageVerzug > 0 && ar.status !== "bezahlt";
  const maxLevel = mahnungen.reduce((max, m) => Math.max(max, m.level), 0);
  const nextMahnungLevel = (maxLevel < 3 ? maxLevel + 1 : null) as
    | 1
    | 2
    | 3
    | null;
  const todayIsoStr = new Date().toISOString().slice(0, 10);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-mono text-base text-[color:var(--color-fg)]">
                {ar.number}
              </p>
              <ArKindBadge kind={ar.kind} abschlagNo={ar.abschlagNo} />
              <ArStatusBadge status={ar.status} size="md" />
            </div>
            <h1 className="mt-2 text-2xl md:text-3xl font-semibold tracking-tight">
              {ar.subjectLine ?? "(ohne Betreff)"}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              Rechnungsdatum {formatDateShort(ar.invoiceDate)}
              {ar.dueDate ? ` · Zahlungsziel ${formatDateShort(ar.dueDate)}` : ""}
            </p>
          </div>
          <Link
            href={`/projekte/${id}/ausgangsrechnungen`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zur Liste
          </Link>
        </div>
      </section>

      {/* Beträge */}
      <section className="border-t border-[color:var(--color-border)] pt-8 pb-6">
        <StatGrid4>
          <StatCard
            label="Positionen netto"
            value={fmtMoney(ar.totalPositionsNet)}
          />
          <StatCard
            label="Auszahlbar netto"
            value={fmtMoney(ar.payoutNet)}
            caption={
              ar.previousAbschlaegeNet > 0 ||
              ar.securityRetentionAmount > 0
                ? `nach − ${fmtMoney(ar.previousAbschlaegeNet)} Voraus, − ${fmtMoney(ar.securityRetentionAmount)} Sicherheit`
                : undefined
            }
          />
          <StatCard
            label="Auszahlbar brutto"
            value={fmtMoney(ar.payoutGross)}
            caption={`MwSt ${ar.vatPercent} %`}
          />
          <StatCard
            label="Bezahlt"
            value={
              ar.paidAmount
                ? fmtMoney(ar.paidAmount)
                : ar.status === "bezahlt"
                  ? fmtMoney(ar.payoutGross)
                  : "—"
            }
            tone={
              ar.status === "bezahlt"
                ? "success"
                : ar.status.startsWith("mahnung") ||
                    ar.status === "gerichtlich"
                  ? "critical"
                  : "default"
            }
          />
        </StatGrid4>
      </section>

      {/* Reverse-Charge § 13b UStG */}
      <section className="pb-6">
        <div
          className={`rounded-md border p-4 ${
            ar.reverseCharge
              ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)]"
              : rcCheck.applies
                ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)]"
                : "border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)]"
          }`}
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            § 13b UStG · Reverse-Charge
          </p>
          {ar.reverseCharge ? (
            <>
              <p className="mt-2 text-sm text-[color:var(--color-fg)]">
                <strong>Reverse-Charge aktiv</strong> — Rechnung weist keine
                USt aus.
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] italic">
                {ar.reverseChargeGrund ?? rcCheck.reason}
              </p>
              <p className="mt-2 font-mono text-[11px] text-[color:var(--color-fg)] border-l-2 border-[color:var(--color-warning)] pl-3">
                Pflichthinweis: Steuerschuldnerschaft des Leistungsempfängers § 13b UStG
              </p>
              {rcCheck.missing.length > 0 ? (
                <p className="mt-2 text-xs text-[color:var(--color-critical)]">
                  Fehlende Pflichtangaben: {rcCheck.missing.join(" · ")}
                </p>
              ) : null}
            </>
          ) : rcCheck.applies ? (
            <>
              <p className="mt-2 text-sm text-[color:var(--color-fg)]">
                <strong>Reverse-Charge wäre anwendbar</strong> — alle Voraussetzungen erfüllt.
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                {rcCheck.reason}. Aktivierung über Rechnungs-Bearbeitung.
              </p>
            </>
          ) : (
            <>
              <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
                Kein Reverse-Charge — reguläre USt-Ausweisung.
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] italic">
                {rcCheck.reason}
              </p>
            </>
          )}
        </div>
      </section>

      {/* Workflow-Aktionen */}
      <section className="pb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            Workflow:
          </span>
          {allowedNext.length === 0 ? (
            <span className="text-xs text-[color:var(--color-fg-muted)] italic">
              Endstatus.
            </span>
          ) : (
            allowedNext.map((next) => (
              <form key={next} action={updateArStatus} className="inline">
                <input type="hidden" name="id" value={ar.id} />
                <input type="hidden" name="status" value={next} />
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
                >
                  → {AR_STATUS_LABEL[next]}
                </button>
              </form>
            ))
          )}
          <Link
            href={`/projekte/${id}/ausgangsrechnungen/${ar.id}/print`}
            target="_blank"
            className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            🖨 Druck-Rechnung ↗
          </Link>
          {editable ? (
            <Link
              href={`/projekte/${id}/ausgangsrechnungen/${ar.id}/edit`}
              className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors ml-auto"
            >
              ✎ Stammdaten + Positionen bearbeiten
            </Link>
          ) : null}
        </div>
      </section>

      {/* Mark-Paid-Form */}
      {(ar.status === "versendet" ||
        ar.status === "teilweise_bezahlt" ||
        ar.status.startsWith("mahnung")) ? (
        <section className="pb-6">
          <form
            action={markArPaid}
            className="flex items-end gap-3 flex-wrap border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] rounded-md p-4"
          >
            <input type="hidden" name="id" value={ar.id} />
            <div>
              <label
                htmlFor="paidAt"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Zahlungseingang am
              </label>
              <input
                id="paidAt"
                name="paidAt"
                type="date"
                required
                defaultValue={todayIso()}
                className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1.5 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="paidAmount"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Bezahlter Betrag (€)
              </label>
              <input
                id="paidAmount"
                name="paidAmount"
                type="number"
                step="0.01"
                required
                defaultValue={ar.payoutGross}
                className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1.5 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none w-32"
              />
            </div>
            <button
              type="submit"
              className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-1.5 hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Zahlung erfassen
            </button>
          </form>
        </section>
      ) : null}

      {/* Verzug-Banner + Mahnungen-Sektion */}
      {isOverdue || mahnungen.length > 0 ? (
        <section className="border-t border-[color:var(--color-border)] pt-8 pb-6">
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-critical)]">
              Verzug & Mahnungen
            </p>
            {isOverdue ? (
              <span className="font-mono text-[10px] text-[color:var(--color-critical)] font-semibold">
                {tageVerzug} Tag{tageVerzug === 1 ? "" : "e"} überfällig
              </span>
            ) : null}
          </div>

          {mahnungen.length === 0 ? null : (
            <ul className="space-y-3 mb-4">
              {mahnungen.map((m) => (
                <li
                  key={m.id}
                  className="border border-[color:var(--color-border)] rounded-md p-4"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap mb-2">
                    <div>
                      <p className="font-medium">
                        {MAHNUNG_LEVEL_LABEL[m.level]}
                        {m.sentAt ? (
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]">
                            ✓ Versendet
                          </span>
                        ) : (
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]">
                            Entwurf
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                        ausgestellt {formatDateShort(m.issuedAt)} ·
                        Frist bis {formatDateShort(m.dueDate)} ·
                        {" "}{m.zinsTage} T × {m.zinsSatzPercent.toLocaleString("de-DE")} %
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-medium">
                        {fmtMoney(mahnungTotal(ar, m))}
                      </p>
                      <p className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
                        Zinsen {fmtMoney(m.verzugszinsen)} + Geb. {fmtMoney(m.mahngebuehr)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <Link
                      href={`/projekte/${id}/ausgangsrechnungen/${ar.id}/mahnung/${m.id}`}
                      target="_blank"
                      className="text-xs px-3 py-1 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
                    >
                      🖨 Mahn-Brief drucken
                    </Link>
                    {!m.sentAt ? (
                      <>
                        <form action={markMahnungSent} className="inline">
                          <input type="hidden" name="id" value={m.id} />
                          <input
                            type="hidden"
                            name="sentAt"
                            value={todayIsoStr}
                          />
                          <button
                            type="submit"
                            className="text-xs px-3 py-1 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
                          >
                            ✓ Als versendet markieren
                          </button>
                        </form>
                        <form action={deleteMahnung} className="inline ml-auto">
                          <input type="hidden" name="id" value={m.id} />
                          <button
                            type="submit"
                            className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                          >
                            Löschen
                          </button>
                        </form>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Neue Mahnung */}
          {nextMahnungLevel && ar.status !== "bezahlt" && ar.status !== "entwurf" ? (
            <form
              action={createMahnungVoid}
              className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-4 flex items-end gap-3 flex-wrap"
            >
              <input
                type="hidden"
                name="ausgangsrechnungId"
                value={ar.id}
              />
              <input
                type="hidden"
                name="level"
                value={nextMahnungLevel}
              />
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                  Mahn-Datum
                </label>
                <input
                  type="date"
                  name="issuedAt"
                  required
                  defaultValue={todayIsoStr}
                  className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1.5 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                  Mahngebühr (EUR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="mahngebuehr"
                  defaultValue={STANDARD_MAHNGEBUEHR[nextMahnungLevel]}
                  className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1.5 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none w-24"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                  Zinssatz % p.a. (Override)
                </label>
                <input
                  type="number"
                  step="0.01"
                  name="zinsSatzPercent"
                  placeholder="Auto aus Vertragstyp"
                  className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1.5 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none w-32"
                />
              </div>
              <button
                type="submit"
                className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-1.5 hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                + {MAHNUNG_LEVEL_LABEL[nextMahnungLevel]} erstellen
              </button>
            </form>
          ) : null}
        </section>
      ) : null}

      {/* XRechnung-Sektion */}
      <section className="border-t border-[color:var(--color-border)] pt-8 pb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            XRechnung 3.0 · UBL 2.1
          </p>
          {ar.xrechnungGeneratedAt ? (
            <span className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
              zuletzt generiert{" "}
              {ar.xrechnungGeneratedAt.toLocaleString("de-DE")}
            </span>
          ) : null}
        </div>
        <div className="border border-[color:var(--color-border)] rounded-md p-4 bg-[color:var(--color-bg-subtle)]">
          {ar.buyerReference ? (
            <p className="text-xs text-[color:var(--color-fg-muted)] mb-3">
              <strong className="text-[color:var(--color-fg)]">Käufer-Referenz:</strong>{" "}
              <span className="font-mono">{ar.buyerReference}</span>
              {ar.purchaseOrderRef ? (
                <>
                  {" · "}
                  <strong className="text-[color:var(--color-fg)]">PO:</strong>{" "}
                  <span className="font-mono">{ar.purchaseOrderRef}</span>
                </>
              ) : null}
            </p>
          ) : (
            <p className="text-xs text-[color:var(--color-warning)] mb-3">
              ⚠ Käufer-Referenz (Leitweg-ID) nicht gesetzt — bei öffentlichen
              AG erforderlich. In den AR-Stammdaten ergänzen.
            </p>
          )}
          <div className="flex items-center gap-3 flex-wrap">
            <form action={generateXRechnung}>
              <input type="hidden" name="id" value={ar.id} />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                {ar.xrechnungXmlPath ? "↻ Neu generieren" : "+ XRechnung erzeugen"}
              </button>
            </form>
            {ar.xrechnungXmlPath ? (
              <a
                href={`/api/ausgangsrechnungen/${ar.id}/xrechnung`}
                className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
                download
              >
                ⬇ xrechnung_{ar.number}.xml
              </a>
            ) : null}
            <span className="text-[11px] text-[color:var(--color-fg-muted)] ml-auto">
              Validierung extern via{" "}
              <a
                href="https://xeinkauf.de/xrechnung/pruef-tool/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-[color:var(--color-accent)]"
              >
                KoSIT-Validator
              </a>
            </span>
          </div>
        </div>
      </section>

      {/* ZUGFeRD-Sektion */}
      <section className="border-t border-[color:var(--color-border)] pt-8 pb-6">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
            ZUGFeRD 2.3 · {ar.zugferdProfile} · PDF/A-3 + eingebettete XML
          </p>
          {ar.zugferdGeneratedAt ? (
            <span className="font-mono text-[10px] text-[color:var(--color-fg-muted)]">
              zuletzt generiert{" "}
              {ar.zugferdGeneratedAt.toLocaleString("de-DE")}
            </span>
          ) : null}
        </div>
        <div className="border border-[color:var(--color-border)] rounded-md p-4 bg-[color:var(--color-bg-subtle)]">
          <p className="text-xs text-[color:var(--color-fg-muted)] mb-3">
            Hybrides PDF — menschen­lesbar (Layout) + maschinen­lesbar
            (eingebettete XRechnung-XML). Empfänger-Systeme können beides
            auswerten. Pflicht-B2B seit 01.01.2025 erfüllt.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <form action={generateZugferd}>
              <input type="hidden" name="id" value={ar.id} />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                {ar.zugferdPdfPath ? "↻ Neu generieren" : "+ ZUGFeRD-PDF erzeugen"}
              </button>
            </form>
            {ar.zugferdPdfPath ? (
              <a
                href={`/api/ausgangsrechnungen/${ar.id}/zugferd`}
                className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
                download
              >
                ⬇ zugferd_{ar.number}.pdf
              </a>
            ) : null}
            <span className="text-[11px] text-[color:var(--color-fg-muted)] ml-auto">
              Profile: {ar.zugferdProfile}
            </span>
          </div>
        </div>
      </section>

      {/* Stammdaten */}
      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Stammdaten (Snapshot)
        </p>
        <div className="grid gap-4 md:grid-cols-2 text-sm">
          <Field label="Auftraggeber" value={ar.partyAg ?? "—"} />
          <Field label="AG-Anschrift" value={ar.partyAgAddress ?? "—"} />
          <Field label="Auftragnehmer" value={ar.partyAn ?? "—"} />
          <Field label="AN-Anschrift" value={ar.partyAnAddress ?? "—"} />
          <Field
            label="Steuernummer (§ 14 IV UStG)"
            value={ar.partyAnTaxId ?? "—"}
          />
          <Field label="USt-IdNr." value={ar.partyAnVatId ?? "—"} />
          <Field
            label="Leistungszeitraum"
            value={
              ar.serviceStart || ar.serviceEnd
                ? `${formatDateShort(ar.serviceStart)} — ${formatDateShort(ar.serviceEnd)}`
                : "—"
            }
          />
          <Field
            label="Skonto"
            value={
              ar.skontoPercent && ar.skontoDays
                ? `${ar.skontoPercent} % bei Zahlung in ${ar.skontoDays} Tagen`
                : "—"
            }
          />
          <Field
            label="Sicherheitseinbehalt"
            value={
              ar.securityRetentionPercent !== null
                ? `${ar.securityRetentionPercent} % = ${fmtMoney(ar.securityRetentionAmount)}`
                : "—"
            }
          />
          <Field
            label="Vorherige Abschläge (netto)"
            value={fmtMoney(ar.previousAbschlaegeNet)}
          />
        </div>
      </section>

      {/* HOAI-Aufschlüsselung — nur bei Schlussrechnung mit Snapshot */}
      <HoaiBreakdownSection breakdownJson={ar.hoaiBreakdownJson} />

      {/* Positionen */}
      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Positionen ({positionen.length})
        </p>

        {positionen.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] italic mb-3 border border-dashed border-[color:var(--color-border)] rounded-md p-6 text-center">
            Noch keine Positionen. Beim Anlegen mit Aufmaß-Bezug werden sie
            automatisch übernommen — sonst manuell auf der Bearbeiten-Seite
            erfassen.
          </p>
        ) : (
          <div className="border border-[color:var(--color-border)] rounded-md overflow-hidden">
            <div className="grid grid-cols-12 gap-2 bg-[color:var(--color-bg-subtle)] border-b border-[color:var(--color-border)] py-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              <div className="col-span-2">OZ</div>
              <div className="col-span-4">Beschreibung</div>
              <div className="col-span-1 text-right">Menge</div>
              <div className="col-span-1">EH</div>
              <div className="col-span-2 text-right">EP</div>
              <div className="col-span-2 text-right">GP</div>
            </div>
            <div className="divide-y divide-[color:var(--color-border)]">
              {positionen.map((p) => (
                <div
                  key={p.id}
                  className="grid grid-cols-12 gap-2 py-3 px-3 text-sm items-start"
                >
                  <div className="col-span-2 font-mono text-xs">
                    {p.oz ?? "—"}
                  </div>
                  <div className="col-span-4">
                    <p>{p.description}</p>
                    {editable ? (
                      <form action={deleteArPosition} className="mt-1">
                        <input type="hidden" name="id" value={p.id} />
                        <button
                          type="submit"
                          className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                        >
                          Löschen
                        </button>
                      </form>
                    ) : null}
                  </div>
                  <div className="col-span-1 text-right font-mono text-xs">
                    {p.quantity !== null
                      ? p.quantity.toLocaleString("de-DE")
                      : ""}
                  </div>
                  <div className="col-span-1 font-mono text-xs">
                    {p.unit ?? ""}
                  </div>
                  <div className="col-span-2 text-right font-mono text-xs">
                    {p.unitPrice !== null ? fmtMoney(p.unitPrice) : ""}
                  </div>
                  <div className="col-span-2 text-right font-mono text-xs font-medium">
                    {p.totalPrice !== null ? fmtMoney(p.totalPrice) : ""}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {ar.status === "entwurf" ? (
        <section className="border-t border-[color:var(--color-border)] pt-6 pb-16">
          <form action={deleteAusgangsrechnung}>
            <input type="hidden" name="id" value={ar.id} />
            <button
              type="submit"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
            >
              Rechnung löschen
            </button>
          </form>
          <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)]">
            Versendete Rechnungen bleiben erhalten (Steuerrecht).
          </p>
        </section>
      ) : null}
    </Container>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}
