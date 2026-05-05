import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { KATEGORIE_LABEL, WARTUNG_ART_LABEL } from "@/lib/geraete";
import { createWartung } from "../../../actions";
import type { WartungArt } from "@/db/schema";

export const dynamic = "force-dynamic";

const ARTEN: WartungArt[] = [
  "uvv_pruefung",
  "tuev",
  "inspektion",
  "reparatur",
];

export default async function NewWartungPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspaceId = await getCurrentWorkspaceId();
  const [geraet] = await db
    .select()
    .from(schema.geraete)
    .where(
      and(
        eq(schema.geraete.id, id),
        eq(schema.geraete.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!geraet) notFound();

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {KATEGORIE_LABEL[geraet.kategorie]} · {geraet.bezeichnung}
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          Wartung anlegen
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
          Erfassung einer geplanten Wartung oder einer bereits durchgeführten
          Reparatur. UVV-Prüfungen erzeugen 30 Tage vor Fälligkeit einen
          Auto-Vorgang.
        </p>
        <div className="mt-3">
          <Link
            href={`/geraete/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Gerät
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <form action={createWartung} className="space-y-6 max-w-2xl">
          <input type="hidden" name="geraetId" value={geraet.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="art"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Art
              </label>
              <select
                id="art"
                name="art"
                required
                defaultValue="uvv_pruefung"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
              >
                {ARTEN.map((a) => (
                  <option key={a} value={a}>
                    {WARTUNG_ART_LABEL[a]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="faelligAm"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Fällig am
              </label>
              <input
                id="faelligAm"
                name="faelligAm"
                type="date"
                required
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="durchgefuehrtAm"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Durchgeführt am (optional)
              </label>
              <input
                id="durchgefuehrtAm"
                name="durchgefuehrtAm"
                type="date"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="durchgefuehrtVon"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Prüfer / Werkstatt
              </label>
              <input
                id="durchgefuehrtVon"
                name="durchgefuehrtVon"
                type="text"
                maxLength={200}
                placeholder="z. B. TÜV Süd, Werkstatt Schmidt"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="kostenCents"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Kosten (€ netto)
              </label>
              <input
                id="kostenCents"
                name="kostenCents"
                type="number"
                step="0.01"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="prueferzeugnisFilename"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Prüfzeugnis-Datei (Name)
              </label>
              <input
                id="prueferzeugnisFilename"
                name="prueferzeugnisFilename"
                type="text"
                maxLength={200}
                placeholder="z. B. UVV-2026-Mobilkran.pdf"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="notes"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Notizen
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              maxLength={2000}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] pt-6">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Wartung anlegen
            </button>
          </div>
        </form>
      </section>
    </Container>
  );
}
