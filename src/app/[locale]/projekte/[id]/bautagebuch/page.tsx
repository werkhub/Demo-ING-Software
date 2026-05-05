import { Link } from "@/i18n/navigation";
import Image from "next/image";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { formatDateShort } from "@/lib/utils";
import {
  CATEGORY_LABEL,
  WEATHER_LABEL,
} from "@/app/[locale]/bautagebuch/constants";
import { BEHINDERUNG_ART_LABEL } from "@/lib/bautagebuch/witterung-detection";
import { WetterSyncButton } from "./wetter-sync-button";
import { FotoUploadForm } from "./foto-upload-form";
import { deleteBautagebuchFoto } from "./actions";

export const dynamic = "force-dynamic";

export default async function ProjektBautagebuchSeite({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const workspaceId = await getCurrentWorkspaceId();

  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, id),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) notFound();

  const entries = await db
    .select()
    .from(schema.bautagebuchEntries)
    .where(
      and(
        eq(schema.bautagebuchEntries.workspaceId, workspaceId),
        eq(schema.bautagebuchEntries.projectId, id)
      )
    )
    .orderBy(desc(schema.bautagebuchEntries.entryDate));

  const entryIds = entries.map((e) => e.id);

  const fotos =
    entryIds.length === 0
      ? []
      : await db
          .select()
          .from(schema.bautagebuchFotos)
          .where(
            and(
              eq(schema.bautagebuchFotos.workspaceId, workspaceId),
              inArray(schema.bautagebuchFotos.eintragId, entryIds)
            )
          )
          .orderBy(asc(schema.bautagebuchFotos.createdAt));

  const offeneBehinderungen = await db
    .select()
    .from(schema.behinderungen)
    .where(
      and(
        eq(schema.behinderungen.workspaceId, workspaceId),
        eq(schema.behinderungen.projektId, id),
        eq(schema.behinderungen.ankuendigungVersendet, false),
        or(
          isNull(schema.behinderungen.bisDatum),
          gte(schema.behinderungen.bisDatum, isoToday(-30))
        )
      )
    )
    .orderBy(desc(schema.behinderungen.vonDatum));

  const fotosByEntry = new Map<string, typeof fotos>();
  for (const f of fotos) {
    const list = fotosByEntry.get(f.eintragId) ?? [];
    list.push(f);
    fotosByEntry.set(f.eintragId, list);
  }

  const hasCoordinates = project.lat !== null && project.lon !== null;

  return (
    <Container>
      <section className="pt-14 pb-6">
        <Link
          href={`/projekte/${id}`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← {project.identifier} · {project.name}
        </Link>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
          Bautagebuch · Witterung & Fotos
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-fg-muted)]">
          Tagesweise Beweisführung — strukturierte Wetter-Werte aus Open-Meteo,
          Foto-Anhänge zur Schadensdokumentation, automatische Erkennung
          witterungsbedingter Behinderungen nach § 6 Abs. 1 VOB/B.
        </p>
      </section>

      {!hasCoordinates ? (
        <section className="mb-6 rounded-md border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] px-4 py-3 text-sm text-[color:var(--color-warning)]">
          Projekt hat noch keine Geo-Koordinaten. Wetter-Sync ist deaktiviert.
          {" "}
          <Link
            href={`/projekte/${id}/edit`}
            className="font-medium underline hover:text-[color:var(--color-fg)] transition-colors"
          >
            Koordinaten am Projekt ergänzen →
          </Link>
        </section>
      ) : null}

      {offeneBehinderungen.length > 0 ? (
        <section className="mb-8 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-critical)] mb-2">
            ⚠ {offeneBehinderungen.length} offene Witterungsbehinderung
            {offeneBehinderungen.length === 1 ? "" : "en"} · noch nicht angezeigt
          </p>
          <ul className="space-y-1.5">
            {offeneBehinderungen.map((b) => (
              <li
                key={b.id}
                className="flex items-baseline gap-3 text-sm text-[color:var(--color-critical)]"
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] shrink-0">
                  {formatDateShort(b.vonDatum)}
                </span>
                <span className="font-medium">{BEHINDERUNG_ART_LABEL[b.art]}</span>
                <span className="text-[color:var(--color-fg-muted)]">·</span>
                <span className="text-[color:var(--color-fg-muted)] truncate">
                  {b.schwellwertText}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href={`/anzeigen/new?projectId=${id}&kind=behinderung`}
            className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-critical)] hover:underline"
          >
            → Behinderungs-Anzeige nach § 6 VOB/B erzeugen
          </Link>
        </section>
      ) : null}

      {entries.length === 0 ? (
        <section className="py-12 text-center">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Noch keine Bautagebuch-Einträge zu diesem Projekt.
          </p>
          <Link
            href="/bautagebuch"
            className="mt-3 inline-block text-sm text-[color:var(--color-accent)] hover:underline"
          >
            Eintrag im globalen Bautagebuch anlegen →
          </Link>
        </section>
      ) : (
        <ul className="space-y-8 pb-16">
          {entries.map((e) => {
            const eFotos = fotosByEntry.get(e.id) ?? [];
            return (
              <li
                key={e.id}
                className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg)] p-5"
              >
                <div className="flex items-baseline justify-between gap-3 flex-wrap mb-4">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg)] font-medium">
                      {formatDateShort(e.entryDate)}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                      {e.authorName} ·{" "}
                      <span className="font-mono">{CATEGORY_LABEL[e.category]}</span>
                    </p>
                  </div>
                  <Link
                    href={`/bautagebuch/${e.id}/edit`}
                    className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
                  >
                    Eintrag bearbeiten →
                  </Link>
                </div>

                <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4">
                  {e.text}
                </p>

                <WetterPanel
                  entry={e}
                  hasCoordinates={hasCoordinates}
                  projectId={id}
                />

                <FotoPanel eintragId={e.id} fotos={eFotos} />
              </li>
            );
          })}
        </ul>
      )}
    </Container>
  );
}

