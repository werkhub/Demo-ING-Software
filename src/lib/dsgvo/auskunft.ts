// Bewusst kein "server-only" — wird von Tests (Vitest) und ggf. Cron-Jobs
// (Aufbewahrungsfristen) aufgerufen. Schutz gegen Client-Bundling läuft
// über die DB-Imports.
//
// DSGVO-Auskunft (Art. 15) und „Recht auf Vergessenwerden" (Art. 17).
//
// Implementiert für die Domain-Tabellen, die personenbezogene Daten
// enthalten:
//   - users                  (Mitarbeitende des Workspace)
//   - subcontractors         (NU-Stamm — Name, E-Mail, Telefon)
//   - projectContacts        (Beteiligten-Kontakte am Projekt)
//   - mitarbeiter            (Stunden-Stamm — Name, Personalnummer)
//
// Bewusst NICHT enthalten: hinschgMeldungen (eigene § 11 HinSchG-3-J-Frist
// und Anonymitäts-Schutz; nur über separates HinSchG-Verfahren).
// Ausgangsrechnungen-Stammdaten (partyAg, partyAn) bleiben aus § 147 AO
// (10 J. Aufbewahrung) auch bei Anonymisierung unangetastet.
import { and, eq, like, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { logChange, type AuditContext } from "@/lib/audit/log";
import { ALL_BUCKETS, type DsgvoBucket } from "./buckets";
import type { DsgvoExportBundle, DsgvoFinding } from "./types";

export { ALL_BUCKETS };
export type { DsgvoBucket, DsgvoExportBundle, DsgvoFinding };

/**
 * Like-Pattern für Suche — wir suchen case-insensitive nach Substring.
 * SQLite LIKE ist case-insensitive für ASCII per Default; für Unicode
 * (Umlaute) ist das nicht garantiert, aber pragmatisch genug.
 */
function likePattern(identifier: string): string {
  return `%${identifier.trim()}%`;
}

/**
 * Sammelt alle Datensätze, die den Identifier (E-Mail, Name, Telefon)
 * enthalten. Workspace-scoped — kein Cross-Workspace-Leak.
 */
export async function exportPersonalData(
  workspaceId: string,
  identifier: string
): Promise<DsgvoExportBundle> {
  const ident = identifier.trim();
  if (!ident) {
    throw new Error("DSGVO-Auskunft: Identifier darf nicht leer sein.");
  }
  const pat = likePattern(ident);
  const findings: DsgvoFinding[] = [];

  // users
  const userRows = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.workspaceId, workspaceId),
        or(
          like(schema.users.email, pat),
          like(schema.users.name, pat)
        )
      )
    );
  if (userRows.length > 0) {
    findings.push({ bucket: "users", table: "users", rows: userRows });
  }

  // subcontractors
  const subRows = await db
    .select()
    .from(schema.subcontractors)
    .where(
      and(
        eq(schema.subcontractors.workspaceId, workspaceId),
        or(
          like(schema.subcontractors.name, pat),
          like(schema.subcontractors.email, pat),
          like(schema.subcontractors.phone, pat),
          like(schema.subcontractors.organization, pat)
        )
      )
    );
  if (subRows.length > 0) {
    findings.push({
      bucket: "subcontractors",
      table: "subcontractors",
      rows: subRows,
    });
  }

  // projectContacts
  const contactRows = await db
    .select()
    .from(schema.projectContacts)
    .where(
      and(
        eq(schema.projectContacts.workspaceId, workspaceId),
        or(
          like(schema.projectContacts.name, pat),
          like(schema.projectContacts.email, pat),
          like(schema.projectContacts.phone, pat),
          like(schema.projectContacts.organization, pat)
        )
      )
    );
  if (contactRows.length > 0) {
    findings.push({
      bucket: "projectContacts",
      table: "project_contacts",
      rows: contactRows,
    });
  }

  // mitarbeiter
  const maRows = await db
    .select()
    .from(schema.mitarbeiter)
    .where(
      and(
        eq(schema.mitarbeiter.workspaceId, workspaceId),
        or(
          like(schema.mitarbeiter.name, pat),
          like(schema.mitarbeiter.personalnummer, pat)
        )
      )
    );
  if (maRows.length > 0) {
    findings.push({
      bucket: "mitarbeiter",
      table: "mitarbeiter",
      rows: maRows,
    });
  }

  return {
    identifier: ident,
    workspaceId,
    generatedAt: new Date().toISOString(),
    findings,
    notes: [
      "HinSchG-Meldungen sind aus § 11 HinSchG (3-Jahres-Aufbewahrung) und Anonymitäts-Schutz nicht in dieser Auskunft enthalten. Anfragen über die Meldestelle erforderlich.",
      "Stammdaten in Ausgangsrechnungen (Party-AG/-AN) unterliegen § 147 AO (10 J. Aufbewahrungspflicht) und sind selbst bei Anonymisierung erhalten.",
    ],
  };
}

