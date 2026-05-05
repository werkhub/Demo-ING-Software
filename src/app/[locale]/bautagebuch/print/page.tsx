import { Link } from "@/i18n/navigation";
import { getBautagebuchInRange, getProjects } from "@/db/queries";
import { getCurrentWorkspace } from "@/lib/session";
import { formatDateShort } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  WEATHER_LABEL,
} from "../constants";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default async function PrintBautagebuch({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const projectFilter = sp.project ?? "";
  const fromDate = sp.from ?? isoDaysAgo(30);
  const toDate = sp.to ?? isoToday();

  const [workspace, projects, entries] = await Promise.all([
    getCurrentWorkspace(),
    getProjects(),
    getBautagebuchInRange({
      projectId: projectFilter || undefined,
      fromDate,
      toDate,
    }),
  ]);

  const project = projectFilter ? projects.find((p) => p.id === projectFilter) : null;

  // Gruppierung nach entryDate für Druck (chronologisch absteigend)
  const groups = entries.reduce<Map<string, typeof entries>>((acc, e) => {
    if (!acc.has(e.entryDate)) acc.set(e.entryDate, []);
    acc.get(e.entryDate)!.push(e);
    return acc;
  }, new Map());
  const sortedDays = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));

  const totalHours = entries.reduce(
    (s, e) => s + (e.staffHoursOwn ?? 0) + (e.staffHoursSubcontractors ?? 0),
    0
  );

  return (
    <div className="max-w-[1024px] mx-auto px-6 md:px-10 py-8">
      {/* Filter-Bar nur am Bildschirm */}
      <div className="screen-only mb-6 border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-4 flex items-end gap-4 flex-wrap">
        <form className="flex items-end gap-3 flex-wrap flex-1">
          <div>
            <label
              htmlFor="project"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Projekt
            </label>
            <select
              id="project"
              name="project"
              defaultValue={projectFilter}
              className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm"
            >
              <option value="">Alle Projekte</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.identifier} · {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="from"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Von
            </label>
            <input
              id="from"
              name="from"
              type="date"
              defaultValue={fromDate}
              className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label
              htmlFor="to"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Bis
            </label>
            <input
              id="to"
              name="to"
              type="date"
              defaultValue={toDate}
              className="bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono"
            />
          </div>
          <button
            type="submit"
            className="rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 text-sm hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Filter anwenden
          </button>
        </form>
        <PrintButton />
        <Link
          href="/bautagebuch"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
        >
          ← Zurück
        </Link>
      </div>

      {/* Druck-Kopf */}
      <header className="border-b-2 border-black pb-4 mb-6">
        <p className="text-xs font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
          Bautagebuch
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {project ? `${project.identifier} · ${project.name}` : "Alle Bauvorhaben"}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          {workspace.name}
          {project ? ` · AG: ${project.ag}` : ""}
        </p>
        <div className="mt-3 grid grid-cols-3 gap-4 text-xs font-mono">
          <FactInline label="Zeitraum">
            {formatDateShort(fromDate)} – {formatDateShort(toDate)}
          </FactInline>
          <FactInline label="Einträge">{entries.length}</FactInline>
          <FactInline label="Stunden gesamt">
            {totalHours > 0 ? `${totalHours} h` : "—"}
          </FactInline>
        </div>
      </header>

      {/* Inhalts-Tabelle */}
      {entries.length === 0 ? (
        <p className="py-12 text-center text-sm text-[color:var(--color-fg-muted)] border border-dashed border-[color:var(--color-border)] rounded-md">
          Keine Einträge im gewählten Zeitraum.
        </p>
      ) : (
        <div className="space-y-6">
          {sortedDays.map((day) => {
            const dayEntries = groups.get(day)!;
            const dayHours = dayEntries.reduce(
              (s, e) =>
                s + (e.staffHoursOwn ?? 0) + (e.staffHoursSubcontractors ?? 0),
              0
            );
            return (
              <section key={day} className="print-no-break">
                <div className="flex items-baseline justify-between gap-3 border-b border-black/40 pb-1 mb-3">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {formatDateShort(day)}
                  </h2>
                  <span className="font-mono text-[11px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                    {dayEntries.length} {dayEntries.length === 1 ? "Eintrag" : "Einträge"}
                    {dayHours > 0 ? ` · ${dayHours} h` : ""}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="text-left">
                    <tr className="border-b border-black/30 text-[10px] uppercase tracking-wider font-mono text-[color:var(--color-fg-muted)]">
                      <th className="py-1 pr-2 w-32">Kategorie</th>
                      <th className="py-1 pr-2 w-40">Wetter / Personal</th>
                      <th className="py-1 pr-2">Eintrag</th>
                      <th className="py-1 w-24 text-right">Autor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dayEntries.map((e) => {
                      const proj = projects.find((p) => p.id === e.projectId);
                      const totalH =
                        (e.staffHoursOwn ?? 0) + (e.staffHoursSubcontractors ?? 0);
                      return (
                        <tr
                          key={e.id}
                          className="border-b border-black/15 align-top print-no-break"
                        >
                          <td className="py-2 pr-2">
                            <p className="font-mono text-[11px] uppercase tracking-wider">
                              {CATEGORY_LABEL[e.category]}
                            </p>
                            {!projectFilter && proj ? (
                              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)] mt-1">
                                {proj.identifier}
                              </p>
                            ) : null}
                            {e.triggerLabel ? (
                              <p className="font-mono text-[10px] uppercase tracking-wider text-[color:var(--color-warning)] mt-1">
                                ⚡ {e.triggerLabel}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-2 pr-2 text-xs">
                            {e.weatherCondition ? (
                              <p>
                                {WEATHER_LABEL[e.weatherCondition]}
                                {e.temperatureCelsius !== null
                                  ? `, ${e.temperatureCelsius} °C`
                                  : ""}
                              </p>
                            ) : null}
                            {totalH > 0 ? (
                              <p className="font-mono mt-1">
                                {totalH} h
                                {e.staffHoursOwn !== null &&
                                e.staffHoursSubcontractors !== null
                                  ? ` (${e.staffHoursOwn}+${e.staffHoursSubcontractors})`
                                  : ""}
                              </p>
                            ) : null}
                            {e.equipment ? (
                              <p className="font-mono text-[10px] mt-1 text-[color:var(--color-fg-muted)]">
                                {e.equipment}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-2 pr-2">
                            <p className="text-sm leading-snug whitespace-pre-wrap">
                              {e.text}
                            </p>
                            {e.suggestion ? (
                              <p className="text-[11px] italic text-[color:var(--color-fg-muted)] mt-1 border-l border-[color:var(--color-fg-muted)] pl-2">
                                Empfehlung: {e.suggestion}
                              </p>
                            ) : null}
                            {e.attachmentRefs ? (
                              <p className="font-mono text-[10px] text-[color:var(--color-fg-muted)] mt-1">
                                Anlagen: {e.attachmentRefs}
                              </p>
                            ) : null}
                          </td>
                          <td className="py-2 text-xs text-right text-[color:var(--color-fg-muted)]">
                            {e.authorName}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </section>
            );
          })}
        </div>
      )}

      <footer className="mt-8 pt-4 border-t border-black/30 text-[11px] text-[color:var(--color-fg-muted)] font-mono">
        <p>
          Erstellt am {new Date().toLocaleString("de-DE")} · Workspace „{workspace.name}“
        </p>
        <p className="mt-1">
          Information, keine Rechtsberatung i.S.d. RDG. Bautagebuch geführt nach
          § 4 Abs. 5 VOB/B.
        </p>
      </footer>
    </div>
  );
}

function FactInline({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p className="text-sm font-medium text-[color:var(--color-fg)]">{children}</p>
    </div>
  );
}