function WetterPanel({
  entry,
  hasCoordinates,
  projectId,
}: {
  entry: typeof schema.bautagebuchEntries.$inferSelect;
  hasCoordinates: boolean;
  projectId: string;
}) {
  const hasApiData =
    entry.weatherTempMin !== null ||
    entry.weatherTempMax !== null ||
    entry.weatherPrecipitationMm !== null ||
    entry.weatherWindKmh !== null;

  return (
    <div className="border-t border-[color:var(--color-border)] pt-3 mb-4">
      <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Witterung
          {entry.weatherSource ? (
            <span className="ml-2 normal-case tracking-normal text-[color:var(--color-fg-muted)]">
              · Quelle:{" "}
              <span className="text-[color:var(--color-fg)]">
                {entry.weatherSource === "api" ? "Open-Meteo" : "manuell"}
              </span>
              {entry.weatherFetchedAt ? (
                <span> · {formatDateShort(entry.weatherFetchedAt.toISOString().slice(0, 10))}</span>
              ) : null}
            </span>
          ) : null}
        </p>
        <WetterSyncButton
          eintragId={entry.id}
          projectId={projectId}
          hasCoordinates={hasCoordinates}
          source={entry.weatherSource}
        />
      </div>

      {hasApiData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Stat label="Tagestief" value={fmtTemp(entry.weatherTempMin)} />
          <Stat label="Tageshöchst" value={fmtTemp(entry.weatherTempMax)} />
          <Stat label="Niederschlag" value={fmtMm(entry.weatherPrecipitationMm)} />
          <Stat label="Spitzenwind" value={fmtWind(entry.weatherWindKmh)} />
        </div>
      ) : (
        <p className="text-xs text-[color:var(--color-fg-muted)] italic">
          {entry.weatherCondition
            ? `Manuell: ${WEATHER_LABEL[entry.weatherCondition]}${entry.temperatureCelsius !== null ? ` · ${entry.temperatureCelsius} °C` : ""}`
            : "Noch keine Wetter-Werte erfasst."}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[color:var(--color-border)] rounded-sm px-3 py-2 bg-[color:var(--color-bg-subtle)]">
      <p className="font-mono text-[9px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

function fmtTemp(n: number | null): string {
  if (n === null) return "—";
  return `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })} °C`;
}
function fmtMm(n: number | null): string {
  if (n === null) return "—";
  return `${n.toLocaleString("de-DE", { maximumFractionDigits: 1 })} mm`;
}
function fmtWind(n: number | null): string {
  if (n === null) return "—";
  return `${n.toLocaleString("de-DE", { maximumFractionDigits: 0 })} km/h`;
}

function FotoPanel({
  eintragId,
  fotos,
}: {
  eintragId: string;
  fotos: (typeof schema.bautagebuchFotos.$inferSelect)[];
}) {
  return (
    <div className="border-t border-[color:var(--color-border)] pt-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-2">
        Fotos · {fotos.length}
      </p>
      {fotos.length > 0 ? (
        <ul className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {fotos.map((f) => (
            <li
              key={f.id}
              className="group relative border border-[color:var(--color-border)] rounded-md overflow-hidden bg-[color:var(--color-bg-subtle)]"
            >
              <a
                href={`/api/uploads/bautagebuch/${f.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block aspect-[4/3] relative"
              >
                <Image
                  src={`/api/uploads/bautagebuch/${f.id}`}
                  alt={f.caption || f.filename}
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="(min-width: 768px) 25vw, 50vw"
                />
              </a>
              <div className="px-2 py-1.5">
                <p className="text-[11px] truncate" title={f.filename}>
                  {f.caption || f.filename}
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-0.5">
                  {formatBytes(f.sizeBytes)}
                </p>
              </div>
              <form
                action={deleteBautagebuchFoto}
                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <input type="hidden" name="id" value={f.id} />
                <button
                  type="submit"
                  aria-label="Foto löschen"
                  className="text-[10px] bg-[color:var(--color-bg)]/80 hover:bg-[color:var(--color-critical)] hover:text-white rounded-full w-6 h-6"
                >
                  ✕
                </button>
              </form>
            </li>
          ))}
        </ul>
      ) : null}
      <FotoUploadForm eintragId={eintragId} />
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} KB`;
  return `${Math.round(n / (1024 * 102.4)) / 10} MB`;
}

function isoToday(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}
