import { Link } from "@/i18n/navigation";
import { and, asc, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import {
  EIGENTUM_LABEL,
  KATEGORIE_LABEL,
  STATUS_LABEL,
  wartungState,
} from "@/lib/geraete";
import { formatDateShort } from "@/lib/utils";
import type { GeraetKategorie, GeraetStatus } from "@/db/schema";

export const dynamic = "force-dynamic";

const STATUS_VALUES: GeraetStatus[] = [
  "verfuegbar",
  "disponiert",
  "in_wartung",
  "defekt",
  "ausgemustert",
];

const KATEGORIE_VALUES: GeraetKategorie[] = [
  "kran",
  "bagger",
  "radlader",
  "geruest",
  "handwerk",
  "fahrzeug",
  "sonstiges",
];

function isStatus(v: string | undefined): v is GeraetStatus {
  return !!v && (STATUS_VALUES as string[]).includes(v);
}
function isKategorie(v: string | undefined): v is GeraetKategorie {
  return !!v && (KATEGORIE_VALUES as string[]).includes(v);
}

export default async function GeraetePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; kategorie?: string }>;
}) {
  const sp = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();
  const filterStatus = isStatus(sp.status) ? sp.status : null;
  const filterKategorie = isKategorie(sp.kategorie) ? sp.kategorie : null;

  const conditions = [eq(schema.geraete.workspaceId, workspaceId)];
  if (filterStatus) conditions.push(eq(schema.geraete.status, filterStatus));
  if (filterKategorie)
    conditions.push(eq(schema.geraete.kategorie, filterKategorie));

  const [alle, gefiltert, offeneWartungen] = await Promise.all([
    db
      .select()
      .from(schema.geraete)
      .where(eq(schema.geraete.workspaceId, workspaceId)),
    db
      .select()
      .from(schema.geraete)
      .where(and(...conditions))
      .orderBy(asc(schema.geraete.bezeichnung)),
    db
      .select()
      .from(schema.geraeteWartung)
      .where(eq(schema.geraeteWartung.workspaceId, workspaceId))
      .orderBy(desc(schema.geraeteWartung.faelligAm)),
  ]);

  const stats = {
    total: alle.length,
    verfuegbar: alle.filter((g) => g.status === "verfuegbar").length,
    disponiert: alle.filter((g) => g.status === "disponiert").length,
    wartungOverdue: offeneWartungen.filter(
      (w) => wartungState(w.faelligAm, w.durchgefuehrtAm, w.art) === "overdue"
    ).length,
  };

  // Map<geraetId, naechsteOffeneFaelligkeit>
  const naechsteWartung = new Map<string, string>();
  for (const w of offeneWartungen) {
    if (w.durchgefuehrtAm) continue;
    const cur = naechsteWartung.get(w.geraetId);
    if (!cur || w.faelligAm < cur) naechsteWartung.set(w.geraetId, w.faelligAm);
  }

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Betriebsmittel · UVV § 3 BetrSichV
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Geräte &amp; Maschinen
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Bestand, Disposition auf Projekte und Wartungsfristen. UVV-Prüfungen
          und Mietrückgaben werden automatisch eskaliert.
        </p>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <StatGrid4>
          <StatCard label="Geräte gesamt" value={stats.total} />
          <StatCard label="Verfügbar" value={stats.verfuegbar} />
          <StatCard label="Disponiert" value={stats.disponiert} tone="accent" />
          <StatCard
            label="UVV überfällig"
            value={stats.wartungOverdue}
            tone={stats.wartungOverdue > 0 ? "critical" : "default"}
          />
        </StatGrid4>
      </section>

      <section className="pb-6 flex flex-wrap items-center gap-2">
        <FilterPill href="/geraete" active={!filterStatus && !filterKategorie}>
          Alle
        </FilterPill>
        {STATUS_VALUES.map((s) => (
          <FilterPill
            key={s}
            href={`/geraete?status=${s}${filterKategorie ? `&kategorie=${filterKategorie}` : ""}`}
            active={filterStatus === s}
          >
            {STATUS_LABEL[s]}
          </FilterPill>
        ))}
        <span className="mx-2 text-[color:var(--color-border)]">|</span>
        {KATEGORIE_VALUES.map((k) => (
          <FilterPill
            key={k}
            href={`/geraete?kategorie=${k}${filterStatus ? `&status=${filterStatus}` : ""}`}
            active={filterKategorie === k}
          >
            {KATEGORIE_LABEL[k]}
          </FilterPill>
        ))}
        <span className="ml-auto">
          <Link
            href="/geraete/new"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Neues Gerät
          </Link>
        </span>
      </section>

      {gefiltert.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {alle.length === 0
                ? "Noch keine Geräte erfasst."
                : "Keine Geräte mit diesen Filterkriterien."}
            </p>
          </div>
        </section>
      ) : (
        <section className="pb-16">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {gefiltert.map((g) => {
              const nextW = naechsteWartung.get(g.id);
              const wState = nextW
                ? wartungState(nextW, null, "uvv_pruefung")
                : null;
              return (
                <li key={g.id} className="py-5">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/geraete/${g.id}`}
                          className="text-base font-medium text-[color:var(--color-fg)] hover:text-[color:var(--color-accent)] transition-colors"
                        >
                          {g.bezeichnung}
                        </Link>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg)] border-[color:var(--color-border)]">
                          {KATEGORIE_LABEL[g.kategorie]}
                        </span>
                        <StatusPill status={g.status} />
                        {g.eigentum !== "eigen" ? (
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]">
                            {EIGENTUM_LABEL[g.eigentum]}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        {g.inventarNr ? (
                          <span className="font-mono">{g.inventarNr}</span>
                        ) : (
                          <span className="opacity-60">ohne Inventar-Nr.</span>
                        )}
                        {g.hersteller ? ` · ${g.hersteller}` : ""}
                        {g.baujahr ? ` · BJ ${g.baujahr}` : ""}
                        {g.mietBisDatum
                          ? ` · Mietende ${formatDateShort(g.mietBisDatum)}`
                          : ""}
                      </p>
                    </div>
                    {nextW ? (
                      <div className="text-right shrink-0">
                        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                          Nächste Wartung
                        </p>
                        <p
                          className={
                            "mt-1 text-xs font-mono " +
                            (wState === "overdue"
                              ? "text-[color:var(--color-critical)] font-semibold"
                              : wState === "expiring"
                                ? "text-[color:var(--color-warning)]"
                                : "text-[color:var(--color-fg)]")
                          }
                        >
                          {formatDateShort(nextW)}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)] mb-3">
          Pflichten
        </p>
        <ul className="space-y-2 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
          <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
            <strong>UVV-Prüfung</strong> nach § 3 BetrSichV — Arbeitsmittel sind
            regelmäßig durch eine befähigte Person prüfen zu lassen, in der Regel
            jährlich. Reminder ab 30 Tagen Vorlauf erzeugt Auto-Vorgang.
          </li>
          <li className="border-l-2 border-[color:var(--color-warning)] pl-3">
            <strong>Mietrückgabe</strong> — bei Miete/Leasing wird 14 Tage vor
            Vertragsende ein Auto-Vorgang erzeugt, damit Verlängerung oder
            Rückgabe-Termin organisiert werden kann.
          </li>
        </ul>
      </section>
    </Container>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={
        "rounded-full px-3 py-1 text-xs transition-colors " +
        (active
          ? "bg-[color:var(--color-fg)] text-[color:var(--color-bg)]"
          : "border border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)]")
      }
    >
      {children}
    </Link>
  );
}

function StatusPill({ status }: { status: GeraetStatus }) {
  const tone =
    status === "verfuegbar"
      ? "border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]"
      : status === "disponiert"
        ? "border-[color:var(--color-accent)] bg-transparent text-[color:var(--color-accent)]"
        : status === "in_wartung"
          ? "border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]"
          : status === "defekt"
            ? "border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)]"
            : "border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)]";
  return (
    <span
      className={`font-mono text-[10px] uppercase tracking-[0.12em] border rounded-sm px-1.5 py-0.5 ${tone}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
