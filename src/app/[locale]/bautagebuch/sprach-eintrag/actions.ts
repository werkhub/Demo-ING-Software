"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, desc, eq, gte } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { genId } from "@/lib/utils";
import type {
  KnownLieferant,
  KnownPerson,
  OpenAnordnung,
  OpenBedenken,
  ProjectVoiceContext,
  RecentEntrySnippet,
} from "@/lib/bautagebuch/voice-types";

type VoicePayload = {
  projectId: string;
  authorName: string;
  entryDate: string;
  category:
    | "allgemein"
    | "anordnung"
    | "behinderung"
    | "mangel"
    | "bedenken"
    | "lieferung"
    | "besichtigung"
    | "personal";
  urgency: "info" | "warning" | "critical";
  weatherCondition:
    | ""
    | "sonnig"
    | "bewoelkt"
    | "regen"
    | "schnee"
    | "frost"
    | "sturm"
    | "nebel";
  temperatureCelsius: number | "";
  staffHoursOwn: number | "";
  staffHoursSubcontractors: number | "";
  text: string;
  anwesende: unknown[];
  arbeiten: unknown[];
  lieferungen: unknown[];
  anordnungen: unknown[];
  vorfaelle: unknown[];
  bedenken: string[];
  behinderungen: string[];
  photoFilenames: string[];
  gpsLat: number | null;
  gpsLon: number | null;
  signedBy: string;
};

export async function createBautagebuchEntryFromVoice(
  formData: FormData
): Promise<void> {
  const raw = String(formData.get("payload") ?? "");
  const signedAtClientIso = String(formData.get("signedAtClientIso") ?? "");
  if (!raw) throw new Error("payload fehlt.");

  let payload: VoicePayload;
  try {
    payload = JSON.parse(raw) as VoicePayload;
  } catch {
    throw new Error("Ungültiges payload-JSON.");
  }

  if (!payload.text || payload.text.trim().length < 5) {
    throw new Error("Eintrag ist zu kurz.");
  }
  if (!payload.signedBy || !payload.signedBy.trim()) {
    throw new Error("Signatur-Name fehlt.");
  }

  const [workspaceId, userId] = await Promise.all([
    getCurrentWorkspaceId(),
    getCurrentUserId(),
  ]);

  // Projekt validieren
  let projectId: string | null = null;
  if (payload.projectId) {
    const [proj] = await db
      .select({ id: schema.projects.id })
      .from(schema.projects)
      .where(
        and(
          eq(schema.projects.id, payload.projectId),
          eq(schema.projects.workspaceId, workspaceId)
        )
      )
      .limit(1);
    if (!proj) throw new Error("Projekt nicht gefunden.");
    projectId = proj.id;
  }

  // Hash über alle Inhalts-Felder bilden — zur Manipulationserkennung.
  // Sortierte JSON-Serialisierung damit der Hash deterministisch ist.
  const snapshot = JSON.stringify(
    {
      text: payload.text,
      entryDate: payload.entryDate,
      authorName: payload.authorName,
      category: payload.category,
      weather: {
        condition: payload.weatherCondition || null,
        temperature: payload.temperatureCelsius === "" ? null : payload.temperatureCelsius,
      },
      staff: {
        own: payload.staffHoursOwn === "" ? null : payload.staffHoursOwn,
        subs: payload.staffHoursSubcontractors === "" ? null : payload.staffHoursSubcontractors,
      },
      anwesende: payload.anwesende,
      arbeiten: payload.arbeiten,
      lieferungen: payload.lieferungen,
      anordnungen: payload.anordnungen,
      vorfaelle: payload.vorfaelle,
      bedenken: payload.bedenken,
      behinderungen: payload.behinderungen,
      photos: payload.photoFilenames,
      gps: payload.gpsLat != null && payload.gpsLon != null ? [payload.gpsLat, payload.gpsLon] : null,
      signedBy: payload.signedBy,
      signedAt: signedAtClientIso || null,
    },
    Object.keys({}).sort()
  );

  const hash = createHash("sha256").update(snapshot).digest("hex");

  const id = genId("bt");

  await db.insert(schema.bautagebuchEntries).values({
    id,
    workspaceId,
    projectId,
    authorId: userId,
    authorName: payload.authorName || "Bauleitung",
    entryDate: payload.entryDate,
    category: payload.category,
    text: payload.text,
    weatherCondition: payload.weatherCondition || null,
    temperatureCelsius:
      payload.temperatureCelsius === ""
        ? null
        : Math.round(Number(payload.temperatureCelsius)),
    weatherSource: "manual",
    staffHoursOwn:
      payload.staffHoursOwn === "" ? null : Number(payload.staffHoursOwn),
    staffHoursSubcontractors:
      payload.staffHoursSubcontractors === ""
        ? null
        : Number(payload.staffHoursSubcontractors),
    urgency: payload.urgency,
    anwesendeJson: JSON.stringify(payload.anwesende ?? []),
    arbeitenJson: JSON.stringify(payload.arbeiten ?? []),
    lieferungenJson: JSON.stringify(payload.lieferungen ?? []),
    anordnungenJson: JSON.stringify(payload.anordnungen ?? []),
    vorfaelleJson: JSON.stringify(payload.vorfaelle ?? []),
    signatureHash: hash,
    signedAt: signedAtClientIso ? new Date(signedAtClientIso) : new Date(),
    signedBy: payload.signedBy.trim(),
    locked: true,
    gpsLat: payload.gpsLat,
    gpsLon: payload.gpsLon,
    photoCount: payload.photoFilenames.length,
    source: "voice",
  });

  revalidatePath("/bautagebuch");
  if (projectId) revalidatePath(`/projekte/${projectId}`);
  redirect(`/bautagebuch?signed=${id}`);
}

