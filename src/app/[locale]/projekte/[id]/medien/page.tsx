/**
 * Beweis-Mediathek pro Projekt — read-only Aggregation aller Bautagebuch-Fotos.
 *
 * Heutige Quellen:
 *   - bautagebuchFotos (mit Auslieferungs-Route /api/uploads/bautagebuch/[fotoId])
 *
 * Mängel-Fotos (`maengel.fotoFilenamesJson`) sind aktuell ohne dedizierte
 * Auslieferungs-Route gespeichert und werden hier deshalb nicht angezeigt —
 * sobald der Upload-Pfad steht, kann die Aggregation erweitert werden.
 */
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { getProjectById } from "@/db/queries";
import { formatDateShort } from "@/lib/utils";
import { CATEGORY_LABEL } from "@/app/[locale]/bautagebuch/constants";

export const dynamic = "force-dynamic";

export default async function ProjektMedienPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ from?: string; to?: string; cat?: string }>;
}) {
  const { id } = await params;
  const { from, to, cat } = await searchParams;
  const project = await getProjectById(id);
  if (!project) notFound();

  const workspaceId = await getCurrentWorkspaceId();

  // Bautagebuch-Einträge mit Fotos pro Projekt
  const fotos = await db
    .select({
      foto: schema.bautagebuchFotos,
      eintragId: schema.bautagebuchEntries.id,
      entryDate: schema.bautagebuchEntries.entryDate,
      category: schema.bautagebuchEntries.category,
      authorName: schema.bautagebuchEntries.authorName,
    })
    .from(schema.bautagebuchFotos)
    .innerJoin(
      schema.bautagebuchEntries,
      eq(schema.bautagebuchFotos.eintragId, schema.bautagebuchEntries.id)
    )
    .where(
      and(
        eq(schema.bautagebuchFotos.workspaceId, workspaceId),
        eq(schema.bautagebuchFotos.projektId, id)
      )
    )
    .orderBy(desc(schema.bautagebuchEntries.entryDate));

  const filtered = fotos.filter((row) => {
    if (from && row.entryDate < from) return false;
    if (to && row.entryDate > to) return false;
    if (cat && row.category !== cat) return false;
    return true;
  });

  // Gruppiert nach Datum + Eintrag
  type Group = {
    entryDate: string;
    eintragId: string;
    category: string;
    authorName: string | null;
    items: typeof filtered;
  };
  const groups: Group[] = [];
  for (const row of filtered) {
    const last = groups[groups.length - 1];
    if (last && last.eintragId === row.eintragId) {
      last.items.push(row);
    } else {
      groups.push({
        entryDate: row.entryDate,
        eintragId: row.eintragId,
        category: row.category,
        authorName: row.authorName,
        items: [row],
      });
    }
  }

  const categories = Array.from(new Set(fotos.map((r) => r.category))).sort();

  return (
    <Container size="wide">
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Beweis-Mediathek
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-fg-muted)]">
          Alle Foto-Beweise aus dem Bautagebuch dieses Projekts in einer
          Galerie-Ansicht. Fotos lassen sich nicht hier hochladen — Upload
          erfolgt direkt am jeweiligen Bautagebuch-Eintrag.
        </p>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-3">
          <Link
            href={`/projekte/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Projekt
          </Link>
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            {filtered.length} von {fotos.length} Fotos
          </p>
        </div>
      </section>

      <section className="pb-6">
        <form
          action={`/projekte/${id}/medien`}
          className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-3 flex flex-wrap items-end gap-3"
        >
          <label className="block">
            <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
              Von
            </span>
            <input
              type="date"
              name="from"
              defaultValue={from ?? ""}
              className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
              Bis
            </span>
            <input
              type="date"
              name="to"
              defaultValue={to ?? ""}
              className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="block text-[10px] font-mono uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mb-1">
              Kategorie
            </span>
            <select
              name="cat"
              defaultValue={cat ?? ""}
              className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
            >
              <option value="">Alle</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c as keyof typeof CATEGORY_LABEL] ?? c}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="text-xs px-4 py-2 rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-bg)] hover:bg-[color:var(--color-fg)] hover:text-[color:var(--color-bg)] transition-colors"
          >
            Filter anwenden
          </button>
          <Link
            href={`/projekte/${id}/medien`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            zurücksetzen
          </Link>
        </form>
      </section>

      <section className="pb-16">
        {groups.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Keine Fotos
              {fotos.length > 0 ? " für diese Filter." : " im Projekt."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groups.map((g) => (
              <div key={g.eintragId}>
                <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                      {formatDateShort(g.entryDate)} ·{" "}
                      {CATEGORY_LABEL[
                        g.category as keyof typeof CATEGORY_LABEL
                      ] ?? g.category}
                      {g.authorName ? ` · ${g.authorName}` : ""}
                    </p>
                    <Link
                      href={`/projekte/${id}/bautagebuch#eintrag-${g.eintragId}`}
                      className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
                    >
                      → zum Bautagebuch-Eintrag
                    </Link>
                  </div>
                  <p className="text-[11px] text-[color:var(--color-fg-muted)]">
                    {g.items.length} Foto{g.items.length === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="grid gap-px overflow-hidden border border-[color:var(--color-border)] bg-[color:var(--color-border)] grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {g.items.map((row) => (
                    <a
                      key={row.foto.id}
                      href={`/api/uploads/bautagebuch/${row.foto.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-[color:var(--color-bg)] block group relative aspect-square"
                      title={row.foto.caption ?? row.foto.filename}
                    >
                      <Image
                        src={`/api/uploads/bautagebuch/${row.foto.id}`}
                        alt={row.foto.caption ?? row.foto.filename}
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 50vw, (max-width: 1280px) 25vw, 16vw"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                      {row.foto.caption ? (
                        <span className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] px-2 py-1 truncate">
                          {row.foto.caption}
                        </span>
                      ) : null}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </Container>
  );
}
