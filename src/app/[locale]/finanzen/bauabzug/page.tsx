/**
 * Bauabzug-Quartalsmeldung (§ 48a EStG).
 *
 * Bauunternehmer als Leistungsempfänger müssen 15 % der Bruttosumme einbehalten
 * und bis zum 10. des Folgemonats beim Finanzamt anmelden, wenn der NU keine
 * gültige Freistellungsbescheinigung vorlegt. Diese Seite aggregiert pro
 * Quartal alle einbehaltenen Beträge und liefert eine CSV-Vorlage als
 * Vorbereitung für die ELSTER-Anmeldung.
 *
 * Hinweis: ELSTER selbst ist eine Behörden-Schnittstelle und nicht direkt
 * angebunden — die Anmeldung erfolgt im Mein-ELSTER-Portal.
 */
import { Link } from "@/i18n/navigation";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { fmtMoney, formatDateShort } from "@/lib/utils";

export const dynamic = "force-dynamic";

export const metadata = { title: "Bauabzug · § 48a EStG" };

type Quartal = {
  jahr: number;
  q: 1 | 2 | 3 | 4;
  label: string;
  meldetermin: string;
  rechnungen: Array<{
    id: string;
    supplierName: string | null;
    invoiceDate: string | null;
    totalGross: number | null;
    bauabzugEinbehaltCents: number;
    abgefuehrtAm: string | null;
  }>;
  summeCents: number;
  offenCents: number;
};

function quartalOf(iso: string): { jahr: number; q: 1 | 2 | 3 | 4 } {
  const [y, m] = iso.split("-").map(Number);
  return { jahr: y, q: (Math.ceil(m / 3) as 1 | 2 | 3 | 4) };
}

function meldeterminOf(jahr: number, q: 1 | 2 | 3 | 4): string {
  // Bauabzug ist monatlich anzumelden — hier vereinfacht der 10. des
  // ersten Folgemonats nach Quartalsende als Sammel-Hinweis.
  const monat = q * 3 + 1; // 4, 7, 10, 13
  if (monat === 13) return `${jahr + 1}-01-10`;
  return `${jahr}-${String(monat).padStart(2, "0")}-10`;
}

