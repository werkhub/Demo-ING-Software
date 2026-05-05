/**
 * Integrations-Test für die Witterungs-Pipeline.
 *
 * Läuft gegen die echte SQLite-DB (./data/lexbau.db). Legt einen isolierten
 * Workspace + Projekt + Bautagebuch-Eintrag an, ruft die Pipeline mit
 * mock-fetch, prüft den DB-Roundtrip und räumt am Ende wieder auf.
 *
 * Skipped, falls die DB nicht initialisiert ist (z. B. CI-Cold-Start ohne
 * vorigen `npm run db:apply`).
 */
import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import { enrichEntryWithWeather } from "./witterung-pipeline";

const MOCK_FETCH_OK = (snapshotJson: object) => {
  return async () =>
    new Response(JSON.stringify(snapshotJson), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
};

const FROST_PAYLOAD = {
  daily: {
    time: ["2025-12-15"],
    temperature_2m_min: [-9.5],
    temperature_2m_max: [-3.2],
    precipitation_sum: [0],
    wind_speed_10m_max: [12],
  },
};

const HARMLOSS_PAYLOAD = {
  daily: {
    time: ["2025-06-15"],
    temperature_2m_min: [12],
    temperature_2m_max: [20],
    precipitation_sum: [1],
    wind_speed_10m_max: [10],
  },
};

let workspaceId: string;
let projectId: string;
let dbAvailable = true;

beforeAll(async () => {
  workspaceId = genId("ws_test_witterung");
  projectId = genId("p_test_witterung");
  try {
    await db.insert(schema.workspaces).values({
      id: workspaceId,
      name: "Test Witterung Workspace",
    });
    await db.insert(schema.projects).values({
      id: projectId,
      workspaceId,
      identifier: "TEST-WTR-01",
      name: "Witterung-Testprojekt",
      ag: "Test-AG",
      value: 100_000,
      lat: 48.137,
      lon: 11.575,
    });
  } catch (e) {
    dbAvailable = false;
    console.warn("DB nicht verfügbar — Tests werden übersprungen:", e);
  }
});

afterAll(async () => {
  if (!dbAvailable) return;
  // Cascade über workspace räumt projects, bautagebuch_entries, behinderungen,
  // bautagebuch_fotos und vorgaenge mit ab.
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));
});

