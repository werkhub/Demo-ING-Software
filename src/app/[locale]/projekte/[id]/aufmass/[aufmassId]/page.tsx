import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import {
  AufmassStatusBadge,
  AufmassZeileStatusBadge,
} from "@/components/aufmass-status-badge";
import {
  getAccessLogByToken,
  getAufmass,
  getAufmassZeilen,
  getLvItems,
  getProjectById,
  getTokensByAufmass,
} from "@/db/queries";
import {
  AUFMASS_STATUS_LABEL,
  computeAufmassTotals,
  isEditable,
  nextAllowedStatuses,
} from "@/lib/aufmass";
import {
  ACTION_LABEL,
  isTokenValid,
} from "@/lib/aufmass-pruefer";
import { isPositionKind } from "@/lib/lv";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import {
  deleteAufmass,
  deleteAufmassZeile,
  updateAufmassStatus,
  updateAufmassZeileStatus,
} from "../aufmass-actions";
import { ZeileForm } from "../zeile-form";
import {
  createPrueferTokenVoid,
  revokePrueferToken,
} from "./pruefer-actions";
import { PrueferLinkCopy } from "./pruefer-link-copy";

export const dynamic = "force-dynamic";

const ZEILE_STATUS_OPTIONS = [
  { value: "offen", label: "Offen" },
  { value: "zugestimmt", label: "Zugestimmt" },
  { value: "gekuerzt", label: "Gekürzt" },
  { value: "bestritten", label: "Bestritten" },
];

