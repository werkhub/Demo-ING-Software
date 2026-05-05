import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getDokumenteByProject, getProjectById } from "@/db/queries";
import { formatDateShort } from "@/lib/utils";
import { deleteDokument } from "./actions";

export const dynamic = "force-dynamic";

export default async function DokumenteListPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const dokumente = await getDokumenteByProject(id);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 flex-wrap">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
            Dokumente
          </h1>
          <Link
            href={`/projekte/${id}/dokumente/new`}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-4 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            + Dokument hochladen
          </Link>
        </div>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)] max-w-2xl">
          Lose Projekt-Dokumente (Verträge, Protokolle, Schriftverkehr).
          Pläne mit Versionierung gehören in die Plan-Ablage.
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            zurück zum Projekt
          </Link>
        </div>
      </section>

      {dokumente.length === 0 ? (
        <section className="pb-16">
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              Noch keine Dokumente hinterlegt.
            </p>
          </div>
        </section>
      ) : (
        <section className="pb-16">
          <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
            {dokumente.map((d) => {
              const url = `/api/uploads/dokumente/${d.workspaceId}/${d.id}/${encodeURIComponent(d.filename)}`;
              return (
                <li key={d.id} className="py-4 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] uppercase tracking-[0.16em] border rounded-sm px-1.5 py-0.5 border-[color:var(--color-border)]">
                        {d.kategorie}
                      </span>
                      {d.vertraulichPct > 0 ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.16em] border rounded-sm px-1.5 py-0.5 bg-[color:var(--color-critical-soft)] text-[color:var(--color-critical)] border-[color:var(--color-critical-border)]">
                          vertraulich {d.vertraulichPct}%
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-sm font-medium">
                      {d.bezeichnung}
                    </p>
                    <p className="text-[11px] text-[color:var(--color-fg-muted)]">
                      {d.filename} · {(d.sizeBytes / 1024).toFixed(0)} kB ·{" "}
                      {formatDateShort(d.createdAt.toISOString())}
                    </p>
                    {d.notes ? (
                      <p className="mt-1 text-xs">{d.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-[color:var(--color-accent)] hover:underline"
                    >
                      öffnen ↗
                    </a>
                    <form action={deleteDokument}>
                      <input type="hidden" name="id" value={d.id} />
                      <button
                        type="submit"
                        className="text-xs text-[color:var(--color-critical)] hover:underline"
                      >
                        löschen
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </Container>
  );
}
