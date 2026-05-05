import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getProjectById } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import {
  istUeberfaellig,
  PRUEFUNG_ART_LABEL,
  tageBisPruefung,
  zustandsKlasse,
  ZUSTANDS_KLASSE_LABEL,
} from "@/lib/bauwerkspruefung/din1076";
import { formatDateShort } from "@/lib/utils";
import {
  abschliessenPruefung,
  createPruefung,
  deleteBauwerk,
} from "../actions";

export const dynamic = "force-dynamic";

const BAUWERKSART_LABEL: Record<string, string> = {
  bruecke: "Brücke",
  tunnel: "Tunnel",
  stuetzmauer: "Stützmauer",
  laermschutzwand: "Lärmschutzwand",
  ueberfuehrung: "Überführung",
  unterfuehrung: "Unterführung",
  sonstiges: "Sonstiges",
};

const STATUS_LABEL: Record<string, string> = {
  geplant: "geplant",
  in_durchfuehrung: "läuft",
  abgeschlossen: "abgeschlossen",
};

export default async function BauwerkDetailPage({
  params,
}: {
  params: Promise<{ id: string; bauwerkId: string }>;
}) {
  const { id, bauwerkId } = await params;
  const [project, workspace] = await Promise.all([
    getProjectById(id),
    getCurrentWorkspace(),
  ]);
  if (!project) notFound();
  if (workspace.workspaceRole !== "ingenieurbuero") {
    redirect(`/projekte/${id}`);
  }

  const [bauwerk] = await db
    .select()
    .from(schema.bauwerke)
    .where(
      and(
        eq(schema.bauwerke.id, bauwerkId),
        eq(schema.bauwerke.projektId, id)
      )
    )
    .limit(1);
  if (!bauwerk) notFound();

  const pruefungen = await db
    .select()
    .from(schema.bauwerkspruefungen)
    .where(eq(schema.bauwerkspruefungen.bauwerkId, bauwerkId))
    .orderBy(desc(schema.bauwerkspruefungen.geplantAm));

  const klasse =
    bauwerk.aktuelleZustandsnote !== null
      ? zustandsKlasse(bauwerk.aktuelleZustandsnote)
      : null;
  const tageHaupt = tageBisPruefung(bauwerk.naechsteHauptpruefungAm);
  const tageEinf = tageBisPruefung(bauwerk.naechsteEinfachePruefungAm);

  const offenePruefungen = pruefungen.filter(
    (p) => p.status !== "abgeschlossen"
  );
  const abgeschlossenePruefungen = pruefungen.filter(
    (p) => p.status === "abgeschlossen"
  );

  return (
    <Container>
      <section className="pt-14 pb-6">
        <Link
          href={`/projekte/${id}/bauwerke`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
        >
          ← zurück zur Bauwerksliste
        </Link>
        <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {bauwerk.bauwerksnummer} ·{" "}
          {BAUWERKSART_LABEL[bauwerk.bauwerksart] ?? bauwerk.bauwerksart}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          {bauwerk.bezeichnung}
        </h1>
        {bauwerk.notes ? (
          <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-3xl whitespace-pre-line">
            {bauwerk.notes}
          </p>
        ) : null}
      </section>

      {/* KPI-Block */}
      <section className="border-t border-[color:var(--color-border)] pt-6 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Tile label="Baujahr" value={bauwerk.baujahr ? String(bauwerk.baujahr) : "—"} />
          <Tile
            label="Aktuelle Zustandsnote"
            value={
              bauwerk.aktuelleZustandsnote !== null
                ? bauwerk.aktuelleZustandsnote.toFixed(1)
                : "—"
            }
            caption={klasse ? ZUSTANDS_KLASSE_LABEL[klasse] : undefined}
            highlight={klasse === "ungenuegend" || klasse === "nicht_ausreichend"}
          />
          <Tile
            label="Nächste Hauptprüfung"
            value={
              bauwerk.naechsteHauptpruefungAm
                ? formatDateShort(bauwerk.naechsteHauptpruefungAm)
                : "—"
            }
            caption={
              tageHaupt !== null
                ? tageHaupt < 0
                  ? `${Math.abs(tageHaupt)} d überfällig`
                  : `in ${tageHaupt} d`
                : undefined
            }
            highlight={istUeberfaellig(bauwerk.naechsteHauptpruefungAm)}
          />
          <Tile
            label="Nächste Einfache Prüfung"
            value={
              bauwerk.naechsteEinfachePruefungAm
                ? formatDateShort(bauwerk.naechsteEinfachePruefungAm)
                : "—"
            }
            caption={
              tageEinf !== null
                ? tageEinf < 0
                  ? `${Math.abs(tageEinf)} d überfällig`
                  : `in ${tageEinf} d`
                : undefined
            }
            highlight={istUeberfaellig(bauwerk.naechsteEinfachePruefungAm)}
          />
        </div>
      </section>

      {/* Prüfung erfassen */}
      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Prüfung anlegen
        </p>
        <form action={createPruefung} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <input type="hidden" name="bauwerkId" value={bauwerk.id} />
          <label className="block md:col-span-2">
            <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
              Art
            </span>
            <select
              name="art"
              defaultValue="hauptpruefung"
              className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
            >
              <option value="hauptpruefung">Hauptprüfung (H)</option>
              <option value="einfache_pruefung">Einfache Prüfung (E)</option>
              <option value="besichtigung">Besichtigung (B)</option>
              <option value="sonderpruefung">Sonderprüfung (S)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
              Geplant am
            </span>
            <input
              type="date"
              name="geplantAm"
              className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            className="rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Prüfung
          </button>
        </form>
      </section>

      {/* Offene Prüfungen */}
      {offenePruefungen.length > 0 ? (
        <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
            Offene Prüfungen ({offenePruefungen.length})
          </p>
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {offenePruefungen.map((p) => (
              <li key={p.id} className="py-4">
                <details>
                  <summary className="cursor-pointer">
                    <span className="text-sm font-medium">
                      {PRUEFUNG_ART_LABEL[p.art]}
                    </span>
                    <span className="ml-2 text-xs text-[color:var(--color-fg-muted)]">
                      {p.geplantAm ? `geplant ${formatDateShort(p.geplantAm)}` : "ohne Termin"}
                      {" · Status "}
                      {STATUS_LABEL[p.status]}
                    </span>
                  </summary>
                  <form action={abschliessenPruefung} className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input type="hidden" name="pruefungId" value={p.id} />
                    <label className="block">
                      <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                        Durchgeführt am *
                      </span>
                      <input
                        type="date"
                        name="durchgefuehrtAm"
                        required
                        defaultValue={
                          p.geplantAm ?? new Date().toISOString().slice(0, 10)
                        }
                        className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                        Prüfer
                      </span>
                      <input
                        type="text"
                        name="pruefer"
                        placeholder="Dipl.-Ing. Schraufstetter"
                        className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                        Zustandsnote 1.0–4.0 *
                      </span>
                      <input
                        type="text"
                        name="zustandsnote"
                        required
                        placeholder="2.3"
                        pattern="[1-4]([\.,]\d)?"
                        className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm font-mono"
                      />
                    </label>
                    <label className="block md:col-span-3">
                      <span className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                        Bauwerksteil / Notizen
                      </span>
                      <input
                        type="text"
                        name="bauwerksteil"
                        placeholder="z.B. Überbau, Lager NK1"
                        className="mt-1 block w-full rounded border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="md:col-span-3">
                      <button
                        type="submit"
                        className="rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
                      >
                        Prüfung abschließen
                      </button>
                    </div>
                  </form>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Historie */}
      {abgeschlossenePruefungen.length > 0 ? (
        <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
            Historie ({abgeschlossenePruefungen.length})
          </p>
          <div className="border border-[color:var(--color-border)] rounded-md overflow-hidden">
            <div className="grid grid-cols-12 gap-2 bg-[color:var(--color-bg-subtle)] border-b border-[color:var(--color-border)] py-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              <div className="col-span-3">Art</div>
              <div className="col-span-2">Datum</div>
              <div className="col-span-3">Prüfer</div>
              <div className="col-span-2">Bauwerksteil</div>
              <div className="col-span-2 text-right">Note</div>
            </div>
            <div className="divide-y divide-[color:var(--color-border)]">
              {abgeschlossenePruefungen.map((p) => {
                const k =
                  p.zustandsnote !== null ? zustandsKlasse(p.zustandsnote) : null;
                return (
                  <div
                    key={p.id}
                    className="grid grid-cols-12 gap-2 py-2 px-3 text-sm items-center"
                  >
                    <div className="col-span-3 text-xs">
                      {PRUEFUNG_ART_LABEL[p.art]}
                    </div>
                    <div className="col-span-2 font-mono text-xs">
                      {p.durchgefuehrtAm
                        ? formatDateShort(p.durchgefuehrtAm)
                        : "—"}
                    </div>
                    <div className="col-span-3 text-xs">{p.pruefer ?? "—"}</div>
                    <div className="col-span-2 text-xs">
                      {p.bauwerksteil ?? "—"}
                    </div>
                    <div className="col-span-2 text-right font-mono text-xs">
                      {p.zustandsnote !== null ? p.zustandsnote.toFixed(1) : "—"}
                      {k ? (
                        <span className="ml-2 text-[10px] text-[color:var(--color-fg-muted)]">
                          ({ZUSTANDS_KLASSE_LABEL[k]})
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      {/* Bauwerk löschen */}
      <section className="border-t border-[color:var(--color-border)] pt-8 pb-16">
        <form action={deleteBauwerk}>
          <input type="hidden" name="id" value={bauwerk.id} />
          <button
            type="submit"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
          >
            Bauwerk löschen
          </button>
        </form>
      </section>
    </Container>
  );
}

function Tile({
  label,
  value,
  caption,
  highlight,
}: {
  label: string;
  value: string;
  caption?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-4 ${
        highlight
          ? "border-[color:var(--color-danger-border)] bg-[color:var(--color-danger-soft)]"
          : "border-[color:var(--color-border)]"
      }`}
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-semibold tracking-tight ${
          highlight ? "text-[color:var(--color-danger)]" : ""
        }`}
      >
        {value}
      </p>
      {caption ? (
        <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
          {caption}
        </p>
      ) : null}
    </div>
  );
}
