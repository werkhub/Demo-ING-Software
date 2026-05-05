import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { StatCard, StatGrid4 } from "@/components/stat-card";
import { LvTree } from "@/components/lv-tree";
import {
  getLvByProject,
  getLvItems,
  getProjectById,
} from "@/db/queries";
import {
  LV_STATUS_LABEL,
  buildItemTree,
  computeTotals,
} from "@/lib/lv";
import { fmtMoney } from "@/lib/utils";
import { deleteLv } from "./lv-actions";

export const dynamic = "force-dynamic";

export default async function LvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const lv = await getLvByProject(id);
  const items = lv ? await getLvItems(lv.id) : [];
  const totals = lv ? computeTotals(items) : null;
  const tree = buildItemTree(items);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
            Leistungsverzeichnis
          </h1>
          {!lv ? (
            <Link
              href={`/projekte/${id}/lv/import`}
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              + GAEB-Datei importieren
            </Link>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/projekte/${id}/aufmass`}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                → Aufmaß
              </Link>
              <Link
                href={`/projekte/${id}/lv/import`}
                className="text-xs px-3 py-1.5 rounded-full border border-[color:var(--color-border)] hover:border-[color:var(--color-accent)] hover:text-[color:var(--color-accent)] transition-colors"
              >
                Neu importieren ↻
              </Link>
            </div>
          )}
        </div>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Projekt
          </Link>
        </div>
      </section>

      {!lv ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg)]">
              Noch kein LV importiert.
            </p>
            <p className="mt-2 text-xs text-[color:var(--color-fg-muted)] max-w-md mx-auto">
              Importiere eine GAEB-Datei (.X83 / .X84 / .xml) — wir lesen
              Stammdaten, Hierarchie, Mengen und Preise. Voraussetzung für
              Aufmaß und Abrechnung.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
            <StatGrid4>
              <StatCard
                label="Status"
                value={LV_STATUS_LABEL[lv.status]}
              />
              <StatCard
                label="Positionen"
                value={totals?.positionCount ?? 0}
                caption={
                  totals && totals.optionalCount > 0
                    ? `+ ${totals.optionalCount} optional`
                    : undefined
                }
              />
              <StatCard
                label="Auftragssumme netto"
                value={
                  totals ? fmtMoney(totals.totalNet) : "—"
                }
              />
              <StatCard
                label="Auftragssumme brutto"
                value={totals ? fmtMoney(totals.totalGross) : "—"}
              />
            </StatGrid4>
          </section>

          <section className="pb-6">
            <div className="grid gap-4 md:grid-cols-2 text-sm">
              <Row label="Quelle" value={lv.gaebSourceFilename ?? "—"} />
              <Row label="GAEB-Version" value={lv.gaebSourceVersion ?? "—"} />
              <Row
                label="Auftraggeber (laut LV)"
                value={lv.partyAg ?? "—"}
              />
              <Row
                label="Auftragnehmer (laut LV)"
                value={lv.partyAn ?? "—"}
              />
              {lv.gaebImportedAt ? (
                <Row
                  label="Importiert"
                  value={lv.gaebImportedAt.toLocaleString("de-DE")}
                />
              ) : null}
            </div>
            {totals && totals.optionalCount > 0 ? (
              <p className="mt-3 text-xs text-[color:var(--color-fg-muted)]">
                Eventual-/Bedarfspositionen: {fmtMoney(totals.optionalNet)} —
                <span className="italic"> nicht in der Auftragssumme enthalten.</span>
              </p>
            ) : null}
          </section>

          <section className="pb-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
              Positionen
            </p>
            <LvTree nodes={tree} projectId={id} />
          </section>

          <section className="border-t border-[color:var(--color-border)] pt-6 pb-16 flex justify-end">
            <form action={deleteLv}>
              <input type="hidden" name="id" value={lv.id} />
              <button
                type="submit"
                className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
              >
                LV löschen
              </button>
            </form>
          </section>
        </>
      )}
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}
