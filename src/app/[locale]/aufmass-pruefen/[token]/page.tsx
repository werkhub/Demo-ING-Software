import { Link } from "@/i18n/navigation";
import {
  getByToken,
  getZeilenByTokenAufmass,
} from "@/db/queries";
import {
  isTokenValid,
  tokenInvalidReason,
} from "@/lib/aufmass-pruefer";
import { AUFMASS_STATUS_LABEL, computeAufmassTotals } from "@/lib/aufmass";
import { fmtMoney, formatDateShort } from "@/lib/utils";
import { prueferLogView, prueferUpdateZeileStatus } from "./actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Aufmaß-Prüfung",
  robots: { index: false, follow: false },
};

const REASON_TEXT: Record<string, { title: string; body: string }> = {
  not_found: {
    title: "Link nicht gefunden",
    body: "Der angegebene Prüfer-Link existiert nicht. Bitte fragen Sie den Auftragnehmer nach einem aktuellen Link.",
  },
  revoked: {
    title: "Link wurde widerrufen",
    body: "Dieser Prüfer-Link wurde vom Auftragnehmer zurückgezogen. Bitte fordern Sie einen neuen Link an.",
  },
  expired: {
    title: "Link ist abgelaufen",
    body: "Die Gültigkeit dieses Prüfer-Links ist abgelaufen. Bitte fordern Sie einen neuen Link beim Auftragnehmer an.",
  },
};

