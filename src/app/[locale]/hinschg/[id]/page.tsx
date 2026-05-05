import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { HinschgStatusBadge } from "@/components/hinschg-status-badge";
import {
  getMeldung,
  getMessagesByMeldung,
} from "@/db/queries";
import {
  ACK_DEADLINE_DAYS,
  CATEGORY_LABEL,
  STATUS_LABEL,
  ackDaysOverdue,
  responseDaysOverdue,
  uiState,
} from "@/lib/hinschg";
import { formatDateShort } from "@/lib/utils";
import {
  ackMeldung,
  officeReply,
  updateMeldungInternal,
  updateMeldungStatus,
} from "../actions";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS = [
  { value: "eingegangen", label: "Eingegangen" },
  { value: "in_pruefung", label: "In Prüfung" },
  { value: "massnahme_ergriffen", label: "Maßnahme ergriffen" },
  { value: "abgeschlossen", label: "Abgeschlossen" },
  { value: "unbegruendet", label: "Unbegründet" },
  { value: "archiviert", label: "Archiviert" },
];

export default async function MeldungDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMeldung(id);
  if (!m) notFound();

  const messages = await getMessagesByMeldung(id);
  const state = uiState(m);
  const ackOverdue = ackDaysOverdue(m);
  const respOverdue = responseDaysOverdue(m);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {CATEGORY_LABEL[m.category]} · eingegangen{" "}
          {m.submittedAt.toLocaleString("de-DE")}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter min-w-0 flex-1">
            {m.subject}
          </h1>
          <div className="flex flex-col items-end gap-2">
            <HinschgStatusBadge state={state} size="md" />
            <Link
              href="/hinschg"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
            >
              ← zur Liste
            </Link>
          </div>
        </div>
      </section>

      {state === "ack_ueberfaellig" ? (
        <section className="pb-6">
          <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-md p-4 flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-critical)]">
                Eingangsbestätigung überfällig
              </p>
              <p className="mt-1 text-sm text-[color:var(--color-fg)]">
                Pflicht nach § 17 II HinSchG: Bestätigung binnen{" "}
                {ACK_DEADLINE_DAYS} Tagen — überschritten um {ackOverdue} Tag{ackOverdue !== 1 ? "e" : ""}.
              </p>
            </div>
            <form action={ackMeldung}>
              <input type="hidden" name="id" value={m.id} />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors whitespace-nowrap"
              >
                Eingang JETZT bestätigen
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {state === "antwort_ueberfaellig" ? (
        <section className="pb-6">
          <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-md p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-critical)]">
              3-Monats-Frist überschritten
            </p>
            <p className="mt-1 text-sm text-[color:var(--color-fg)]">
              Rückmeldung an Hinweisgebende seit {respOverdue} Tag{respOverdue !== 1 ? "en" : ""} überfällig
              (§ 17 II HinSchG).
            </p>
          </div>
        </section>
      ) : null}

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
              Meldungstext
            </p>
            <p className="text-sm text-[color:var(--color-fg)] whitespace-pre-wrap leading-relaxed">
              {m.bodyText}
            </p>
          </div>
          <div className="space-y-3 text-sm">
            <Fact label="Kategorie" value={CATEGORY_LABEL[m.category]} />
            <Fact label="Status" value={STATUS_LABEL[m.status]} />
            <Fact
              label="Hinweisgeber"
              value={
                m.isAnonymous
                  ? `anonym${m.reporterDisplayName ? ` (${m.reporterDisplayName})` : ""}`
                  : m.reporterDisplayName ?? "—"
              }
            />
            {m.reporterContact ? (
              <Fact label="Kontakt" value={m.reporterContact} />
            ) : null}
            <Fact
              label="Eingangsbestätigung"
              value={
                m.acknowledgedAt
                  ? m.acknowledgedAt.toLocaleString("de-DE")
                  : "ausstehend"
              }
            />
            <Fact
              label="Rückmeldungs-Frist"
              value={formatDateShort(m.responseDeadline)}
            />
          </div>
        </div>
      </section>

      {/* Status-Aktionen */}
      <section className="border-t border-[color:var(--color-border)] pt-6 pb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {!m.acknowledgedAt ? (
            <form action={ackMeldung}>
              <input type="hidden" name="id" value={m.id} />
              <button
                type="submit"
                className="text-xs px-3 py-1.5 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                Eingang bestätigen
              </button>
            </form>
          ) : null}
          <form
            action={updateMeldungStatus}
            className="flex items-center gap-2"
          >
            <input type="hidden" name="id" value={m.id} />
            <select
              name="status"
              defaultValue={m.status}
              className="text-xs bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1 focus:border-[color:var(--color-accent)] focus:outline-none"
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] px-2 py-1 transition-colors"
            >
              Status setzen ↻
            </button>
          </form>
          <Link
            href={`/hinschg/${id}/print`}
            target="_blank"
            className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            🖨 Akte drucken ↗
          </Link>
        </div>
      </section>

      {/* Kommunikation */}
      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Kommunikation mit Hinweisgeber ({messages.length})
        </p>
        {messages.length === 0 ? (
          <p className="text-sm text-[color:var(--color-fg-muted)] italic mb-6">
            Noch keine Nachrichten.
          </p>
        ) : (
          <ul className="space-y-3 mb-6">
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={
                  "rounded-md border p-3 " +
                  (msg.direction === "from_office"
                    ? "border-[color:var(--color-accent-border,var(--color-border))] bg-[color:var(--color-accent-soft)]/30"
                    : "border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)]")
                }
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                  {msg.direction === "from_office" ? "Meldestelle" : "Hinweisgeber"}
                  {" · "}
                  {msg.createdAt.toLocaleString("de-DE")}
                </p>
                <p className="mt-1 text-sm whitespace-pre-wrap">
                  {msg.bodyText}
                </p>
              </li>
            ))}
          </ul>
        )}

        {/* Antwort-Formular */}
        <form
          action={officeReply}
          className="space-y-3 border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-4"
        >
          <input type="hidden" name="id" value={m.id} />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            Antwort an Hinweisgeber
          </p>
          <textarea
            name="bodyText"
            rows={4}
            required
            minLength={5}
            maxLength={20_000}
            placeholder="Wird im Status-Abruf des Hinweisgebers sichtbar."
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
          />
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label
                htmlFor="setStatus"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Status mit setzen (optional)
              </label>
              <select
                id="setStatus"
                name="setStatus"
                defaultValue=""
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
              >
                <option value="">— unverändert —</option>
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="responseSummary"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Zusammenfassung Maßnahmen (optional)
              </label>
              <input
                id="responseSummary"
                name="responseSummary"
                type="text"
                maxLength={5000}
                placeholder="Wird prominent im Status-Abruf gezeigt."
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Antwort senden
            </button>
          </div>
        </form>
      </section>

      {/* Interne Notizen */}
      <section className="border-t border-[color:var(--color-border)] pt-6 pb-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-3">
          Interne Notizen (nur Office sichtbar)
        </p>
        <form action={updateMeldungInternal} className="space-y-3">
          <input type="hidden" name="id" value={m.id} />
          <textarea
            name="internalNotes"
            rows={3}
            maxLength={20_000}
            defaultValue={m.internalNotes ?? ""}
            placeholder="Interne Bewertung, Recherche-Notizen, Plausibilität …"
            className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              className="text-xs rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] px-3 py-1.5 transition-colors"
            >
              Notiz speichern
            </button>
          </div>
        </form>
      </section>
    </Container>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </div>
      <div className="mt-0.5 text-sm text-[color:var(--color-fg)]">{value}</div>
    </div>
  );
}