/* =============================================================================
 * Projekt-Kontext-Loader für die Sprach-Erfassung.
 * Liefert: letzte 5 Einträge, bekannte Personen (NU-Stamm + 30d-Historie),
 * bekannte Lieferanten + Lieferschein-Nrs, offene Anordnungen, offene Bedenken,
 * erwartete Gewerke aus Projekt-Status. Alles in einem Roundtrip.
 * ============================================================================= */

const EXPECTED_GEWERKE_BY_STATUS: Record<string, string[]> = {
  Geplant: ["Erdarbeiten"],
  Bauphase: [
    "Rohbau / Beton",
    "Mauerarbeiten",
    "Trockenbau",
    "Estrich",
    "Elektro",
    "Sanitär",
    "Heizung",
    "TGA",
    "Dach",
    "Fassade",
    "Fenster / Türen",
    "Maler-/Lackier",
    "Fliesenarbeiten",
    "Erdarbeiten",
  ],
  Abnahme: ["Maler-/Lackier", "Fliesenarbeiten", "Fenster / Türen"],
  Gewährleistung: [],
  Abgeschlossen: [],
};

function safeJsonArray(json: string | null | undefined): unknown[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function loadVoiceProjectContext(
  projectId: string
): Promise<ProjectVoiceContext | null> {
  const workspaceId = await getCurrentWorkspaceId();
  if (!projectId) return null;

  // 1. Projekt verifizieren + Stammdaten
  const [proj] = await db
    .select({
      id: schema.projects.id,
      status: schema.projects.status,
      siteAddress: schema.projects.siteAddress,
      lat: schema.projects.lat,
      lon: schema.projects.lon,
    })
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.id, projectId),
        eq(schema.projects.workspaceId, workspaceId)
      )
    )
    .limit(1);
  if (!proj) return null;

  // 2. Letzte BTB-Einträge (max 30, davon zeigen wir 5; Rest dient als Historien-
  //    Quelle für Personen/Lieferanten-Extraktion)
  const since30d = new Date();
  since30d.setDate(since30d.getDate() - 30);

  const recentRows = await db
    .select({
      id: schema.bautagebuchEntries.id,
      entryDate: schema.bautagebuchEntries.entryDate,
      category: schema.bautagebuchEntries.category,
      urgency: schema.bautagebuchEntries.urgency,
      text: schema.bautagebuchEntries.text,
      authorName: schema.bautagebuchEntries.authorName,
      anwesendeJson: schema.bautagebuchEntries.anwesendeJson,
      lieferungenJson: schema.bautagebuchEntries.lieferungenJson,
      anordnungenJson: schema.bautagebuchEntries.anordnungenJson,
    })
    .from(schema.bautagebuchEntries)
    .where(
      and(
        eq(schema.bautagebuchEntries.workspaceId, workspaceId),
        eq(schema.bautagebuchEntries.projectId, projectId),
        gte(schema.bautagebuchEntries.createdAt, since30d)
      )
    )
    .orderBy(desc(schema.bautagebuchEntries.createdAt))
    .limit(30);

  const recentEntries: RecentEntrySnippet[] = recentRows.slice(0, 5).map((r) => ({
    id: r.id,
    entryDate: r.entryDate,
    category: r.category,
    urgency: r.urgency,
    textSnippet: r.text.slice(0, 140) + (r.text.length > 140 ? "…" : ""),
    authorName: r.authorName,
  }));

  // 3. NU-Stammdaten des Projekts → bekannte Personen (subcontractor-Quelle)
  const subRows = await db
    .select({
      name: schema.subcontractors.name,
      organization: schema.subcontractors.organization,
      gewerk: schema.subcontractors.gewerk,
    })
    .from(schema.subcontractors)
    .where(
      and(
        eq(schema.subcontractors.workspaceId, workspaceId),
        eq(schema.subcontractors.projectId, projectId)
      )
    );

  const personMap = new Map<string, KnownPerson>();
  for (const s of subRows) {
    const key = (s.organization || s.name).toLowerCase();
    personMap.set(key, {
      name: s.organization || s.name,
      funktion: s.gewerk,
      firma: s.organization || s.name,
      source: "subcontractor",
      occurrences: 0,
    });
  }

  // 4. Personen aus Historie extrahieren (anwesendeJson der letzten 30d)
  const lieferantMap = new Map<string, KnownLieferant>();
  for (const r of recentRows) {
    const anwArr = safeJsonArray(r.anwesendeJson) as Array<{
      name?: unknown;
      firma?: unknown;
      funktion?: unknown;
    }>;
    for (const p of anwArr) {
      const name = typeof p.name === "string" ? p.name : null;
      if (!name) continue;
      const key = name.toLowerCase();
      const ex = personMap.get(key);
      if (ex) {
        ex.occurrences += 1;
      } else {
        personMap.set(key, {
          name,
          firma: typeof p.firma === "string" ? p.firma : undefined,
          funktion: typeof p.funktion === "string" ? p.funktion : undefined,
          source: "history",
          occurrences: 1,
        });
      }
    }

    // Lieferanten + Lieferschein-Nrs sammeln
    const liefArr = safeJsonArray(r.lieferungenJson) as Array<{
      lieferant?: unknown;
      lieferscheinNr?: unknown;
    }>;
    for (const l of liefArr) {
      const lname = typeof l.lieferant === "string" ? l.lieferant : null;
      if (!lname || lname === "—") continue;
      const lkey = lname.toLowerCase();
      const ex = lieferantMap.get(lkey);
      const ls = typeof l.lieferscheinNr === "string" ? l.lieferscheinNr : null;
      if (ex) {
        ex.occurrences += 1;
        if (ls && !ex.knownLieferscheinNrs.includes(ls)) {
          ex.knownLieferscheinNrs.push(ls);
        }
      } else {
        lieferantMap.set(lkey, {
          name: lname,
          knownLieferscheinNrs: ls ? [ls] : [],
          occurrences: 1,
        });
      }
    }
  }

  const knownPersons = Array.from(personMap.values()).sort(
    (a, b) => b.occurrences - a.occurrences
  );
  const knownLieferanten = Array.from(lieferantMap.values()).sort(
    (a, b) => b.occurrences - a.occurrences
  );

  // 5. Offene Anordnungen — Heuristik: alle Anordnungen ohne gesetzten Vorbehalt
  //    aus den letzten 14 Tagen gelten als „offen / Folge-Up nötig".
  const since14d = new Date();
  since14d.setDate(since14d.getDate() - 14);
  const openAnordnungen: OpenAnordnung[] = [];
  const openBedenken: OpenBedenken[] = [];
  for (const r of recentRows) {
    if (new Date(r.entryDate + "T00:00:00") < since14d) continue;
    const aArr = safeJsonArray(r.anordnungenJson) as Array<{
      beschreibung?: unknown;
      mehrkostenVorbehaltGesetzt?: unknown;
      mehrkostenVorbehaltErforderlich?: unknown;
    }>;
    for (const a of aArr) {
      if (typeof a.beschreibung !== "string") continue;
      const erforderlich = a.mehrkostenVorbehaltErforderlich === true;
      const gesetzt = a.mehrkostenVorbehaltGesetzt === true;
      if (erforderlich && !gesetzt) {
        openAnordnungen.push({
          entryId: r.id,
          entryDate: r.entryDate,
          beschreibung: a.beschreibung,
          vorbehaltGesetzt: gesetzt,
        });
      }
    }
    // Bedenken aus dem Freitext suchen (kein eigenes JSON in der Tabelle)
    const matches = r.text.match(/Bedenken[^.!?\n]{5,200}[.!?]/gi);
    if (matches) {
      for (const m of matches) {
        openBedenken.push({
          entryId: r.id,
          entryDate: r.entryDate,
          text: m.trim(),
        });
      }
    }
  }

  return {
    projectId,
    projectStatus: proj.status,
    siteAddress: proj.siteAddress,
    lat: proj.lat,
    lon: proj.lon,
    recentEntries,
    knownPersons,
    knownLieferanten,
    openAnordnungen: openAnordnungen.slice(0, 10),
    openBedenken: openBedenken.slice(0, 10),
    expectedGewerke: EXPECTED_GEWERKE_BY_STATUS[proj.status] ?? [],
  };
}
