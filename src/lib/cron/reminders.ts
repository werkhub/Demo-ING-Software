/**
 * Zentralisierte Reminder-Pipeline für alle Module.
 *
 * Wird vom Cron (täglich) aufgerufen. Workspace-übergreifend, OHNE
 * User-Auth-Context (kein getCurrentWorkspaceId / getCurrentUserId).
 *
 * Idempotenz: jede Reminder-Quelle nutzt einen Marker im notes-Feld
 * (`[auto-vorgang:<id>]` oder `[auto-vorgang-vertragsstrafe:<id>]`), damit
 * mehrfache Cron-Läufe pro Tag/Woche keine Duplikat-Vorgänge erzeugen.
 */
// Bewusst kein "server-only" — wird vom CLI-Script (tsx) ohne Next-Bundle
// aufgerufen. Funktion ist trotzdem nicht für Client-Imports geeignet
// (DB-Imports + Next-Cache-Hooks). Caller-Disziplin: nur aus Server-Actions
// und API-Routes verwenden.
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { createVorgangFromTrigger } from "@/lib/vorgang/create-from-trigger";
import {
  CERTIFICATE_LABELS,
  EXPIRY_WARN_DAYS,
  computeComplianceStatus,
} from "@/lib/compliance/nu";
import {
  ABNAHME_KIND_LABEL,
  vertragsstrafeAtRisk,
} from "@/lib/abnahme";
import {
  ANZEIGE_KIND_LABEL,
  ANZEIGE_LEGAL_BASIS,
  ACKNOWLEDGEMENT_WARN_DAYS,
} from "@/lib/anzeigen";
import { effectiveValidUntil, securityState } from "@/lib/sicherheiten";
import {
  ACK_DEADLINE_DAYS,
  RESPONSE_DEADLINE_DAYS,
} from "@/lib/hinschg";
import { SECURITY_LABELS, SECURITY_LEGAL_BASIS } from "@/lib/sicherheiten";
import {
  daysOfIsoWeek,
  isoWeekFromDate,
} from "@/lib/stunden";
import { monthRange, previousMonthIso } from "@/lib/steuer/bauabzug";
import { BEHINDERUNG_ART_LABEL } from "@/lib/bautagebuch/witterung-detection";
import { WITTERUNG_LEGAL_BASIS } from "@/lib/bautagebuch/witterung-pipeline";
import { LS_PRUEFEN_UEBERFAELLIG_TAGE } from "@/lib/material";
import {
  aggregateLohnByMonth,
  buildForecast,
  findEngeLiquiditaet,
  type ForecastInputAr,
  type ForecastInputNuRechnung,
} from "@/lib/liquiditaet/forecast";

const isoToday = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
};

export type ReminderResult = {
  module: string;
  workspaceId: string;
  checked: number;
  triggered: number;
  errors: string[];
};

function emptyResult(
  module: string,
  workspaceId: string
): ReminderResult {
  return { module, workspaceId, checked: 0, triggered: 0, errors: [] };
}

/* ============== NU-COMPLIANCE ============== */