export default async function AufmassDetailPage({
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
  const editable = isEditable(a.status);
  const allowedNext = nextAllowedStatuses(a.status);
  const showPrueferSection =
    a.status === "eingereicht" || a.status === "geprueft";
  const prueferTokens = showPrueferSection
    ? await getTokensByAufmass(aufmassId)
    : [];
  const accessLogsByToken = new Map<
    string,
    Awaited<ReturnType<typeof getAccessLogByToken>>
  >();
  for (const t of prueferTokens) {
    const log = await getAccessLogByToken(t.id);
    accessLogsByToken.set(t.id, log.slice(0, 20));
  }

  // Nur Position-Kinds für die Auswahl im Form (Titel/Untertitel ausschließen)
  const lvItemsForForm = lvItems
    .filter((it) => isPositionKind(it.kind))
    .map((it) => ({
      id: it.id,
      oz: it.oz,
      shortText: it.shortText,
      unit: it.unit,
      unitPrice: it.unitPrice,
    }));

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
              {a.name}
            </h1>
            <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
              {a.periodStart || a.periodEnd
                ? `Periode ${formatDateShort(a.periodStart)} — ${formatDateShort(a.periodEnd)}`
                : "Periode nicht gesetzt"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <AufmassStatusBadge status={a.status} size="md" />
            <Link
              href={`/projekte/${id}/aufmass`}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
            >
              ← zur Liste
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-6">
        <StatGrid4>
          <StatCard label="Zeilen" value={totals.zeilenCount} />
          <StatCard
            label="Erfasst netto"
            value={fmtMoney(totals.totalNet)}
          />
          <StatCard
            label="Anerkannt netto"
            value={fmtMoney(totals.totalApprovedNet)}
            tone={
              totals.totalApprovedNet < totals.totalNet ? "warning" : "default"
            }
          />
          <StatCard
            label="Probleme"
            value={
              totals.zeilenWithErrors +
              totals.zeilenGekuerzt +
              totals.zeilenBestritten
            }
            caption={
              totals.zeilenWithErrors > 0
                ? `${totals.zeilenWithErrors} Formel-Fehler`
                : undefined
            }
            tone={
              totals.zeilenWithErrors > 0 || totals.zeilenBestritten > 0
                ? "critical"
                : totals.zeilenGekuerzt > 0
                  ? "warning"
                  : "default"
            }
          />
        </StatGrid4>
      </section>

      {/* Workflow-Aktionen */}
      <section className="pb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            Workflow:
          </span>
          {allowedNext.length === 0 ? (
            <span className="text-xs text-[color:var(--color-fg-muted)] italic">
              Endstatus erreicht.
            </span>
          ) : (
            allowedNext.map((next) => (
              <form
                key={next}
                action={updateAufmassStatus}
                className="inline"
              >
                <input type="hidden" name="id" value={a.id} />
                <input type="hidden" name="status" value={next} />
                <button
                  type="submit"
                  className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
                >
                  → {AUFMASS_STATUS_LABEL[next]}
                </button>
              </form>
            ))
          )}
          <Link
            href={`/projekte/${id}/aufmass/${a.id}/print`}
            target="_blank"
            className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors ml-auto"
          >
            🖨 Druck-Aufmaß ↗
          </Link>
        </div>
      </section>

      {/* Zeilen-Liste */}
      <section className="pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Zeilen ({zeilen.length})
        </p>

        {zeilen.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] italic mb-6 border border-dashed border-[color:var(--color-border)] rounded-md p-6 text-center">
            Noch keine Zeilen erfasst.
          </p>
        ) : (
          <div className="border border-[color:var(--color-border)] rounded-md overflow-hidden mb-6">
            <div className="grid grid-cols-12 gap-2 bg-[color:var(--color-bg-subtle)] border-b border-[color:var(--color-border)] py-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              <div className="col-span-2">OZ / Beschreibung</div>
              <div className="col-span-3">Formel</div>
              <div className="col-span-1 text-right">Menge</div>
              <div className="col-span-1">EH</div>
              <div className="col-span-1 text-right">EP</div>
              <div className="col-span-2 text-right">GP</div>
              <div className="col-span-2">Status</div>
            </div>
            <div className="divide-y divide-[color:var(--color-border)]">
              {zeilen.map((z) => {
                const lvi = lvItems.find((it) => it.id === z.lvItemId);
                const oz = z.ozOverride ?? lvi?.oz ?? "—";
                return (
                  <div
                    key={z.id}
                    className="grid grid-cols-12 gap-2 py-3 px-3 text-sm items-start"
                  >
                    <div className="col-span-2">
                      <p className="font-mono text-xs">{oz}</p>
                      <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
                        {z.description}
                      </p>
                    </div>
                    <div className="col-span-3">
                      {z.formula ? (
                        <p className="font-mono text-xs whitespace-pre-wrap">
                          {z.formula}
                        </p>
                      ) : (
                        <p className="text-xs text-[color:var(--color-fg-muted)] italic">
                          —
                        </p>
                      )}
                      {z.formulaError ? (
                        <p className="mt-1 text-[10px] text-[color:var(--color-critical)]">
                          ⚠ {z.formulaError}
                        </p>
                      ) : null}
                    </div>
                    <div className="col-span-1 text-right font-mono text-xs">
                      {z.computedQuantity !== null
                        ? z.computedQuantity.toLocaleString("de-DE")
                        : ""}
                      {z.status === "gekuerzt" &&
                      z.approvedQuantity !== null ? (
                        <p className="text-[10px] text-[color:var(--color-warning)] mt-0.5">
                          → {z.approvedQuantity.toLocaleString("de-DE")}
                        </p>
                      ) : null}
                    </div>
                    <div className="col-span-1 font-mono text-xs">
                      {z.unit ?? ""}
                    </div>
                    <div className="col-span-1 text-right font-mono text-xs">
                      {z.unitPrice !== null ? fmtMoney(z.unitPrice) : ""}
                    </div>
                    <div className="col-span-2 text-right font-mono text-xs font-medium">
                      {z.totalPrice !== null ? fmtMoney(z.totalPrice) : ""}
                      {z.status === "gekuerzt" && z.approvedTotal !== null ? (
                        <p className="text-[10px] text-[color:var(--color-warning)] mt-0.5">
                          → {fmtMoney(z.approvedTotal)}
                        </p>
                      ) : null}
                    </div>
                    <div className="col-span-2 flex items-start justify-between gap-2">
                      <AufmassZeileStatusBadge status={z.status} />
                      {editable ? (
                        <form action={deleteAufmassZeile} className="inline">
                          <input type="hidden" name="id" value={z.id} />
                          <button
                            type="submit"
                            aria-label="Zeile löschen"
                            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors px-1"
                          >
                            ✕
                          </button>
                        </form>
                      ) : (
                        <ZeileStatusForm zeileId={z.id} currentStatus={z.status} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {editable ? (
          <ZeileForm aufmassId={a.id} lvItems={lvItemsForForm} />
        ) : (
          <p className="text-xs text-[color:var(--color-fg-muted)] italic">
            Aufmaß ist nicht im Entwurf — Zeilen-Edits sind gesperrt
            (Beweissicherung).
          </p>
        )}
      </section>

      {showPrueferSection ? (
        <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
            Externe Prüfer-Tokens
          </p>
          <p className="text-xs text-[color:var(--color-fg-muted)] leading-relaxed mb-4">
            Erzeugen Sie einen Link für externe Prüfer (AG-Bauleitung,
            Architekt). Status-Änderungen über den Link werden zur
            Beweissicherung protokolliert (Zeitstempel + Token-ID + Zeile,
            keine IP-Adressen).
            {a.status === "eingereicht" ? (
              <>
                {" "}
                Status-Aktionen über den Link sind erst möglich, sobald das
                Aufmaß auf „Geprüft" gesetzt wurde.
              </>
            ) : null}
          </p>

          {prueferTokens.length === 0 ? (
            <p className="text-sm text-[color:var(--color-fg-muted)] italic mb-6 border border-dashed border-[color:var(--color-border)] rounded-md p-4 text-center">
              Noch keine Prüfer-Tokens erzeugt.
            </p>
          ) : (
            <ul className="space-y-3 mb-6">
              {prueferTokens.map((t) => {
                const log = accessLogsByToken.get(t.id) ?? [];
                const valid = isTokenValid(t);
                const path = `/aufmass-pruefen/${t.token}`;
                return (
                  <li
                    key={t.id}
                    className="border border-[color:var(--color-border)] rounded-md p-3"
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{t.label}</p>
                        <p className="text-[11px] text-[color:var(--color-fg-muted)] mt-0.5">
                          gültig bis {t.expiresAt.toLocaleString("de-DE")}
                          {t.revokedAt ? (
                            <>
                              {" · "}
                              <span className="text-[color:var(--color-critical)]">
                                widerrufen am{" "}
                                {t.revokedAt.toLocaleString("de-DE")}
                              </span>
                            </>
                          ) : !valid ? (
                            <>
                              {" · "}
                              <span className="text-[color:var(--color-warning)]">
                                abgelaufen
                              </span>
                            </>
                          ) : null}
                        </p>
                        <p className="font-mono text-[10px] text-[color:var(--color-fg-muted)] mt-1 break-all">
                          {path}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <PrueferLinkCopy path={path} />
                        {valid ? (
                          <form
                            action={revokePrueferToken}
                            className="inline"
                          >
                            <input
                              type="hidden"
                              name="tokenId"
                              value={t.id}
                            />
                            <button
                              type="submit"
                              className="text-[10px] px-2 py-1 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-critical)] hover:text-[color:var(--color-critical)] transition-colors"
                            >
                              Widerrufen
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </div>
                    {log.length > 0 ? (
                      <details className="mt-3">
                        <summary className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] cursor-pointer hover:text-[color:var(--color-fg)] transition-colors">
                          Zugriffs-Protokoll ({log.length})
                        </summary>
                        <ul className="mt-2 space-y-1 text-[11px] font-mono">
                          {log.map((entry) => (
                            <li
                              key={entry.id}
                              className="flex items-baseline justify-between gap-2 text-[color:var(--color-fg-muted)]"
                            >
                              <span>
                                {entry.accessedAt.toLocaleString("de-DE")}
                              </span>
                              <span className="text-[color:var(--color-fg)]">
                                {ACTION_LABEL[entry.action]}
                                {entry.aufmassZeileId
                                  ? ` · Zeile ${entry.aufmassZeileId.slice(-6)}`
                                  : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          <form
            action={createPrueferTokenVoid}
            className="border border-[color:var(--color-border)] rounded-md p-4 grid gap-3 md:grid-cols-[1fr_auto_auto] items-end"
          >
            <input type="hidden" name="aufmassId" value={a.id} />
            <div>
              <label
                htmlFor="pruefer-label"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Bezeichnung
              </label>
              <input
                id="pruefer-label"
                name="label"
                type="text"
                required
                minLength={2}
                maxLength={200}
                placeholder="z. B. Bauleiter Müller"
                className="w-full bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1.5 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="pruefer-days"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Gültig (Tage)
              </label>
              <input
                id="pruefer-days"
                name="validDays"
                type="number"
                min={1}
                max={365}
                defaultValue={14}
                className="w-24 bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1.5 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="text-xs px-4 py-2 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              + Token erzeugen
            </button>
          </form>
        </section>
      ) : null}

      {a.status === "entwurf" ? (
        <section className="border-t border-[color:var(--color-border)] pt-6 pb-16">
          <form action={deleteAufmass}>
            <input type="hidden" name="id" value={a.id} />
            <button
              type="submit"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
            >
              Aufmaß löschen
            </button>
          </form>
          <p className="mt-2 text-[11px] text-[color:var(--color-fg-muted)]">
            Eingereichte Aufmaße bleiben dauerhaft erhalten (Beweissicherung).
          </p>
        </section>
      ) : null}
    </Container>
  );
}

function ZeileStatusForm({
  zeileId,
  currentStatus,
}: {
  zeileId: string;
  currentStatus: string;
}) {
  return (
    <form
      action={updateAufmassZeileStatus}
      className="flex items-center gap-1"
    >
      <input type="hidden" name="id" value={zeileId} />
      <select
        name="status"
        defaultValue={currentStatus}
        className="text-[10px] bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-1.5 py-0.5 focus:border-[color:var(--color-accent)] focus:outline-none"
      >
        {ZEILE_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <input
        type="number"
        step="0.01"
        name="approvedQuantity"
        placeholder="Anerk."
        className="w-20 text-[10px] bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-1.5 py-0.5 font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
      />
      <button
        type="submit"
        className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
      >
        ↻
      </button>
    </form>
  );
}