export default async function PrueferPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const ctx = await getByToken(token);
  const reason = tokenInvalidReason(ctx?.token ?? null);

  if (!ctx || reason !== null) {
    const info = REASON_TEXT[reason ?? "not_found"];
    return <ErrorShell title={info.title} body={info.body} />;
  }

  // Auto-Logging beim Aufruf — best effort.
  await prueferLogView(token);

  const zeilen = await getZeilenByTokenAufmass(ctx.aufmass.id);
  const totals = computeAufmassTotals(zeilen);
  const canEdit = ctx.aufmass.status === "geprueft" && isTokenValid(ctx.token);

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header className="border-b border-[color:var(--color-border)] py-6">
        <div className="max-w-5xl mx-auto px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Externe Aufmaß-Prüfung · {ctx.token.label}
          </p>
          <p className="text-base font-semibold mt-1">
            {ctx.project.identifier} · {ctx.project.name}
          </p>
          <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
            Auftraggeber: {ctx.project.ag}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* Stammdaten */}
        <section className="grid gap-3 mb-8 text-sm">
          <Row label="Aufmaß" value={ctx.aufmass.name} />
          <Row
            label="Periode"
            value={
              ctx.aufmass.periodStart || ctx.aufmass.periodEnd
                ? `${formatDateShort(ctx.aufmass.periodStart)} — ${formatDateShort(ctx.aufmass.periodEnd)}`
                : "nicht gesetzt"
            }
          />
          <Row
            label="Status"
            value={AUFMASS_STATUS_LABEL[ctx.aufmass.status]}
          />
          <Row
            label="Eingereicht am"
            value={
              ctx.aufmass.submittedAt
                ? ctx.aufmass.submittedAt.toLocaleString("de-DE")
                : "—"
            }
          />
          <Row label="Zeilen" value={String(totals.zeilenCount)} />
          <Row label="Erfasst netto" value={fmtMoney(totals.totalNet)} />
          <Row
            label="Anerkannt netto"
            value={fmtMoney(totals.totalApprovedNet)}
          />
          <Row
            label="Link gültig bis"
            value={ctx.token.expiresAt.toLocaleString("de-DE")}
          />
        </section>

        {!canEdit ? (
          <div className="border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] rounded-md p-4 text-sm mb-6">
            {ctx.aufmass.status !== "geprueft"
              ? `Das Aufmaß befindet sich aktuell im Status „${AUFMASS_STATUS_LABEL[ctx.aufmass.status]}". Eine Prüfung ist nur im Status „Geprüft" möglich. Sie sehen die Daten zur Information.`
              : "Dieser Link erlaubt aktuell keine Änderungen."}
          </div>
        ) : null}

        {/* Zeilen */}
        <section className="mb-10">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
            Zeilen ({zeilen.length})
          </p>

          {zeilen.length === 0 ? (
            <p className="text-sm text-[color:var(--color-fg-muted)] italic border border-dashed border-[color:var(--color-border)] rounded-md p-6 text-center">
              Keine Zeilen vorhanden.
            </p>
          ) : (
            <div className="space-y-3">
              {zeilen.map((z) => (
                <article
                  key={z.id}
                  className="border border-[color:var(--color-border)] rounded-md p-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-4">
                      <p className="font-mono text-xs text-[color:var(--color-fg-muted)]">
                        {z.ozOverride ?? "—"}
                      </p>
                      <p className="text-sm mt-1">{z.description}</p>
                      {z.formula ? (
                        <p className="font-mono text-xs text-[color:var(--color-fg-muted)] mt-2 whitespace-pre-wrap">
                          {z.formula}
                        </p>
                      ) : null}
                    </div>
                    <div className="md:col-span-2 text-right">
                      <p className="font-mono text-xs text-[color:var(--color-fg-muted)]">
                        Menge
                      </p>
                      <p className="font-mono text-sm">
                        {z.computedQuantity !== null
                          ? z.computedQuantity.toLocaleString("de-DE")
                          : "—"}{" "}
                        {z.unit ?? ""}
                      </p>
                    </div>
                    <div className="md:col-span-2 text-right">
                      <p className="font-mono text-xs text-[color:var(--color-fg-muted)]">
                        EP / GP
                      </p>
                      <p className="font-mono text-sm">
                        {z.unitPrice !== null ? fmtMoney(z.unitPrice) : "—"}
                      </p>
                      <p className="font-mono text-sm font-medium">
                        {z.totalPrice !== null ? fmtMoney(z.totalPrice) : "—"}
                      </p>
                    </div>
                    <div className="md:col-span-4">
                      <p className="font-mono text-xs text-[color:var(--color-fg-muted)] mb-1">
                        Aktueller Status
                      </p>
                      <ZeileStatusPill status={z.status} />
                      {z.status === "gekuerzt" &&
                      z.approvedQuantity !== null ? (
                        <p className="text-xs text-[color:var(--color-warning)] mt-1">
                          Anerkannt: {z.approvedQuantity.toLocaleString("de-DE")}{" "}
                          {z.unit ?? ""}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {canEdit ? (
                    <div className="mt-4 pt-3 border-t border-[color:var(--color-border)] flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                      {/* Zugestimmt */}
                      <form
                        action={prueferUpdateZeileStatus}
                        className="inline"
                      >
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="zeileId" value={z.id} />
                        <input type="hidden" name="status" value="zugestimmt" />
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-success)] hover:text-[color:var(--color-success)] transition-colors"
                        >
                          ✓ Zustimmen
                        </button>
                      </form>

                      {/* Gekürzt */}
                      <form
                        action={prueferUpdateZeileStatus}
                        className="inline-flex items-center gap-2"
                      >
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="zeileId" value={z.id} />
                        <input type="hidden" name="status" value="gekuerzt" />
                        <label className="text-xs text-[color:var(--color-fg-muted)]">
                          Gekürzt auf
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="approvedQuantity"
                          required
                          placeholder="Menge"
                          className="w-24 text-xs bg-[color:var(--color-bg-subtle)] border border-[color:var(--color-border)] rounded-md px-2 py-1 font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
                        />
                        <span className="text-xs text-[color:var(--color-fg-muted)]">
                          {z.unit ?? ""}
                        </span>
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-warning)] hover:text-[color:var(--color-warning)] transition-colors"
                        >
                          Übernehmen
                        </button>
                      </form>

                      {/* Bestritten */}
                      <form
                        action={prueferUpdateZeileStatus}
                        className="inline ml-auto"
                      >
                        <input type="hidden" name="token" value={token} />
                        <input type="hidden" name="zeileId" value={z.id} />
                        <input type="hidden" name="status" value="bestritten" />
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-critical)] hover:text-[color:var(--color-critical)] transition-colors"
                        >
                          ✕ Bestreiten
                        </button>
                      </form>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="border-t border-[color:var(--color-border)] pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-2">
            Datenschutz
          </p>
          <p className="text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
            Wir speichern keine IP-Adressen. Protokolliert werden nur
            Zeitstempel der Aktionen, die Token-ID sowie die betroffene
            Aufmaß-Zeile — zur Beweissicherung gegenüber dem Auftraggeber.
          </p>
        </section>
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
      <dd className="text-[color:var(--color-fg)] text-right">{value}</dd>
    </div>
  );
}

function ZeileStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    offen: {
      label: "Offen",
      cls: "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]",
    },
    zugestimmt: {
      label: "Zugestimmt",
      cls: "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]",
    },
    gekuerzt: {
      label: "Gekürzt",
      cls: "bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]",
    },
    bestritten: {
      label: "Bestritten",
      cls: "bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]",
    },
  };
  const m = map[status] ?? map.offen;
  return (
    <span
      className={
        "inline-block font-mono text-[10px] uppercase tracking-wider rounded-full border px-2 py-0.5 " +
        m.cls
      }
    >
      {m.label}
    </span>
  );
}

function ErrorShell({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header className="border-b border-[color:var(--color-border)] py-6">
        <div className="max-w-3xl mx-auto px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Externe Aufmaß-Prüfung
          </p>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-16">
        <div className="border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] rounded-md p-6">
          <h1 className="text-xl font-semibold text-[color:var(--color-critical)]">
            {title}
          </h1>
          <p className="mt-2 text-sm text-[color:var(--color-fg)] leading-relaxed">
            {body}
          </p>
        </div>
        <p className="mt-6 text-xs text-[color:var(--color-fg-muted)]">
          <Link
            href="/"
            className="hover:text-[color:var(--color-fg)] transition-colors"
          >
            zur LexBau-Startseite
          </Link>
        </p>
      </main>
    </div>
  );
}
