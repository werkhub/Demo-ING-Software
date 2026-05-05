import { Link } from "@/i18n/navigation";
import {
  getMeldungByAccessToken,
  getMessagesByAccessToken,
} from "@/db/queries";
import {
  CATEGORY_LABEL,
  STATUS_LABEL,
  toReporterView,
} from "@/lib/hinschg";
import { reporterReply } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Status meiner Meldung",
};

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const meldung = token ? await getMeldungByAccessToken(token) : null;
  const view = meldung ? toReporterView(meldung) : null;
  const messages = token ? await getMessagesByAccessToken(token) : [];

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header className="border-b border-[color:var(--color-border)] py-6">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between">
          <p className="text-base font-semibold">Status Ihrer Meldung</p>
          <Link
            href="/hinweis"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            zur Startseite
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        {/* Token-Eingabe */}
        <form
          method="get"
          className="mb-10 flex items-end gap-3 flex-wrap border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] rounded-md p-4"
        >
          <div className="flex-1 min-w-[260px]">
            <label
              htmlFor="token"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Zugangs-Token
            </label>
            <input
              id="token"
              name="token"
              type="text"
              defaultValue={token ?? ""}
              required
              minLength={10}
              placeholder="z. B. 4d3a8f6c-…"
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Status abrufen
          </button>
        </form>

        {token && !meldung ? (
          <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] rounded-md p-4 text-sm">
            Token nicht gefunden. Bitte prüfen Sie die Eingabe.
          </div>
        ) : null}

        {view && meldung ? (
          <>
            <section className="grid gap-3 mb-8 text-sm">
              <Row
                label="Eingegangen"
                value={view.submittedAt.toLocaleString("de-DE")}
              />
              <Row label="Themenbereich" value={CATEGORY_LABEL[view.category]} />
              <Row label="Betreff" value={view.subject} />
              <Row label="Status" value={STATUS_LABEL[view.status]} />
              <Row
                label="Eingangsbestätigung"
                value={
                  view.acknowledged && view.acknowledgedAt
                    ? view.acknowledgedAt.toLocaleString("de-DE")
                    : "noch ausstehend"
                }
              />
              <Row
                label="Rückmeldung erwartet bis"
                value={view.responseDeadline}
              />
            </section>

            {view.responseSummary ? (
              <section className="mb-8 border-l-2 border-[color:var(--color-success)] pl-4 py-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-success)] mb-1">
                  Zusammenfassung der Maßnahmen
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {view.responseSummary}
                </p>
              </section>
            ) : null}

            {/* Nachrichten-Faden */}
            <section className="mb-8">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                Kommunikation mit der Meldestelle ({messages.length})
              </p>
              {messages.length === 0 ? (
                <p className="text-sm text-[color:var(--color-fg-muted)] italic">
                  Noch keine Nachrichten.
                </p>
              ) : (
                <ul className="space-y-3">
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
                        {msg.direction === "from_office"
                          ? "Meldestelle"
                          : "Sie"}
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
            </section>

            {/* Folge-Nachricht */}
            {view.status !== "abgeschlossen" &&
            view.status !== "unbegruendet" &&
            view.status !== "archiviert" ? (
              <section className="border-t border-[color:var(--color-border)] pt-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                  Folge-Nachricht senden
                </p>
                <form action={reporterReply} className="space-y-3">
                  <input type="hidden" name="accessToken" value={token!} />
                  <textarea
                    name="bodyText"
                    rows={4}
                    required
                    minLength={5}
                    maxLength={20_000}
                    placeholder="Ergänzungen, Rückfragen oder weitere Beweise"
                    className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
                    >
                      Senden
                    </button>
                  </div>
                </form>
              </section>
            ) : null}
          </>
        ) : null}
      </main>
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[color:var(--color-border)] py-2">
      <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </dt>
      <dd className="text-[color:var(--color-fg)]">{value}</dd>
    </div>
  );
}