export async function runNuComplianceReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("nu_compliance", workspaceId);
  const nus = await db
    .select()
    .from(schema.subcontractors)
    .where(eq(schema.subcontractors.workspaceId, workspaceId));
  result.checked = nus.length;

  for (const nu of nus) {
    if (!nu.requiresCompliance) continue;
    try {
      const certs = await db
        .select()
        .from(schema.subcontractorCertificates)
        .where(
          and(
            eq(schema.subcontractorCertificates.workspaceId, workspaceId),
            eq(schema.subcontractorCertificates.subcontractorId, nu.id)
          )
        );
      const status = computeComplianceStatus(nu, certs);
      if (status.level !== "critical") continue;
      if (nu.paymentReleaseBlocked) continue; // Marker existiert schon

      const missingLabels = status.missing
        .map((k) => CERTIFICATE_LABELS[k])
        .join(", ");
      const expiredLabels = status.expired
        .map((e) => CERTIFICATE_LABELS[e.kind])
        .join(", ");
      const summary = [
        missingLabels ? `Fehlt: ${missingLabels}` : null,
        expiredLabels ? `Abgelaufen: ${expiredLabels}` : null,
      ]
        .filter(Boolean)
        .join(" · ");

      // Sperre + Vorgang
      await db
        .update(schema.subcontractors)
        .set({ paymentReleaseBlocked: true, updatedAt: new Date() })
        .where(eq(schema.subcontractors.id, nu.id));

      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "nu_compliance",
        title: `[Cron] Compliance-Lücke ${nu.gewerk}: ${nu.name}`,
        category: "vertragspflicht",
        projectId: nu.projectId,
        dueDate: isoToday(7),
        firstStep: {
          kind: "klassifikation",
          payload: {
            subcontractorId: nu.id,
            subcontractorName: nu.name,
            missing: status.missing,
            expired: status.expired.map((e) => e.kind),
            summary,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "intern",
              sourceRef: "§ 14 AEntG",
              sourceText:
                "Generalunternehmer-Haftung Mindestlohn — bei fehlender Bescheinigung haftet der AN.",
            },
          ],
        },
        auditPayload: {
          subcontractorId: nu.id,
          missing: status.missing,
          triggeredBy: "cron",
        },
      });
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `NU ${nu.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== SICHERHEITEN ============== */

export async function runSicherheitenReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("sicherheit_ueberfaellig", workspaceId);
  const securities = await db
    .select()
    .from(schema.securities)
    .where(eq(schema.securities.workspaceId, workspaceId));
  result.checked = securities.length;

  for (const s of securities) {
    if (s.status === "freigegeben" || s.status === "verfallen") continue;
    try {
      const project = await db
        .select()
        .from(schema.projects)
        .where(eq(schema.projects.id, s.projectId))
        .limit(1)
        .then((r) => r[0]);
      if (!project) continue;

      const state = securityState(s, project);
      if (state !== "overdue") continue;

      const marker = `[auto-vorgang:${s.id}]`;
      if (s.notes?.includes(marker)) continue;

      const eff = effectiveValidUntil(s, project);
      const overdueDays =
        eff && /^\d{4}-\d{2}-\d{2}$/.test(eff)
          ? Math.max(
              0,
              Math.round(
                (Date.now() - new Date(eff).getTime()) / (1000 * 60 * 60 * 24)
              )
            )
          : 0;

      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "sicherheit_ueberfaellig",
        title: `[Cron] Sicherheit überfällig: ${SECURITY_LABELS[s.kind]} (${project.identifier})`,
        category: "vertragspflicht",
        projectId: s.projectId,
        dueDate: isoToday(7),
        firstStep: {
          kind: "klassifikation",
          payload: {
            securityId: s.id,
            kind: s.kind,
            amount: s.amount,
            validUntil: eff,
            overdueDays,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "vob",
              sourceRef: SECURITY_LEGAL_BASIS[s.kind],
              sourceText:
                "Sicherheit ist nach Wegfall des Sicherungszwecks unverzüglich zurückzugeben — § 17 VOB/B.",
            },
          ],
        },
        auditPayload: {
          securityId: s.id,
          overdueDays,
          triggeredBy: "cron",
        },
      });
      // Marker setzen
      await db
        .update(schema.securities)
        .set({
          notes: s.notes ? `${s.notes}\n${marker}` : marker,
          updatedAt: new Date(),
        })
        .where(eq(schema.securities.id, s.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Security ${s.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== ANZEIGEN (BHA-Zugang) ============== */

export async function runAnzeigenReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("bha_zugangsfrist", workspaceId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACKNOWLEDGEMENT_WARN_DAYS);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  const candidates = await db
    .select()
    .from(schema.anzeigen)
    .where(
      and(
        eq(schema.anzeigen.workspaceId, workspaceId),
        eq(schema.anzeigen.status, "versendet"),
        lte(schema.anzeigen.sentAt, cutoffIso),
        sql`${schema.anzeigen.acknowledgedAt} IS NULL`
      )
    );
  result.checked = candidates.length;

  for (const a of candidates) {
    const marker = `[auto-vorgang:${a.id}]`;
    if (a.notes?.includes(marker)) continue;
    try {
      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "bha_zugangsfrist",
        title: `[Cron] Zugangsbestätigung fehlt: ${ANZEIGE_KIND_LABEL[a.kind]} (${a.title})`,
        category: "vertragspflicht",
        projectId: a.projectId,
        dueDate: isoToday(7),
        firstStep: {
          kind: "klassifikation",
          payload: {
            anzeigeId: a.id,
            kind: a.kind,
            sentAt: a.sentAt,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "vob",
              sourceRef: ANZEIGE_LEGAL_BASIS[a.kind],
              sourceText:
                "Pflicht des AN zur unverzüglichen schriftlichen Anzeige; Zugangsnachweis ist Beweismittel.",
            },
          ],
        },
        auditPayload: {
          anzeigeId: a.id,
          ackOverdueDays: ACKNOWLEDGEMENT_WARN_DAYS,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.anzeigen)
        .set({
          notes: a.notes ? `${a.notes}\n${marker}` : marker,
          updatedAt: new Date(),
        })
        .where(eq(schema.anzeigen.id, a.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Anzeige ${a.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== MÄNGEL — FRIST ÜBERZOGEN (alle Phasen) ============== */

/**
 * Reminder für jede Phase (Ausführung/Abnahme/Gewährleistung). Ersetzt seit
 * Migration 0029 den engeren `runAbnahmeMaengelReminders`. Triggert sobald
 * `fristsetzungDatum < heute` UND status aktiv (offen/in_bearbeitung/strittig).
 */
export async function runMangelFristReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("mangel_frist_ueberzogen", workspaceId);
  const today = isoToday();

  const candidates = await db
    .select()
    .from(schema.maengel)
    .where(
      and(
        eq(schema.maengel.workspaceId, workspaceId),
        lte(schema.maengel.fristsetzungDatum, today),
        sql`${schema.maengel.status} IN ('offen', 'in_bearbeitung', 'strittig')`
      )
    );
  result.checked = candidates.length;

  for (const m of candidates) {
    if (!m.fristsetzungDatum) continue;
    const marker = `[auto-vorgang:${m.id}]`;
    if (m.notes?.includes(marker)) continue;
    try {
      const titleSnippet =
        m.beschreibung.split("\n", 1)[0]?.slice(0, 80) ?? m.id;
      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "mangel_frist_ueberzogen",
        title: `[Cron] Mangel-Frist abgelaufen: ${titleSnippet}`,
        category: "maengelruege",
        projectId: m.projectId,
        dueDate: isoToday(7),
        firstStep: {
          kind: "klassifikation",
          payload: {
            mangelId: m.id,
            phase: m.phase,
            prioritaet: m.prioritaet,
            fristsetzungDatum: m.fristsetzungDatum,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "vob",
              sourceRef: "§ 13 Abs. 5 VOB/B",
              sourceText:
                "Wird die Frist zur Mangelbeseitigung ergebnislos überschritten, kann der AG die Mängel auf Kosten des AN beseitigen lassen.",
            },
          ],
        },
        auditPayload: {
          mangelId: m.id,
          phase: m.phase,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.maengel)
        .set({
          notes: m.notes ? `${m.notes}\n${marker}` : marker,
          updatedAt: new Date(),
        })
        .where(eq(schema.maengel.id, m.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Mangel ${m.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== GEWÄHRLEISTUNG ENDET IN <= 60 TAGEN ============== */

/**
 * Triggert pro Projekt einen Vorgang, wenn `projects.warrantyEnd` zwischen
 * heute und heute+60 d liegt. Idempotent über Marker im `projects.notes`.
 */
export async function runGewaehrleistungEndReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("gewaehrleistung_endet_60d", workspaceId);
  const today = isoToday();
  const cutoff = isoToday(60);

  const candidates = await db
    .select()
    .from(schema.projects)
    .where(
      and(
        eq(schema.projects.workspaceId, workspaceId),
        sql`${schema.projects.warrantyEnd} IS NOT NULL`,
        sql`${schema.projects.warrantyEnd} >= ${today}`,
        lte(schema.projects.warrantyEnd, cutoff)
      )
    );
  result.checked = candidates.length;

  for (const p of candidates) {
    if (!p.warrantyEnd) continue;
    const marker = `[auto-vorgang-gwl:${p.id}]`;
    if (p.notes?.includes(marker)) continue;
    try {
      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "gewaehrleistung_endet_60d",
        title: `[Cron] Gewährleistung endet in 60 Tagen: ${p.identifier}`,
        category: "vertragspflicht",
        projectId: p.id,
        dueDate: p.warrantyEnd,
        firstStep: {
          kind: "klassifikation",
          payload: {
            projectId: p.id,
            warrantyEnd: p.warrantyEnd,
            contractType: p.contractType,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: p.contractType === "vob_vertrag" ? "vob" : "bgb",
              sourceRef:
                p.contractType === "vob_vertrag"
                  ? "§ 13 Abs. 4 VOB/B"
                  : "§ 634a Abs. 1 BGB",
              sourceText:
                "Verjährung der Mängelansprüche — letzte Gelegenheit zur formellen Geltendmachung.",
            },
          ],
        },
        auditPayload: {
          projectId: p.id,
          warrantyEnd: p.warrantyEnd,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.projects)
        .set({
          notes: p.notes ? `${p.notes}\n${marker}` : marker,
          updatedAt: new Date(),
        })
        .where(eq(schema.projects.id, p.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Project ${p.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== HINSCHG (Eingangsbestätigung) ============== */

export async function runHinschgAckReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("hinschg_eingangsbestaetigung", workspaceId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - ACK_DEADLINE_DAYS);

  const candidates = await db
    .select()
    .from(schema.hinschgMeldungen)
    .where(
      and(
        eq(schema.hinschgMeldungen.workspaceId, workspaceId),
        eq(schema.hinschgMeldungen.status, "eingegangen"),
        lte(schema.hinschgMeldungen.submittedAt, cutoff),
        isNull(schema.hinschgMeldungen.acknowledgedAt)
      )
    );
  result.checked = candidates.length;

  for (const m of candidates) {
    const marker = `[auto-vorgang-ack:${m.id}]`;
    if (m.internalNotes?.includes(marker)) continue;
    try {
      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "hinschg_eingangsbestaetigung",
        title: `[Cron] HinSchG: Eingangsbestätigung überfällig (${m.subject})`,
        category: "vertragspflicht",
        projectId: null,
        dueDate: isoToday(3),
        firstStep: {
          kind: "klassifikation",
          payload: {
            meldungId: m.id,
            submittedAt: m.submittedAt,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "intern",
              sourceRef: "§ 17 II HinSchG",
              sourceText:
                "Eingang einer Meldung ist binnen 7 Tagen zu bestätigen.",
            },
          ],
        },
        auditPayload: {
          meldungId: m.id,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.hinschgMeldungen)
        .set({
          internalNotes: m.internalNotes
            ? `${m.internalNotes}\n${marker}`
            : marker,
          updatedAt: new Date(),
        })
        .where(eq(schema.hinschgMeldungen.id, m.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Meldung ${m.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== HINSCHG (3-Monats-Frist) ============== */

export async function runHinschgFristReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("hinschg_dreimonats_frist", workspaceId);
  const today = isoToday();

  const candidates = await db
    .select()
    .from(schema.hinschgMeldungen)
    .where(
      and(
        eq(schema.hinschgMeldungen.workspaceId, workspaceId),
        sql`${schema.hinschgMeldungen.status} IN ('in_pruefung', 'massnahme_ergriffen')`,
        lte(schema.hinschgMeldungen.responseDeadline, today)
      )
    );
  result.checked = candidates.length;

  for (const m of candidates) {
    const marker = `[auto-vorgang-3mon:${m.id}]`;
    if (m.internalNotes?.includes(marker)) continue;
    try {
      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "hinschg_dreimonats_frist",
        title: `[Cron] HinSchG: 3-Monats-Rückmeldungs-Frist überschritten (${m.subject})`,
        category: "vertragspflicht",
        projectId: null,
        dueDate: isoToday(7),
        firstStep: {
          kind: "klassifikation",
          payload: {
            meldungId: m.id,
            responseDeadline: m.responseDeadline,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "intern",
              sourceRef: "§ 17 II HinSchG",
              sourceText: `Rückmeldung über Maßnahmen binnen ${RESPONSE_DEADLINE_DAYS} Tagen ist Pflicht.`,
            },
          ],
        },
        auditPayload: {
          meldungId: m.id,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.hinschgMeldungen)
        .set({
          internalNotes: m.internalNotes
            ? `${m.internalNotes}\n${marker}`
            : marker,
          updatedAt: new Date(),
        })
        .where(eq(schema.hinschgMeldungen.id, m.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Meldung ${m.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== ABNAHME — Vertragsstrafe-Vorbehalt fehlt ============== */

export async function runVertragsstrafeReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("vertragsstrafe_vorbehalt_fehlt", workspaceId);
  const abnahmen = await db
    .select()
    .from(schema.abnahmen)
    .where(eq(schema.abnahmen.workspaceId, workspaceId));
  result.checked = abnahmen.length;

  for (const a of abnahmen) {
    if (
      !vertragsstrafeAtRisk({
        kind: a.kind,
        vertragsstrafeAgreed: a.vertragsstrafeAgreed,
        vertragsstrafeReserved: a.vertragsstrafeReserved,
      })
    ) {
      continue;
    }
    const marker = `[auto-vorgang-vertragsstrafe:${a.id}]`;
    if (a.notes?.includes(marker)) continue;
    try {
      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "vertragsstrafe_vorbehalt_fehlt",
        title: `[Cron] Vertragsstrafe verfällt — Vorbehalt fehlt (${ABNAHME_KIND_LABEL[a.kind]})`,
        category: "vertragspflicht",
        projectId: a.projectId,
        dueDate: isoToday(0),
        firstStep: {
          kind: "klassifikation",
          payload: {
            abnahmeId: a.id,
            abnahmeDate: a.abnahmeDate,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "vob",
              sourceRef: "§ 11 Abs. 4 VOB/B",
              sourceText:
                "Hat sich der AG die Vertragsstrafe nicht spätestens bei der Abnahme vorbehalten, ist sie verwirkt.",
            },
          ],
        },
        auditPayload: {
          abnahmeId: a.id,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.abnahmen)
        .set({
          notes: a.notes ? `${a.notes}\n${marker}` : marker,
          updatedAt: new Date(),
        })
        .where(eq(schema.abnahmen.id, a.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Abnahme ${a.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== STUNDEN — Wochen-Lock fehlt (Vorwoche) ============== */

/**
 * Reminder: Vorwoche ist abgelaufen, aber nicht gesperrt obwohl Stunden
 * gebucht. Idempotent über Marker im stunden_wochen_lock-Notes wäre
 * paradox (kein Lock-Eintrag existiert ja). Stattdessen prüfen wir
 * vorgangLinks auf einen offenen Vorgang mit derselben Quelle.
 */
export async function runStundenWochenLockReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("stunden_woche_unverbucht", workspaceId);

  // Vorwoche bestimmen (Montag-Sonntag der ISO-Vorwoche)
  const today = new Date();
  const previousWeek = new Date(today);
  previousWeek.setDate(today.getDate() - 7);
  const { jahr, kw } = isoWeekFromDate(previousWeek);
  const days = daysOfIsoWeek(jahr, kw);
  const monday = days[0];
  const sunday = days[6];

  // Lock vorhanden?
  const [lock] = await db
    .select({ id: schema.stundenWochenLock.id })
    .from(schema.stundenWochenLock)
    .where(
      and(
        eq(schema.stundenWochenLock.workspaceId, workspaceId),
        eq(schema.stundenWochenLock.jahr, jahr),
        eq(schema.stundenWochenLock.kw, kw)
      )
    )
    .limit(1);
  if (lock) {
    result.checked = 1;
    return result;
  }

  // Stunden in dieser Woche?
  const stundenRows = await db
    .select({
      total: sql<number>`coalesce(sum(${schema.stunden.stunden}), 0)`,
    })
    .from(schema.stunden)
    .where(
      and(
        eq(schema.stunden.workspaceId, workspaceId),
        sql`${schema.stunden.datum} >= ${monday}`,
        sql`${schema.stunden.datum} <= ${sunday}`
      )
    );
  const totalHours = Number(stundenRows[0]?.total ?? 0);
  result.checked = 1;
  if (totalHours <= 0) return result;

  // Idempotenz: Prüfen, ob für diese KW schon ein offener Vorgang existiert.
  // Wir markieren das in workspaces.notes? Nein — eigene Marker-Logik:
  // wir suchen offene Vorgänge mit Titel-Marker. Pragmatisch.
  const titleMarker = `KW ${kw}/${jahr}`;
  const existing = await db
    .select({ id: schema.vorgaenge.id })
    .from(schema.vorgaenge)
    .where(
      and(
        eq(schema.vorgaenge.workspaceId, workspaceId),
        sql`${schema.vorgaenge.title} LIKE ${`%${titleMarker}%`}`,
        sql`${schema.vorgaenge.status} NOT IN ('abgeschlossen', 'archiviert')`
      )
    )
    .limit(1);
  if (existing.length > 0) return result;

  try {
    await createVorgangFromTrigger({
      workspaceId,
      userId: null,
      source: "stunden_woche_unverbucht",
      title: `[Cron] Stunden ${titleMarker} nicht gesperrt (${totalHours.toFixed(2)}h gebucht)`,
      category: "vertragspflicht",
      projectId: null,
      dueDate: isoToday(3),
      firstStep: {
        kind: "klassifikation",
        payload: {
          jahr,
          kw,
          monday,
          sunday,
          totalHours,
          triggeredBy: "cron",
        },
        citations: [
          {
            sourceKind: "intern",
            sourceRef: "Lohnabrechnungs-Workflow",
            sourceText:
              "Wochenstunden müssen vor Lohnlauf gesperrt werden, sonst läuft Buchhaltung gegen unbestätigte Daten.",
          },
        ],
      },
      auditPayload: { jahr, kw, totalHours, triggeredBy: "cron" },
    });
    result.triggered++;
  } catch (e) {
    result.errors.push(
      `Stunden-Lock KW ${kw}/${jahr}: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  return result;
}

