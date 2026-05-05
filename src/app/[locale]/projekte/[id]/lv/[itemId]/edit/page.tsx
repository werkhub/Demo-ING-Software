import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getLvItem, getProjectById } from "@/db/queries";
import { LV_ITEM_KIND_LABEL } from "@/lib/lv";
import type { LvItemKind } from "@/db/schema";
import { deleteLvItem, updateLvItem } from "../../lv-actions";

export const dynamic = "force-dynamic";

const KIND_OPTIONS: LvItemKind[] = [
  "titel",
  "untertitel",
  "position",
  "eventual",
  "bedarfsposition",
  "stundenlohn",
];

export default async function LvItemEditPage({
  params,
}: {
  params: Promise<{ id: string; itemId: string }>;
}) {
  const { id, itemId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const item = await getLvItem(itemId);
  if (!item) notFound();

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name} · LV-Position
        </p>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tighter">
          {item.oz ? `${item.oz} — ` : ""}
          {item.shortText}
        </h1>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/lv`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum LV
          </Link>
        </div>
      </section>

      <section className="pb-12 max-w-3xl">
        <form action={updateLvItem} className="space-y-6">
          <input type="hidden" name="id" value={item.id} />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-1">
              <label
                htmlFor="kind"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Art
              </label>
              <select
                id="kind"
                name="kind"
                defaultValue={item.kind}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k} value={k}>
                    {LV_ITEM_KIND_LABEL[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1">
              <label
                htmlFor="oz"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Ordnungszahl
              </label>
              <input
                id="oz"
                name="oz"
                type="text"
                defaultValue={item.oz ?? ""}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div className="md:col-span-1">
              <label
                htmlFor="vatPercent"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                MwSt %
              </label>
              <input
                id="vatPercent"
                name="vatPercent"
                type="number"
                step="0.1"
                defaultValue={item.vatPercent}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="shortText"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Kurztext
            </label>
            <input
              id="shortText"
              name="shortText"
              type="text"
              required
              defaultValue={item.shortText}
              maxLength={500}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="longText"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Langtext
            </label>
            <textarea
              id="longText"
              name="longText"
              rows={6}
              maxLength={50_000}
              defaultValue={item.longText ?? ""}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="quantity"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Menge
              </label>
              <input
                id="quantity"
                name="quantity"
                type="number"
                step="0.001"
                defaultValue={item.quantity ?? ""}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="unit"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                Einheit
              </label>
              <input
                id="unit"
                name="unit"
                type="text"
                defaultValue={item.unit ?? ""}
                placeholder="z. B. m², Stk, psch"
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
            <div>
              <label
                htmlFor="unitPrice"
                className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
              >
                EP (€)
              </label>
              <input
                id="unitPrice"
                name="unitPrice"
                type="number"
                step="0.01"
                defaultValue={item.unitPrice ?? ""}
                className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-[color:var(--color-border)] pt-6">
            <Link
              href={`/projekte/${id}/lv`}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Speichern
            </button>
          </div>
        </form>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-6 pb-16">
        <form action={deleteLvItem}>
          <input type="hidden" name="id" value={item.id} />
          <button
            type="submit"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
          >
            Position löschen
          </button>
        </form>
      </section>
    </Container>
  );
}