const PDF_DEFAULT_FONT = "Helvetica";

/**
 * Erzeugt ein A4-PDF (eine oder mehrere Seiten) mit dem Auskunfts-Bundle.
 * Verwendet pdf-lib mit Standard-Helvetica — keine Font-Embeds nötig.
 */
export async function exportPersonalDataPdf(
  workspaceId: string,
  identifier: string
): Promise<Uint8Array> {
  const bundle = await exportPersonalData(workspaceId, identifier);
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  // ASCII-Sanitizer (Helvetica = WinAnsi). Reicht für DSGVO-Doku-PDF.
  const safe = (s: string) =>
    s
      .replace(/–|—/g, "-")
      .replace(/[“”„‟«»]/g, '"')
      .replace(/[‘’‚‛]/g, "'")
      .replace(/[^\x00-\xff]/g, "?");

  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 50;
  const LINE_H = 14;

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;
  const drawLine = (txt: string, opts?: { bold?: boolean; size?: number }) => {
    if (y < MARGIN + LINE_H) {
      page = doc.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
    const f = opts?.bold ? fontBold : font;
    const size = opts?.size ?? 10;
    page.drawText(safe(txt), { x: MARGIN, y, size, font: f });
    y -= LINE_H;
  };

  drawLine("DSGVO-Auskunft (Art. 15 DSGVO)", { bold: true, size: 14 });
  drawLine(`Identifier: ${bundle.identifier}`);
  drawLine(`Workspace: ${bundle.workspaceId}`);
  drawLine(`Erzeugt: ${bundle.generatedAt}`);
  y -= LINE_H;

  if (bundle.findings.length === 0) {
    drawLine("Keine personenbezogenen Daten gefunden.", { bold: true });
  }

  for (const f of bundle.findings) {
    drawLine(
      `${f.bucket} (${f.table}) — ${f.rows.length} Treffer`,
      { bold: true }
    );
    for (const row of f.rows) {
      for (const [k, v] of Object.entries(row)) {
        if (v === null || v === undefined) continue;
        const printable =
          v instanceof Date ? v.toISOString() : String(v);
        if (printable.length > 200) continue; // große Blobs überspringen
        drawLine(`  ${k}: ${printable}`);
      }
      y -= 4;
    }
    y -= LINE_H;
  }

  drawLine("Hinweise:", { bold: true });
  for (const n of bundle.notes) drawLine(`- ${n}`);

  return doc.save();
}

/**
 * Anonymisiert personenbezogene Felder (Name, E-Mail, Telefon, Organisation)
 * in den Buckets, die NICHT in `except` aufgeführt sind.
 *
 * Strategie: UPDATE statt DELETE — Foreign-Keys bleiben intakt
 * (NU-Aufträge, Ausgangsrechnungen, Audit-Log). Pflichtfelder bekommen
 * einen Platzhalter, optionale Felder werden auf null gesetzt.
 *
 * Pflicht: `reason` (z. B. "Art. 17 DSGVO Antrag #1234"). Fließt in den
 * audit_log-Eintrag pro betroffener Zeile.
 */
export async function loeschPersonalData(opts: {
  workspaceId: string;
  identifier: string;
  reason: string;
  ctx?: AuditContext | null;
  except?: DsgvoBucket[];
}): Promise<{
  buckets: Array<{ bucket: DsgvoBucket; affected: number }>;
}> {
  if (!opts.reason || !opts.reason.trim()) {
    throw new Error(
      "DSGVO-Anonymisierung: reason ist Pflicht (z. B. Antragsnummer)."
    );
  }
  const except = new Set(opts.except ?? []);
  const bundle = await exportPersonalData(opts.workspaceId, opts.identifier);
  const result: Array<{ bucket: DsgvoBucket; affected: number }> = [];

  for (const finding of bundle.findings) {
    if (except.has(finding.bucket)) {
      result.push({ bucket: finding.bucket, affected: 0 });
      continue;
    }
    let affected = 0;
    for (const row of finding.rows) {
      const id = row.id as string | undefined;
      if (!id) continue;
      const placeholderName = `Anonymisiert ${id.slice(-6)}`;
      let before: Record<string, unknown> | null = null;
      let after: Record<string, unknown> | null = null;

      if (finding.bucket === "users") {
        before = { ...row };
        // E-Mail muss notNull + unique bleiben — Platzhalter mit ID-Suffix.
        const placeholderEmail = `anonym-${id}@anonym.local`;
        await db
          .update(schema.users)
          .set({
            name: placeholderName,
            email: placeholderEmail,
            roleLabel: null,
            status: "inactive",
          })
          .where(eq(schema.users.id, id));
        after = {
          ...before,
          name: placeholderName,
          email: placeholderEmail,
          roleLabel: null,
          status: "inactive",
        };
      } else if (finding.bucket === "subcontractors") {
        before = { ...row };
        await db
          .update(schema.subcontractors)
          .set({
            name: placeholderName,
            email: null,
            phone: null,
            organization: null,
            riskNotes: null,
            updatedAt: new Date(),
          })
          .where(eq(schema.subcontractors.id, id));
        after = {
          ...before,
          name: placeholderName,
          email: null,
          phone: null,
          organization: null,
          riskNotes: null,
        };
      } else if (finding.bucket === "projectContacts") {
        before = { ...row };
        await db
          .update(schema.projectContacts)
          .set({
            name: placeholderName,
            email: null,
            phone: null,
            organization: null,
            notes: null,
          })
          .where(eq(schema.projectContacts.id, id));
        after = {
          ...before,
          name: placeholderName,
          email: null,
          phone: null,
          organization: null,
          notes: null,
        };
      } else if (finding.bucket === "mitarbeiter") {
        before = { ...row };
        await db
          .update(schema.mitarbeiter)
          .set({
            name: placeholderName,
            personalnummer: null,
            notes: null,
            aktiv: false,
            updatedAt: new Date(),
          })
          .where(eq(schema.mitarbeiter.id, id));
        after = {
          ...before,
          name: placeholderName,
          personalnummer: null,
          notes: null,
          aktiv: false,
        };
      }

      if (before && after) {
        const entityType = bucketToEntityType(finding.bucket);
        if (entityType) {
          await logChange({
            workspaceId: opts.workspaceId,
            entityType,
            entityId: id,
            action: "update",
            before,
            after,
            ctx: opts.ctx ?? null,
            reason: `DSGVO-Anonymisierung — ${opts.reason}`,
          });
        }
        affected++;
      }
    }
    result.push({ bucket: finding.bucket, affected });
  }

  return { buckets: result };
}

/**
 * Mapping Bucket → AuditEntityType. `users`, `projectContacts`, `mitarbeiter`
 * haben keinen direkten EntityType im Audit-CHECK (gehören nicht zum
 * Compliance-Audit-Scope) — für die wird kein `audit_log`-Eintrag pro Zeile
 * geschrieben (der DSGVO-Vorgang selbst ist über die Anonymisierungs-Action
 * dokumentiert).
 */
function bucketToEntityType(
  bucket: DsgvoBucket
): "subcontractor" | null {
  if (bucket === "subcontractors") return "subcontractor";
  return null;
}

export const PDF_FONT_DEFAULT = PDF_DEFAULT_FONT;
