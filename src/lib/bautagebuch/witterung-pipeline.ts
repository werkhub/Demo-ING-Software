/**
 * Server-Helfer: Wetter-Daten am Bautagebuch-Eintrag persistieren und bei
 * Schwellen-Verletzung eine Behinderung + Vorgang anlegen.
 *
 * Bewusst ohne "server-only" und ohne Next-Hooks — wird aus der Server-Action
 * (mit revalidatePath() drumherum) und aus Tests aufgerufen.
 */
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import { fetchWeather, type WeatherSnapshot } from "@/lib/wetter/open-meteo";
import {
  detectWitterungsbehinderung,
  inferWeatherCondition,
  BEHINDERUNG_ART_LABEL,
} from "./witterung-detection";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";

/** Konstanten — auch in der UI/Reminder-Schicht referenziert. */
export const WITTERUNG_AUTO_VORGANG_MARKER = "[auto-vorgang-witterung:";
export const WITTERUNG_LEGAL_BASIS = "§ 6 Abs. 1 VOB/B";

export type EnrichResult =
  | { ok: true; weather: WeatherSnapshot; behinderungId: string | null; vorgangId: string | null }
  | { ok: false; reason: string };

/**
 * Holt das Wetter für (Eintrag.entryDate, Projekt.lat/lon), persistiert die
 * Werte und prüft die Schwellen. Bei Treffer: legt Behinderungs-Eintrag an,
 * setzt Idempotenz-Marker im Bautagebuch-Notes-Feld (im `equipment`-Feld
 * existiert kein Notes — wir setzen den Marker in `suggestion`, das ohnehin
 * vom Trigger befüllt wird), und erzeugt einen Vorgang.
 *
 * Idempotenz: Wenn der Marker bereits gesetzt ist, wird kein neuer Vorgang
 * angelegt — Wetter-Werte werden trotzdem aktualisiert (Re-Sync OK).
 */
export async function enrichEntryWithWeather(
  eintragId: string,
  workspaceId: string,
  opts: {
    userId?: string | null;
    fetchImpl?: typeof fetch;
  } = {}
): Promise<EnrichResult> {
  const [entry] = await db
    .select()
    .from(schema.bautagebuchEntries)
    .where(
      and(
        eq(schema.bautagebuchEntries.id, eintragId),
        eq(schema.bautagebuchEntries.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!entry) return { ok: false, reason: "Eintrag nicht gefunden." };
  if (!entry.projectId) {
    return { ok: false, reason: "Eintrag ohne Projekt — Standort unklar." };
  }
  const [project] = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, entry.projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!project) return { ok: false, reason: "Projekt nicht gefunden." };
  if (project.lat === null || project.lon === null) {
    return {
      ok: false,
      reason: "Projekt hat keine Koordinaten (lat/lon). Bitte am Projekt ergänzen.",
    };
  }

  let weather: WeatherSnapshot;
  try {
    weather = await fetchWeather(
      project.lat,
      project.lon,
      entry.entryDate,
      opts.fetchImpl
    );
  } catch (e) {
    return {
      ok: false,
      reason: `Wetter-API: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  const inferredCondition = inferWeatherCondition({
    tempMin: weather.tempMin,
    tempMax: weather.tempMax,
    precipitation: weather.precipitation,
    wind: weather.wind,
  });

  await db
    .update(schema.bautagebuchEntries)
    .set({
      weatherTempMin: weather.tempMin,
      weatherTempMax: weather.tempMax,
      weatherPrecipitationMm: weather.precipitation,
      weatherWindKmh: weather.wind,
      weatherSource: "api",
      weatherFetchedAt: new Date(),
      // Strukturierte Werte schlagen manuelle UI-Auswahl nicht — wir füllen
      // weatherCondition nur, wenn noch nichts gesetzt ist.
      ...(entry.weatherCondition ? {} : { weatherCondition: inferredCondition ?? undefined }),
      updatedAt: new Date(),
    })
    .where(eq(schema.bautagebuchEntries.id, entry.id));

  const detection = detectWitterungsbehinderung({
    tempMin: weather.tempMin,
    tempMax: weather.tempMax,
    precipitation: weather.precipitation,
    wind: weather.wind,
  });
  if (!detection) {
    return { ok: true, weather, behinderungId: null, vorgangId: null };
  }

  // Idempotenz-Marker: bereits ein Witterungs-Vorgang für diesen Eintrag?
  const marker = `${WITTERUNG_AUTO_VORGANG_MARKER}${entry.id}]`;
  const alreadyEscalated = entry.suggestion?.includes(marker) ?? false;

  // Behinderung anlegen (auch bei alreadyEscalated, falls keine existiert —
  // pro Tag sollte aber nur eine entstehen, daher zusätzliche Idempotenz über
  // (workspace, projekt, eintrag, art).
  const [existingBeh] = await db
    .select({ id: schema.behinderungen.id })
    .from(schema.behinderungen)
    .where(
      and(
        eq(schema.behinderungen.workspaceId, workspaceId),
        eq(schema.behinderungen.eintragId, entry.id),
        eq(schema.behinderungen.art, detection.art)
      )
    )
    .limit(1);

  let behinderungId: string;
  if (existingBeh) {
    behinderungId = existingBeh.id;
  } else {
    behinderungId = genId("bh");
    await db.insert(schema.behinderungen).values({
      id: behinderungId,
      workspaceId,
      projektId: entry.projectId,
      eintragId: entry.id,
      art: detection.art,
      vonDatum: entry.entryDate,
      bisDatum: entry.entryDate,
      schwellwertText: detection.schwellwertText,
      ankuendigungVersendet: false,
    });
  }

  if (alreadyEscalated) {
    return { ok: true, weather, behinderungId, vorgangId: null };
  }

  const { vorgangId } = await createVorgangFromTrigger({
    workspaceId,
    userId: opts.userId ?? null,
    source: "witterungsbehinderung_anzeige",
    title: `Witterungsbehinderung ${BEHINDERUNG_ART_LABEL[detection.art]} — ${entry.entryDate}`,
    category: "vertragspflicht",
    projectId: entry.projectId,
    dueDate: entry.entryDate, // BHA „unverzüglich" → Bearbeitung sofort fällig
    firstStep: {
      kind: "klassifikation",
      payload: {
        bautagebuchEntryId: entry.id,
        entryDate: entry.entryDate,
        behinderungArt: detection.art,
        schwellwertText: detection.schwellwertText,
        weather,
      },
      citations: [
        {
          sourceKind: "vob",
          sourceRef: WITTERUNG_LEGAL_BASIS,
          sourceText:
            "Behinderung unverzüglich schriftlich anzeigen — sonst Anspruchsverlust auf Bauzeitverlängerung.",
        },
      ],
    },
    link: { targetKind: "bautagebuch", targetId: entry.id },
    auditPayload: {
      bautagebuchEntryId: entry.id,
      behinderungArt: detection.art,
      triggeredBy: opts.userId ? "user" : "auto",
    },
  });

  // Marker in suggestion-Feld setzen
  await db
    .update(schema.bautagebuchEntries)
    .set({
      suggestion: entry.suggestion
        ? `${entry.suggestion}\n${marker}`
        : marker,
      updatedAt: new Date(),
    })
    .where(eq(schema.bautagebuchEntries.id, entry.id));

  return { ok: true, weather, behinderungId, vorgangId };
}