export default async function BauabzugPage() {
  const workspaceId = await getCurrentWorkspaceId();

  // Alle Eingangsrechnungen mit Bauabzug-Einbehalt > 0
  const rechnungen = await db
    .select({
      id: schema.rechnungen.id,
      supplierName: schema.rechnungen.supplierName,
      invoiceDate: schema.rechnungen.invoiceDate,
      totalGross: schema.rechnungen.totalGross,
      bauabzugEinbehaltCents: schema.rechnungen.bauabzugEinbehaltCents,
      bauabzugAnFinanzamtAbgefuehrtAm:
        schema.rechnungen.bauabzugAnFinanzamtAbgefuehrtAm,
    })
    .from(schema.rechnungen)
    .where(
      and(
        eq(schema.rechnungen.workspaceId, workspaceId),
        isNotNull(schema.rechnungen.bauabzugEinbehaltCents)
      )
    )
    .orderBy(asc(schema.rechnungen.invoiceDate));

  // Gruppieren nach Quartal (basierend auf invoiceDate; fallback heute)
  const map = new Map<string, Quartal>();
  for (const r of rechnungen) {
    const cents = r.bauabzugEinbehaltCents ?? 0;
    if (cents <= 0) continue;
    const dateIso = r.invoiceDate ?? new Date().toISOString().slice(0, 10);
    const { jahr, q } = quartalOf(dateIso);
    const key = `${jahr}-Q${q}`;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        jahr,
        q,
        label: `Q${q} ${jahr}`,
        meldetermin: meldeterminOf(jahr, q),
        rechnungen: [],
        summeCents: 0,
        offenCents: 0,
      };
      map.set(key, entry);
    }
    entry.rechnungen.push({
      id: r.id,
      supplierName: r.supplierName,
      invoiceDate: r.invoiceDate,
      totalGross: r.totalGross,
      bauabzugEinbehaltCents: cents,
      abgefuehrtAm: r.bauabzugAnFinanzamtAbgefuehrtAm,
    });
    entry.summeCents += cents;
    if (!r.bauabzugAnFinanzamtAbgefuehrtAm) entry.offenCents += cents;
  }

  const quartale = Array.from(map.values()).sort((a, b) => {
    if (b.jahr !== a.jahr) return b.jahr - a.jahr;
    return b.q - a.q;
  });

  const totalOffen = quartale.reduce((sum, q) => sum + q.offenCents, 0);
  const totalGesamt = quartale.reduce((sum, q) => sum + q.summeCents, 0);

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Finanzen · § 48a EStG
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Bauabzug-Anmeldung
        </h1>
        <p className="mt-3 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Aggregation aller einbehaltenen Bauabzug-Beträge je Quartal.
          ELSTER-Anmeldung erfolgt im Mein-ELSTER-Portal — hier liegt nur die
          Datenvorbereitung als CSV-Export.
        </p>
        <div className="mt-3">
          <Link
            href="/finanzen"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zu Finanzen
          </Link>
        </div>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-10">
        <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] md:grid-cols-3">
          <div className="bg-[color:var(--color-bg)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
              Σ Bauabzug aktuell
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {fmtMoney(totalGesamt / 100)}
            </p>
          </div>
          <div className="bg-[color:var(--color-bg)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
              davon offen
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {fmtMoney(totalOffen / 100)}
            </p>
          </div>
          <div className="bg-[color:var(--color-bg)] p-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
              Quartale erfasst
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">
              {quartale.length}
            </p>
          </div>
        </div>
      </section>

      <section className="pb-16">
        {quartale.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch kein Bauabzug einbehalten. Eingangsrechnungen ohne
              Freistellungsbescheinigung lösen 15 % Einbehalt aus.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {quartale.map((q) => (
              <details
                key={`${q.jahr}-Q${q.q}`}
                open={q.offenCents > 0}
                className="border border-[color:var(--color-border)] rounded-md"
              >
                <summary className="cursor-pointer px-5 py-3 hover:bg-[color:var(--color-bg-subtle)] transition-colors flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                      Meldetermin: {formatDateShort(q.meldetermin)}
                    </p>
                    <p className="text-base font-semibold mt-1">{q.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                      Σ {q.rechnungen.length} Rg
                    </p>
                    <p className="text-lg font-semibold tabular-nums">
                      {fmtMoney(q.summeCents / 100)}
                    </p>
                    {q.offenCents > 0 ? (
                      <p className="text-[11px] text-[color:var(--color-warning)] tabular-nums">
                        davon offen: {fmtMoney(q.offenCents / 100)}
                      </p>
                    ) : (
                      <p className="text-[11px] text-[color:var(--color-success)]">
                        vollständig abgeführt
                      </p>
                    )}
                  </div>
                  <div>
                    <a
                      href={`/finanzen/bauabzug/export.csv?jahr=${q.jahr}&q=${q.q}`}
                      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs hover:bg-[color:var(--color-bg)] transition-colors"
                    >
                      ↓ CSV
                    </a>
                  </div>
                </summary>
                <div className="border-t border-[color:var(--color-border)] overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                      <tr>
                        <th className="px-3 py-2 text-left">Rg-Datum</th>
                        <th className="px-3 py-2 text-left">NU</th>
                        <th className="px-3 py-2 text-right">Brutto</th>
                        <th className="px-3 py-2 text-right">Einbehalt</th>
                        <th className="px-3 py-2 text-left">Abgeführt am</th>
                      </tr>
                    </thead>
                    <tbody>
                      {q.rechnungen.map((r) => (
                        <tr
                          key={r.id}
                          className="border-t border-[color:var(--color-border)]"
                        >
                          <td className="px-3 py-2 font-mono text-xs">
                            {formatDateShort(r.invoiceDate)}
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/rechnungen/${r.id}`}
                              className="hover:text-[color:var(--color-accent)]"
                            >
                              {r.supplierName ?? "—"}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">
                            {r.totalGross !== null
                              ? fmtMoney(r.totalGross)
                              : "—"}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">
                            {fmtMoney(r.bauabzugEinbehaltCents / 100)}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">
                            {r.abgefuehrtAm ? (
                              <span className="text-[color:var(--color-success)]">
                                {formatDateShort(r.abgefuehrtAm)}
                              </span>
                            ) : (
                              <span className="text-[color:var(--color-warning)]">
                                offen
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}