/* ============== UVV-PRÜFUNGEN ============== */

export async function runUvvPruefungReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("uvv_pruefung_faellig", workspaceId);
  const cutoff = isoToday(30); // 30 Tage Vorlauf nach § 3 BetrSichV

  const candidates = await db
    .select()
    .from(schema.geraeteWartung)
    .where(
      and(
        eq(schema.geraeteWartung.workspaceId, workspaceId),
        eq(schema.geraeteWartung.art, "uvv_pruefung"),
        lte(schema.geraeteWartung.faelligAm, cutoff),
        isNull(schema.geraeteWartung.durchgefuehrtAm)
      )
    );
  result.checked = candidates.length;

  for (const w of candidates) {
    const marker = `[auto-vorgang:${w.id}]`;
    if (w.notes?.includes(marker)) continue;
    try {
      const [geraet] = await db
        .select()
        .from(schema.geraete)
        .where(eq(schema.geraete.id, w.geraetId))
        .limit(1);
      if (!geraet) continue;
      // Ausgemusterte Geräte erzeugen keine Reminder mehr.
      if (geraet.status === "ausgemustert") continue;

      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "uvv_pruefung_faellig",
        title: `[Cron] UVV-Prüfung fällig: ${geraet.bezeichnung}${
          geraet.inventarNr ? ` (${geraet.inventarNr})` : ""
        }`,
        category: "vertragspflicht",
        projectId: null,
        dueDate: w.faelligAm,
        firstStep: {
          kind: "klassifikation",
          payload: {
            geraetId: geraet.id,
            wartungId: w.id,
            kategorie: geraet.kategorie,
            faelligAm: w.faelligAm,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "intern",
              sourceRef: "§ 3 BetrSichV",
              sourceText:
                "Arbeitsmittel sind regelmäßig durch befähigte Person zu prüfen — UVV-Prüfung mindestens jährlich.",
            },
          ],
        },
        auditPayload: {
          geraetId: geraet.id,
          wartungId: w.id,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.geraeteWartung)
        .set({ notes: w.notes ? `${w.notes}\n${marker}` : marker })
        .where(eq(schema.geraeteWartung.id, w.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Wartung ${w.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== MIETRÜCKGABE ============== */

export async function runMietruecksgabeReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("mietruecksgabe_faellig", workspaceId);
  const cutoff = isoToday(14);

  const candidates = await db
    .select()
    .from(schema.geraete)
    .where(
      and(
        eq(schema.geraete.workspaceId, workspaceId),
        sql`${schema.geraete.eigentum} IN ('miete', 'leasing')`,
        sql`${schema.geraete.mietBisDatum} IS NOT NULL`,
        lte(schema.geraete.mietBisDatum, cutoff),
        sql`${schema.geraete.status} != 'ausgemustert'`
      )
    );
  result.checked = candidates.length;

  for (const g of candidates) {
    const marker = `[auto-vorgang:${g.id}]`;
    if (g.notes?.includes(marker)) continue;
    try {
      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "mietruecksgabe_faellig",
        title: `[Cron] Mietrückgabe fällig: ${g.bezeichnung}${
          g.mietPartner ? ` an ${g.mietPartner}` : ""
        }`,
        category: "vertragspflicht",
        projectId: null,
        dueDate: g.mietBisDatum,
        firstStep: {
          kind: "klassifikation",
          payload: {
            geraetId: g.id,
            kategorie: g.kategorie,
            eigentum: g.eigentum,
            mietPartner: g.mietPartner,
            mietBisDatum: g.mietBisDatum,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "intern",
              sourceRef: "Mietvertrag",
              sourceText:
                "Rückgabe-/Vertragsende des Mietgeräts bevorsteht — Vereinbarung zur Verlängerung oder Rückgabe-Termin organisieren.",
            },
          ],
        },
        auditPayload: {
          geraetId: g.id,
          mietBisDatum: g.mietBisDatum,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.geraete)
        .set({
          notes: g.notes ? `${g.notes}\n${marker}` : marker,
          updatedAt: new Date(),
        })
        .where(eq(schema.geraete.id, g.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Geraet ${g.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== FREISTELLUNG § 48b EStG (Ablauf) ============== */

/**
 * Reminder: NU-Freistellungsbescheinigung läuft in <= 30 Tagen ab oder ist
 * bereits abgelaufen. Idempotenz: Marker im subcontractors.riskNotes-Feld.
 *
 * Konsequenz bei Ablauf: nachfolgende NU-Eingangsrechnungen müssen mit 15 %
 * Bauabzug einbehalten werden (§ 48 EStG) — Vorgang erinnert daran, eine
 * neue Bescheinigung anzufordern, bevor das passiert.
 */
export async function runFreistellungAblaufReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("freistellung_laeuft_aus", workspaceId);
  const cutoff = isoToday(30);

  const candidates = await db
    .select()
    .from(schema.subcontractors)
    .where(
      and(
        eq(schema.subcontractors.workspaceId, workspaceId),
        lte(
          schema.subcontractors.freistellungsbescheinigungGueltigBis,
          cutoff
        )
      )
    );
  result.checked = candidates.length;

  for (const nu of candidates) {
    const validUntil = nu.freistellungsbescheinigungGueltigBis;
    if (!validUntil) continue;
    const marker = `[auto-vorgang-freistellung:${nu.id}:${validUntil}]`;
    if (nu.riskNotes?.includes(marker)) continue;
    try {
      const today = isoToday();
      const expired = validUntil < today;
      const daysDelta = Math.round(
        (new Date(validUntil).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "freistellung_laeuft_aus",
        title: expired
          ? `[Cron] Freistellungsbescheinigung abgelaufen: ${nu.name}`
          : `[Cron] Freistellungsbescheinigung läuft aus: ${nu.name} (${validUntil})`,
        category: "vertragspflicht",
        projectId: nu.projectId,
        dueDate: expired ? isoToday(0) : isoToday(7),
        firstStep: {
          kind: "klassifikation",
          payload: {
            subcontractorId: nu.id,
            subcontractorName: nu.name,
            freistellungsbescheinigungNr: nu.freistellungsbescheinigungNr,
            validUntil,
            expired,
            daysDelta,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "intern",
              sourceRef: "§ 48b EStG",
              sourceText:
                "Ohne gültige Freistellungsbescheinigung muss der Leistungsempfänger 15 % Bauabzug von der Bruttovergütung einbehalten und an das Finanzamt abführen.",
            },
          ],
        },
        auditPayload: {
          subcontractorId: nu.id,
          validUntil,
          expired,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.subcontractors)
        .set({
          riskNotes: nu.riskNotes ? `${nu.riskNotes}\n${marker}` : marker,
          updatedAt: new Date(),
        })
        .where(eq(schema.subcontractors.id, nu.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `NU ${nu.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== BAUABZUG-ANMELDUNG § 48a EStG ============== */

/**
 * Reminder: Sammel-Vorgang am 5. des Monats für alle im Vormonat einbehaltenen
 * Bauabzug-Beträge, die noch nicht ans Finanzamt abgeführt wurden. Anmelde-
 * Frist ist der 10. des Folgemonats — der 5. lässt 5 Tage Vorlauf für die
 * Anmeldung.
 *
 * Idempotenz: pro Workspace + Vormonat genau ein Vorgang. Marker ist der
 * Vorgang-Titel selbst (eindeutig durch Workspace-Scope + Monats-Slug).
 */
export async function runBauabzugAnmeldungReminder(
  workspaceId: string,
  today: Date = new Date()
): Promise<ReminderResult> {
  const result = emptyResult("bauabzug_anmeldung_finanzamt", workspaceId);

  // Nur am 5. des Monats laufen lassen (toleriert vergangene Tage als Backup,
  // damit ein verpasster Cron-Run am 5. nachgeholt werden kann).
  const dayOfMonth = today.getDate();
  if (dayOfMonth < 5 || dayOfMonth > 9) {
    return result;
  }

  const month = previousMonthIso(today);
  const range = monthRange(month);

  const offene = await db
    .select()
    .from(schema.rechnungen)
    .where(
      and(
        eq(schema.rechnungen.workspaceId, workspaceId),
        sql`${schema.rechnungen.bauabzugEinbehaltCents} > 0`,
        isNull(schema.rechnungen.bauabzugAnFinanzamtAbgefuehrtAm),
        sql`${schema.rechnungen.invoiceDate} >= ${range.from}`,
        sql`${schema.rechnungen.invoiceDate} <= ${range.to}`
      )
    );
  result.checked = offene.length;
  if (offene.length === 0) return result;

  const titleMarker = `Bauabzug-Anmeldung ${month}`;
  const existing = await db
    .select({ id: schema.vorgaenge.id })
    .from(schema.vorgaenge)
    .where(
      and(
        eq(schema.vorgaenge.workspaceId, workspaceId),
        sql`${schema.vorgaenge.title} LIKE ${`%${titleMarker}%`}`
      )
    )
    .limit(1);
  if (existing.length > 0) return result;

  const summe = offene.reduce(
    (sum, r) => sum + (r.bauabzugEinbehaltCents ?? 0),
    0
  );
  const summeEuro = (summe / 100).toFixed(2);

  try {
    await createVorgangFromTrigger({
      workspaceId,
      userId: null,
      source: "bauabzug_anmeldung_finanzamt",
      title: `[Cron] ${titleMarker}: ${offene.length} Rechnungen, ${summeEuro} € einbehalten`,
      category: "vertragspflicht",
      projectId: null,
      dueDate: monthRange(
        // Anmeldefrist = 10. des laufenden Monats (nicht des Vormonats)
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
      ).from.replace(/(\d{4}-\d{2})-\d{2}/, "$1-10"),
      firstStep: {
        kind: "klassifikation",
        payload: {
          month,
          rechnungen: offene.map((r) => ({
            id: r.id,
            supplierName: r.supplierName,
            invoiceDate: r.invoiceDate,
            einbehaltCents: r.bauabzugEinbehaltCents,
          })),
          summeCents: summe,
          triggeredBy: "cron",
        },
        citations: [
          {
            sourceKind: "intern",
            sourceRef: "§ 48a EStG",
            sourceText:
              "Der Leistungsempfänger hat bis zum 10. Tag des dem Anmeldezeitraum folgenden Monats eine Anmeldung über den Steuerabzug an das zuständige Finanzamt zu übersenden.",
          },
        ],
      },
      auditPayload: {
        month,
        anzahl: offene.length,
        summeCents: summe,
        triggeredBy: "cron",
      },
    });
    result.triggered++;
  } catch (e) {
    result.errors.push(
      `Bauabzug-Anmeldung ${month}: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  return result;
}

/* ============== WITTERUNGSBEHINDERUNGEN — offene Anzeigen ============== */

/**
 * Eskaliert offene Witterungsbehinderungen (ankuendigung_versendet=0), für
 * die noch kein Vorgang existiert. Greift insbesondere bei manuell
 * angelegten Behinderungen — auto-erkannte Fälle erzeugen den Vorgang
 * bereits in `enrichEntryWithWeather`.
 *
 * Idempotenz über Marker `[auto-vorgang-cron-witterung:<id>]` im notes-Feld
 * der Behinderung.
 */
export async function runWitterungsbehinderungReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("witterungsbehinderung_anzeige", workspaceId);
  const candidates = await db
    .select()
    .from(schema.behinderungen)
    .where(
      and(
        eq(schema.behinderungen.workspaceId, workspaceId),
        eq(schema.behinderungen.ankuendigungVersendet, false)
      )
    );
  result.checked = candidates.length;

  for (const b of candidates) {
    const marker = `[auto-vorgang-cron-witterung:${b.id}]`;
    if (b.notes?.includes(marker)) continue;
    try {
      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "witterungsbehinderung_anzeige",
        title: `[Cron] Witterungsbehinderung ${BEHINDERUNG_ART_LABEL[b.art]} — Anzeige offen (${b.vonDatum})`,
        category: "vertragspflicht",
        projectId: b.projektId,
        dueDate: isoToday(0),
        firstStep: {
          kind: "klassifikation",
          payload: {
            behinderungId: b.id,
            art: b.art,
            vonDatum: b.vonDatum,
            schwellwertText: b.schwellwertText,
            triggeredBy: "cron",
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
        auditPayload: {
          behinderungId: b.id,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.behinderungen)
        .set({
          notes: b.notes ? `${b.notes}\n${marker}` : marker,
        })
        .where(eq(schema.behinderungen.id, b.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Behinderung ${b.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== PLAN-FREIGABE STOCKT ============== */

/**
 * Reminder: Plan steht seit > 14 Tagen auf "zur_freigabe", aber es gibt
 * mindestens eine offene Freigabe und keine ausreichende Mehrheit für
 * "freigegeben". Idempotenz über Marker im plaene.notes.
 */
export async function runPlanFreigabeStocktReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("plan_freigabe_stockt", workspaceId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 14);

  const candidates = await db
    .select()
    .from(schema.plaene)
    .where(
      and(
        eq(schema.plaene.workspaceId, workspaceId),
        eq(schema.plaene.status, "zur_freigabe"),
        lte(schema.plaene.updatedAt, cutoff)
      )
    );
  result.checked = candidates.length;

  for (const plan of candidates) {
    if (!plan.aktuelleVersionId) continue;
    const marker = `[auto-vorgang-stockt:${plan.id}]`;
    if (plan.notes?.includes(marker)) continue;

    const freigaben = await db
      .select()
      .from(schema.plaeneFreigaben)
      .where(
        eq(schema.plaeneFreigaben.planVersionId, plan.aktuelleVersionId)
      );
    if (freigaben.length === 0) continue;
    const offen = freigaben.filter((f) => f.freigabeStatus === "offen").length;
    if (offen === 0) continue; // alle entschieden, anderer Trigger zuständig

    try {
      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "plan_freigabe_stockt",
        title: `[Cron] Plan-Freigabe stockt: ${plan.planNr} — ${plan.bezeichnung}`,
        category: "vertragspflicht",
        projectId: plan.projektId,
        dueDate: isoToday(7),
        firstStep: {
          kind: "klassifikation",
          payload: {
            planId: plan.id,
            planNr: plan.planNr,
            planTyp: plan.planTyp,
            offeneFreigaben: offen,
            seitTagen: 14,
            triggeredBy: "cron",
          },
        },
        auditPayload: {
          planId: plan.id,
          offeneFreigaben: offen,
          triggeredBy: "cron",
        },
      });
      await db
        .update(schema.plaene)
        .set({
          notes: plan.notes ? `${plan.notes}\n${marker}` : marker,
          updatedAt: new Date(),
        })
        .where(eq(schema.plaene.id, plan.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Plan ${plan.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== NU-OPERATIONS — Sicherheits-Konto fällig ============== */

/**
 * Reminder: Sicherheits-Einbehalt wird in den nächsten 30 Tagen fällig oder
 * ist überfällig. Idempotent über Marker `[auto-vorgang:<id>]` im notes-Feld
 * des Konto-Eintrags.
 */
export async function runNuSicherheitFaelligReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("nu_sicherheit_faellig", workspaceId);
  const today = isoToday();
  const cutoff = isoToday(30);

  const candidates = await db
    .select()
    .from(schema.nuSicherheitsKonto)
    .where(
      and(
        eq(schema.nuSicherheitsKonto.workspaceId, workspaceId),
        isNull(schema.nuSicherheitsKonto.freigegebenAm),
        sql`${schema.nuSicherheitsKonto.faelligAm} IS NOT NULL`,
        lte(schema.nuSicherheitsKonto.faelligAm, cutoff)
      )
    );
  result.checked = candidates.length;

  for (const k of candidates) {
    const marker = `[auto-vorgang:${k.id}]`;
    if (k.notes?.includes(marker)) continue;

    try {
      const [auftrag] = await db
        .select({
          auftragsnr: schema.nuAuftraege.auftragsnr,
          nuId: schema.nuAuftraege.nuId,
          projektId: schema.nuAuftraege.projektId,
        })
        .from(schema.nuAuftraege)
        .where(eq(schema.nuAuftraege.id, k.nuAuftragId))
        .limit(1);
      if (!auftrag) continue;

      const ueberfaellig = !!k.faelligAm && k.faelligAm < today;
      const tageOffset = k.faelligAm
        ? Math.round(
            (new Date(k.faelligAm).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
          )
        : 0;

      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "nu_sicherheit_faellig",
        title: `[Cron] NU-Sicherheit ${ueberfaellig ? "überfällig" : "fällt"}: ${auftrag.auftragsnr} (${k.art})`,
        category: "vertragspflicht",
        projectId: auftrag.projektId,
        dueDate: isoToday(7),
        firstStep: {
          kind: "klassifikation",
          payload: {
            kontoId: k.id,
            nuAuftragId: k.nuAuftragId,
            art: k.art,
            betragCents: k.einbehaltenerBetragCents,
            faelligAm: k.faelligAm,
            tageOffset,
            triggeredBy: "cron",
          },
          citations: [
            {
              sourceKind: "vob",
              sourceRef: "§ 17 VOB/B",
              sourceText:
                "Nach Wegfall des Sicherungszwecks ist die Sicherheit unverzüglich zurückzugeben.",
            },
          ],
        },
        auditPayload: {
          kontoId: k.id,
          nuAuftragId: k.nuAuftragId,
          art: k.art,
          ueberfaellig,
        },
      });
      await db
        .update(schema.nuSicherheitsKonto)
        .set({
          notes: k.notes ? `${k.notes}\n${marker}` : marker,
        })
        .where(eq(schema.nuSicherheitsKonto.id, k.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `NU-Konto ${k.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== MATERIAL — LIEFERSCHEINE PRÜFEN ÜBERFÄLLIG ============== */

/**
 * Reminder: Lieferschein im Status `eingegangen` älter als 30 Tage und noch
 * nicht geprüft → Auto-Vorgang. Idempotenz über Marker im notes-Feld.
 */
export async function runMaterialLieferscheinPruefenReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult(
    "material_lieferschein_pruefen_ueberfaellig",
    workspaceId
  );
  const cutoff = isoToday(-LS_PRUEFEN_UEBERFAELLIG_TAGE);

  const candidates = await db
    .select()
    .from(schema.lieferscheine)
    .where(
      and(
        eq(schema.lieferscheine.workspaceId, workspaceId),
        eq(schema.lieferscheine.status, "eingegangen"),
        lte(schema.lieferscheine.datum, cutoff)
      )
    );
  result.checked = candidates.length;

  for (const ls of candidates) {
    const marker = `[auto-vorgang:${ls.id}]`;
    if (ls.notes?.includes(marker)) continue;
    try {
      await createVorgangFromTrigger({
        workspaceId,
        userId: null,
        source: "material_lieferschein_pruefen_ueberfaellig",
        title: `[Cron] Lieferschein ungeprüft seit ${LS_PRUEFEN_UEBERFAELLIG_TAGE} Tagen: ${ls.lsNr}`,
        category: "vertragspflicht",
        projectId: ls.projektId,
        dueDate: isoToday(7),
        firstStep: {
          kind: "klassifikation",
          payload: {
            lsId: ls.id,
            lsNr: ls.lsNr,
            datum: ls.datum,
            triggeredBy: "cron",
          },
        },
        auditPayload: {
          lsId: ls.id,
          ueberfaelligTage: LS_PRUEFEN_UEBERFAELLIG_TAGE,
        },
      });
      await db
        .update(schema.lieferscheine)
        .set({
          notes: ls.notes ? `${ls.notes}\n${marker}` : marker,
        })
        .where(eq(schema.lieferscheine.id, ls.id));
      result.triggered++;
    } catch (e) {
      result.errors.push(
        `Lieferschein ${ls.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }
  return result;
}

/* ============== LIQUIDITÄT — Engpass-Frühwarn ============== */

/**
 * Reminder: erzeugt einen ad-hoc-Forecast aus offenen ARs und NU-Rechnungen
 * mit Workspace-Default-Annahmen und prüft, ob in den nächsten 14 Tagen ein
 * Kontostand <= 0 droht. Idempotent über Titel-Marker (Datum+Workspace).
 */
const LIQUIDITAET_HORIZONT_TAGE = 90;
const LIQUIDITAET_WARN_HORIZONT = 14;
const LIQUIDITAET_AN_FRIST_TAGE = 14;
const LIQUIDITAET_NU_FRIST_TAGE = 30;

export async function runLiquiditaetReminders(
  workspaceId: string
): Promise<ReminderResult> {
  const result = emptyResult("liquiditaet_eng", workspaceId);
  const today = isoToday();

  try {
    // Datenquellen sammeln
    const [ars, nuR, stundenRows] = await Promise.all([
      db
        .select({
          invoiceDate: schema.ausgangsrechnungen.invoiceDate,
          dueDate: schema.ausgangsrechnungen.dueDate,
          bruttoCents: schema.ausgangsrechnungen.payoutGross,
          status: schema.ausgangsrechnungen.status,
          paidAt: schema.ausgangsrechnungen.paidAt,
        })
        .from(schema.ausgangsrechnungen)
        .where(eq(schema.ausgangsrechnungen.workspaceId, workspaceId)),
      db
        .select({
          rechnungsdatum: schema.nuEingangsrechnungen.rechnungsdatum,
          zahlungsdatum: schema.nuEingangsrechnungen.zahlungsdatum,
          bruttoCents: schema.nuEingangsrechnungen.bruttoCents,
          ausgezahltCents: schema.nuEingangsrechnungen.ausgezahltCents,
          status: schema.nuEingangsrechnungen.status,
        })
        .from(schema.nuEingangsrechnungen)
        .where(eq(schema.nuEingangsrechnungen.workspaceId, workspaceId)),
      db
        .select({
          datum: schema.stunden.datum,
          stunden: schema.stunden.stunden,
          stundensatzCents: schema.stunden.stundensatzCents,
        })
        .from(schema.stunden)
        .where(eq(schema.stunden.workspaceId, workspaceId)),
    ]);

    result.checked = ars.length + nuR.length;
    if (ars.length === 0 && nuR.length === 0 && stundenRows.length === 0) {
      return result; // Keine Datenbasis
    }

    const arInputs: ForecastInputAr[] = ars.map((a) => ({
      invoiceDate: a.invoiceDate,
      dueDate: a.dueDate,
      bruttoCents: Math.round(Number(a.bruttoCents) * 100),
      status: a.status,
      paidAt: a.paidAt,
    }));
    const nuInputs: ForecastInputNuRechnung[] = nuR.map((r) => ({
      rechnungsdatum: r.rechnungsdatum,
      zahlungsdatum: r.zahlungsdatum,
      bruttoCents: r.bruttoCents,
      ausgezahltCents: r.ausgezahltCents,
      status: r.status,
    }));
    const lohnMonate = aggregateLohnByMonth(stundenRows);

    const rows = buildForecast({
      config: {
        basisdatum: today,
        horizontTage: LIQUIDITAET_HORIZONT_TAGE,
        annahmeFristTageAn: LIQUIDITAET_AN_FRIST_TAGE,
        annahmeFristTageNu: LIQUIDITAET_NU_FRIST_TAGE,
        kontostandStartCents: 0, // konservativ — Cron kennt echten Kontostand nicht
      },
      ars: arInputs,
      nuRechnungen: nuInputs,
      lohnMonate,
      mieten: [],
    });

    const warning = findEngeLiquiditaet(rows, LIQUIDITAET_WARN_HORIZONT);
    if (!warning) return result;

    // Idempotenz: gleicher Tag + Workspace darf nicht doppelt feuern
    const titleMarker = `Liquiditätsengpass ${warning.datum}`;
    const existing = await db
      .select({ id: schema.vorgaenge.id })
      .from(schema.vorgaenge)
      .where(
        and(
          eq(schema.vorgaenge.workspaceId, workspaceId),
          sql`${schema.vorgaenge.title} LIKE ${`%${titleMarker}%`}`,
          sql`${schema.vorgaenge.status} NOT IN ('abgeschlossen', 'archiviert')`
        )
      )
      .limit(1);
    if (existing.length > 0) return result;

    await createVorgangFromTrigger({
      workspaceId,
      userId: null,
      source: "liquiditaet_eng",
      title: `[Cron] ${titleMarker}: in ${warning.daysFromBasis} Tagen`,
      category: "vertragspflicht",
      projectId: null,
      dueDate: isoToday(2),
      firstStep: {
        kind: "klassifikation",
        payload: {
          warnDatum: warning.datum,
          warnTageOffset: warning.daysFromBasis,
          erwarteterKontostandCents: warning.kontostandCents,
          forecastBasis: today,
          triggeredBy: "cron",
        },
        citations: [
          {
            sourceKind: "intern",
            sourceRef: "Liquiditäts-Modell 4.2",
            sourceText:
              "Kontostand fällt im Forecast-Horizont auf ≤ 0 — Maßnahmen: Mahnwesen verschärfen, NU-Zahlungen verschieben, Kontokorrent prüfen.",
          },
        ],
      },
      auditPayload: {
        warnDatum: warning.datum,
        kontostandCents: warning.kontostandCents,
        triggeredBy: "cron",
      },
    });
    result.triggered++;
  } catch (e) {
    result.errors.push(
      `Liquiditäts-Forecast: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  return result;
}

/* ============== Aggregator ============== */

export async function runAllRemindersForWorkspace(
  workspaceId: string
): Promise<ReminderResult[]> {
  return [
    await runNuComplianceReminders(workspaceId),
    await runSicherheitenReminders(workspaceId),
    await runAnzeigenReminders(workspaceId),
    await runMangelFristReminders(workspaceId),
    await runGewaehrleistungEndReminders(workspaceId),
    await runHinschgAckReminders(workspaceId),
    await runHinschgFristReminders(workspaceId),
    await runVertragsstrafeReminders(workspaceId),
    await runStundenWochenLockReminders(workspaceId),
    await runUvvPruefungReminders(workspaceId),
    await runMietruecksgabeReminders(workspaceId),
    await runFreistellungAblaufReminders(workspaceId),
    await runBauabzugAnmeldungReminder(workspaceId),
    await runWitterungsbehinderungReminders(workspaceId),
    await runPlanFreigabeStocktReminders(workspaceId),
    await runNuSicherheitFaelligReminders(workspaceId),
    await runMaterialLieferscheinPruefenReminders(workspaceId),
    await runLiquiditaetReminders(workspaceId),
  ];
}

export type RemindersRunSummary = {
  workspacesProcessed: number;
  totalChecked: number;
  totalTriggered: number;
  perModule: Record<string, { checked: number; triggered: number }>;
  errors: string[];
};

export async function runAllReminders(): Promise<RemindersRunSummary> {
  const summary: RemindersRunSummary = {
    workspacesProcessed: 0,
    totalChecked: 0,
    totalTriggered: 0,
    perModule: {},
    errors: [],
  };

  const workspaces = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces);

  for (const ws of workspaces) {
    summary.workspacesProcessed++;
    try {
      const results = await runAllRemindersForWorkspace(ws.id);
      for (const r of results) {
        summary.totalChecked += r.checked;
        summary.totalTriggered += r.triggered;
        if (!summary.perModule[r.module]) {
          summary.perModule[r.module] = { checked: 0, triggered: 0 };
        }
        summary.perModule[r.module].checked += r.checked;
        summary.perModule[r.module].triggered += r.triggered;
        for (const err of r.errors) {
          summary.errors.push(`[${ws.id}/${r.module}] ${err}`);
        }
      }
    } catch (e) {
      summary.errors.push(
        `[${ws.id}] Fatal: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  return summary;
}

const MARKER_LIMIT = EXPIRY_WARN_DAYS; // re-export silencer
export { MARKER_LIMIT };