describe("enrichEntryWithWeather (DB-Roundtrip)", () => {
  it("aktualisiert Wetter-Felder bei harmlosem Wetter ohne Behinderung", async () => {
    if (!dbAvailable) return;
    const eintragId = genId("bt_test");
    await db.insert(schema.bautagebuchEntries).values({
      id: eintragId,
      workspaceId,
      projectId,
      authorName: "Test-Autor",
      entryDate: "2025-06-15",
      text: "Test-Eintrag für Witterungs-Pipeline (harmlos).",
    });

    const result = await enrichEntryWithWeather(eintragId, workspaceId, {
      fetchImpl: MOCK_FETCH_OK(HARMLOSS_PAYLOAD) as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.weather.tempMax).toBe(20);
    expect(result.behinderungId).toBeNull();
    expect(result.vorgangId).toBeNull();

    const [updated] = await db
      .select()
      .from(schema.bautagebuchEntries)
      .where(eq(schema.bautagebuchEntries.id, eintragId))
      .limit(1);
    expect(updated.weatherTempMax).toBe(20);
    expect(updated.weatherSource).toBe("api");
    expect(updated.weatherFetchedAt).toBeInstanceOf(Date);
  });

  it("erkennt Frost und legt Behinderung + Vorgang an", async () => {
    if (!dbAvailable) return;
    const eintragId = genId("bt_test_frost");
    await db.insert(schema.bautagebuchEntries).values({
      id: eintragId,
      workspaceId,
      projectId,
      authorName: "Test-Autor",
      entryDate: "2025-12-15",
      text: "Test-Eintrag für Frost-Erkennung.",
    });

    const result = await enrichEntryWithWeather(eintragId, workspaceId, {
      fetchImpl: MOCK_FETCH_OK(FROST_PAYLOAD) as unknown as typeof fetch,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.behinderungId).not.toBeNull();
    expect(result.vorgangId).not.toBeNull();

    const beh = await db
      .select()
      .from(schema.behinderungen)
      .where(
        and(
          eq(schema.behinderungen.workspaceId, workspaceId),
          eq(schema.behinderungen.eintragId, eintragId)
        )
      );
    expect(beh).toHaveLength(1);
    expect(beh[0].art).toBe("frost");
    expect(beh[0].schwellwertText).toMatch(/Tagestief/);
  });

  it("ist idempotent: zweiter Aufruf legt keinen neuen Vorgang an", async () => {
    if (!dbAvailable) return;
    const eintragId = genId("bt_test_idem");
    await db.insert(schema.bautagebuchEntries).values({
      id: eintragId,
      workspaceId,
      projectId,
      authorName: "Test-Autor",
      entryDate: "2025-12-15",
      text: "Idempotenz-Test.",
    });

    const r1 = await enrichEntryWithWeather(eintragId, workspaceId, {
      fetchImpl: MOCK_FETCH_OK(FROST_PAYLOAD) as unknown as typeof fetch,
    });
    expect(r1.ok && r1.vorgangId).toBeTruthy();

    const r2 = await enrichEntryWithWeather(eintragId, workspaceId, {
      fetchImpl: MOCK_FETCH_OK(FROST_PAYLOAD) as unknown as typeof fetch,
    });
    expect(r2.ok).toBe(true);
    if (!r2.ok) return;
    // Behinderung ist dieselbe, Vorgang wird nicht erneut angelegt
    expect(r2.behinderungId).toBe(r1.ok ? r1.behinderungId : null);
    expect(r2.vorgangId).toBeNull();
  });

  it("liefert Fehler wenn Projekt keine Koordinaten hat", async () => {
    if (!dbAvailable) return;
    // Projekt ohne lat/lon
    const wsLocal = genId("ws_no_geo");
    const pLocal = genId("p_no_geo");
    await db
      .insert(schema.workspaces)
      .values({ id: wsLocal, name: "Test ohne Geo" });
    await db.insert(schema.projects).values({
      id: pLocal,
      workspaceId: wsLocal,
      identifier: "NOGEO-01",
      name: "Ohne Koordinaten",
      ag: "Test",
      value: 1,
    });
    const eintragId = genId("bt_nogeo");
    await db.insert(schema.bautagebuchEntries).values({
      id: eintragId,
      workspaceId: wsLocal,
      projectId: pLocal,
      authorName: "Test",
      entryDate: "2025-06-15",
      text: "Ohne Koordinaten.",
    });

    const result = await enrichEntryWithWeather(eintragId, wsLocal, {
      fetchImpl: MOCK_FETCH_OK(HARMLOSS_PAYLOAD) as unknown as typeof fetch,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/Koordinaten/);

    await db.delete(schema.workspaces).where(eq(schema.workspaces.id, wsLocal));
  });

  it("speichert Foto-Eintrag in bautagebuch_fotos (Roundtrip)", async () => {
    if (!dbAvailable) return;
    const eintragId = genId("bt_test_foto");
    await db.insert(schema.bautagebuchEntries).values({
      id: eintragId,
      workspaceId,
      projectId,
      authorName: "Test",
      entryDate: "2025-06-15",
      text: "Foto-Test.",
    });
    const fotoId = genId("bf");
    await db.insert(schema.bautagebuchFotos).values({
      id: fotoId,
      workspaceId,
      eintragId,
      projektId: projectId,
      filename: "mangel.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 12345,
      storagePath: "storage/test/foo.jpg",
      caption: "Test-Caption",
    });
    const fotos = await db
      .select()
      .from(schema.bautagebuchFotos)
      .where(eq(schema.bautagebuchFotos.eintragId, eintragId));
    expect(fotos).toHaveLength(1);
    expect(fotos[0].filename).toBe("mangel.jpg");
    expect(fotos[0].mimeType).toBe("image/jpeg");
  });
});
