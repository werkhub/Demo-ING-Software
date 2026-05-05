/**
 * Seed-Workspace: Schneider Immobilien GmbH (Bauherr).
 *
 * AG-Sicht — Auftraggeber für 3 Projekte. Demonstriert Mängelrüge,
 * Anordnungs-Erteilung, Sicherheiten-Verwaltung, Plan-Freigaben.
 */
import { db } from "../index";
import {
  workspaces,
  users,
  projects,
  contracts,
  projectContacts,
  fristen,
  maengel,
  maengelAnzeigen,
  abnahmen,
  securities,
  meilensteine,
  bautagebuchEntries,
  vorgaenge,
  vorgangAuditLog,
  queries,
} from "../schema";
import { isoPlus, dateAgo, dateAgoH, eur } from "./lib";

export const WS_ID = "ws_schneider_immo";
const USER_GF = "u_schneider_anke";
const USER_PL = "u_schneider_marcus";

export async function seedSchneiderWorkspace(): Promise<void> {
  console.log("→ Workspace: Schneider Immobilien GmbH (Bauherr)");

  await db.insert(workspaces).values({
    id: WS_ID,
    name: "Schneider Immobilien GmbH",
    tier: "team",
    workspaceRole: "bauherr",
    // Bauherr ohne eigene Planungsdisziplinen — beauftragt Hochbau-Planer
    // und schult sich auf Ausführungs-Hochbau (Vertragslogik).
    disciplinesJson: "[]",
    disciplineSubprofile: "custom",
    clientFocus: "privat",
    companySize: 6,
    vobLicenseStatus: "active",
    vobLicenseProvider: "din_media",
    address: "Schneider Immobilien GmbH · Friedensplatz 12 · 53111 Bonn",
    email: "info@schneider-immobilien.de",
    phone: "+49 30 0000-0002",
    taxId: "000/0000/0002",
    iban: "DE00100000000000000002",
  });

  await db.insert(users).values([
    {
      id: USER_GF,
      workspaceId: WS_ID,
      name: "Anke Schneider",
      email: "a.schneider@schneider-immobilien.de",
      role: "admin",
      memberRole: "gf",
      roleLabel: "Inhaberin",
      hasLicense: true,
      lastLoginAt: new Date(),
    },
    {
      id: USER_PL,
      workspaceId: WS_ID,
      name: "Marcus Weber",
      email: "m.weber@schneider-immobilien.de",
      role: "user",
      memberRole: "verwaltung",
      roleLabel: "Projektleiter",
      hasLicense: true,
      lastLoginAt: dateAgoH(8),
    },
  ]);

  /* ============== PROJEKTE ============== */
  await db.insert(projects).values([
    {
      // 1. Privatprojekt — Bauphase
      id: "p_si_2026_001",
      workspaceId: WS_ID,
      identifier: "SI-2026-001",
      name: "Wohnhaus Familie Lehmann · Bonn-Beuel",
      ag: "Privat · Familie Lehmann",
      value: 480_000,
      status: "Bauphase",
      progress: 0.42,
      contractType: "verbraucherbauvertrag",
      contractDate: "2025-11-10",
      plannedCompletion: "2026-12-31",
      siteAddress: "Eichendorffstr. 5, 53227 Bonn-Beuel",
      lat: 50.728,
      lon: 7.137,
      penaltyClauseAgreed: false,
      isBauleistung: true,
      vertraulich: true,
      notes: "Privater Bauherr — Verbraucherbauvertrag § 650i BGB.",
    },
    {
      // 2. Investor-Projekt — Bauphase
      id: "p_si_2026_005",
      workspaceId: WS_ID,
      identifier: "SI-2026-005",
      name: "Mehrfamilienhaus Hennef-Allner",
      ag: "Schneider Immobilien GmbH (Eigenbestand)",
      value: 1_650_000,
      status: "Bauphase",
      progress: 0.25,
      contractType: "vob_vertrag",
      contractDate: "2025-09-15",
      plannedCompletion: "2027-06-30",
      siteAddress: "Hauptstr. 84, 53773 Hennef",
      lat: 50.788,
      lon: 7.276,
      penaltyClauseAgreed: true,
      securityRetentionPercent: 5,
      isBauleistung: true,
    },
    {
      // 3. Abgeschlossen — Gewährleistung
      id: "p_si_2024_011",
      workspaceId: WS_ID,
      identifier: "SI-2024-011",
      name: "Sanierung Bürohaus Bad Godesberg",
      ag: "Schneider Immobilien GmbH (Eigenbestand)",
      value: 920_000,
      status: "Gewährleistung",
      progress: 1.0,
      contractType: "vob_vertrag",
      contractDate: "2023-08-01",
      plannedCompletion: "2024-11-30",
      abnahmeDate: "2024-12-10",
      warrantyEnd: "2028-12-10",
      siteAddress: "Koblenzer Str. 88, 53177 Bonn",
      lat: 50.685,
      lon: 7.16,
      penaltyClauseAgreed: true,
      securityRetentionPercent: 5,
      isBauleistung: true,
    },
  ]);

  /* ============== KONTAKTE ============== */
  await db.insert(projectContacts).values([
    // Privat
    { id: "pc_si_001_an", workspaceId: WS_ID, projectId: "p_si_2026_001", role: "nachunternehmer", name: "Müller Bau GmbH (AN)", organization: "Müller Bau GmbH", email: "info@muellerbau.de", phone: "+49 30 0000-0001" },
    { id: "pc_si_001_arch", workspaceId: WS_ID, projectId: "p_si_2026_001", role: "architekt", name: "Architektin Vogt", organization: "Demo Architekturbüro", email: "info@demo-architekturbuero.example" },
    // Investor
    { id: "pc_si_005_an", workspaceId: WS_ID, projectId: "p_si_2026_005", role: "nachunternehmer", name: "Demo Generalbau GmbH (AN)", organization: "Demo Generalbau GmbH", email: "vergabe@demo-generalbau.example", phone: "+49 2241 8001" },
    { id: "pc_si_005_arch", workspaceId: WS_ID, projectId: "p_si_2026_005", role: "architekt", name: "Hoffmann + Partner Architekten", organization: "Hoffmann + Partner", email: "info@hoffmann-partner.de" },
    { id: "pc_si_005_anwalt", workspaceId: WS_ID, projectId: "p_si_2026_005", role: "anwalt", name: "RAin Dr. Klein", organization: "Klein & Partner Rechtsanwälte", email: "klein@klein-partner.de" },
    // Bürohaus
    { id: "pc_si_011_an", workspaceId: WS_ID, projectId: "p_si_2024_011", role: "nachunternehmer", name: "Bauunion Bonn GmbH (AN)", organization: "Bauunion Bonn GmbH", email: "info@bauunion-bonn.de" },
  ]);

  /* ============== VERTRÄGE ============== */
  await db.insert(contracts).values([
    {
      id: "ct_si_001_haupt",
      workspaceId: WS_ID,
      projectId: "p_si_2026_001",
      title: "Verbraucherbauvertrag § 650i BGB · Wohnhaus Lehmann",
      kind: "hauptvertrag",
      contractText: "Verbraucherbauvertrag mit Müller Bau GmbH gem. § 650i BGB. Festpreis 480.000 EUR brutto. Ausführungsfrist 14 Monate.",
      signedAt: "2025-11-10",
      partyAg: "Familie Lehmann",
      partyAn: "Müller Bau GmbH",
      riskScore: 18,
    },
    {
      id: "ct_si_005_haupt",
      workspaceId: WS_ID,
      projectId: "p_si_2026_005",
      title: "VOB/B-Vertrag · MFH Hennef-Allner",
      kind: "hauptvertrag",
      contractText: "Bauleistung MFH gem. VOB/B. Vertragsstrafe 0,1 % je Werktag bis max. 5 % der Auftragssumme.",
      signedAt: "2025-09-15",
      partyAg: "Schneider Immobilien GmbH",
      partyAn: "Demo Generalbau GmbH",
      riskScore: 32,
    },
    {
      id: "ct_si_005_buer",
      workspaceId: WS_ID,
      projectId: "p_si_2026_005",
      title: "Vertragserfüllungsbürgschaft Hansen",
      kind: "buergschaft",
      contractText: "Vertragserfüllungsbürgschaft Hansen Generalbau über 82.500 EUR (5 % der Auftragssumme).",
      signedAt: "2025-09-25",
      riskScore: 10,
    },
    {
      id: "ct_si_011_haupt",
      workspaceId: WS_ID,
      projectId: "p_si_2024_011",
      title: "VOB/B-Vertrag · Sanierung Bürohaus",
      kind: "hauptvertrag",
      contractText: "Sanierung Bürohaus Bad Godesberg gem. VOB/B.",
      signedAt: "2023-08-01",
      partyAg: "Schneider Immobilien GmbH",
      partyAn: "Bauunion Bonn GmbH",
      riskScore: 22,
    },
  ]);

  /* ============== SICHERHEITEN ============== */
  await db.insert(securities).values([
    {
      id: "sec_si_005_vert",
      workspaceId: WS_ID,
      projectId: "p_si_2026_005",
      kind: "vertragserfuellung",
      direction: "received_from_ag",
      provider: "Allianz Trade",
      referenceNumber: "AT-Hansen-2025-441",
      amount: 82_500,
      percentOfContract: 5,
      issuedAt: "2025-09-25",
      validFrom: "2025-09-25",
      releaseTrigger: "bei_abnahme",
      status: "aktiv",
      notes: "Erhalten von Hansen Generalbau (AN) — wir als AG.",
    },
    {
      id: "sec_si_011_maeng",
      workspaceId: WS_ID,
      projectId: "p_si_2024_011",
      kind: "maengelanspruch",
      direction: "received_from_ag",
      provider: "R+V Versicherung",
      referenceNumber: "RV-2024-9001",
      amount: 46_000,
      percentOfContract: 5,
      issuedAt: "2024-12-10",
      validFrom: "2024-12-10",
      validUntil: "2028-12-10",
      releaseTrigger: "bei_gewaehrleistungsende",
      status: "aktiv",
    },
  ]);

  /* ============== FRISTEN ============== */
  await db.insert(fristen).values([
    { id: "f_si_001", workspaceId: WS_ID, projectId: "p_si_2026_001", task: "Sonderwunsch Familie Lehmann · Holztreppe statt Stahltreppe — Anordnung erteilen", deadline: isoPlus(2), legalBasis: "§ 1 Abs. 3 VOB/B" },
    { id: "f_si_002", workspaceId: WS_ID, projectId: "p_si_2026_005", task: "Plan-Freigabe Tragwerk MFH 2.OG", deadline: isoPlus(5) },
    { id: "f_si_003", workspaceId: WS_ID, projectId: "p_si_2024_011", task: "Mängelrüge AN — Fugen-Risse Foyer-Boden (Gewährleistung)", deadline: isoPlus(8), legalBasis: "§ 13 Abs. 5 VOB/B" },
    { id: "f_si_004", workspaceId: WS_ID, projectId: "p_si_2026_005", task: "Abschlagsrechnung Hansen prüfen + freigeben", deadline: isoPlus(10), legalBasis: "§ 16 VOB/B" },
  ]);

  /* ============== MEILENSTEINE ============== */
  await db.insert(meilensteine).values([
    { id: "ms_si_001_1", workspaceId: WS_ID, projectId: "p_si_2026_001", bezeichnung: "Bodenplatte fertig", reihenfolge: 0, sollDatum: "2025-12-15", istDatum: "2025-12-18", status: "erreicht" },
    { id: "ms_si_001_2", workspaceId: WS_ID, projectId: "p_si_2026_001", bezeichnung: "Rohbau OG", reihenfolge: 1, sollDatum: isoPlus(15), status: "laufend" },
    { id: "ms_si_001_3", workspaceId: WS_ID, projectId: "p_si_2026_001", bezeichnung: "Innenausbau", reihenfolge: 2, sollDatum: "2026-08-31", status: "geplant" },
    { id: "ms_si_001_4", workspaceId: WS_ID, projectId: "p_si_2026_001", bezeichnung: "Übergabe an Familie Lehmann", reihenfolge: 3, sollDatum: "2026-12-31", status: "geplant" },
    { id: "ms_si_005_1", workspaceId: WS_ID, projectId: "p_si_2026_005", bezeichnung: "Erdarbeiten + Bodenplatte", reihenfolge: 0, sollDatum: "2025-10-31", istDatum: "2025-11-05", status: "erreicht" },
    { id: "ms_si_005_2", workspaceId: WS_ID, projectId: "p_si_2026_005", bezeichnung: "Rohbau bis OK Decke 2.OG", reihenfolge: 1, sollDatum: isoPlus(30), status: "laufend" },
    { id: "ms_si_005_3", workspaceId: WS_ID, projectId: "p_si_2026_005", bezeichnung: "Förmliche Abnahme", reihenfolge: 2, sollDatum: "2027-06-30", status: "geplant" },
  ]);

  /* ============== ABNAHME (für Bürohaus, abgeschlossen) ============== */
  await db.insert(abnahmen).values([
    {
      id: "ab_si_011",
      workspaceId: WS_ID,
      projectId: "p_si_2024_011",
      kind: "foermlich",
      abnahmeDate: "2024-12-10",
      abnahmeOrt: "Koblenzer Str. 88, Bonn",
      gesamtbeurteilung: "mit_unwesentlichen_maengeln",
      attendees: JSON.stringify([
        { name: "Anke Schneider", role: "AG-Geschäftsleitung", signed: true },
        { name: "Marcus Weber", role: "AG-Projektleitung", signed: true },
        { name: "Hans Brandstetter", role: "AN-Geschäftsleitung Bauunion Bonn", signed: true },
      ]),
      vertragsstrafeAgreed: true,
      vertragsstrafeReserved: false,
      handoverComplete: true,
      notes: "Mängel-Vorbehalt: 3 Bagatell-Mängel im Foyer (Boden-Fugen, Lichtschalter EG, Dichtung Eingangstür).",
    },
  ]);

  /* ============== MÄNGEL ============== */
  await db.insert(maengel).values([
    {
      id: "ma_si_011_fugen",
      workspaceId: WS_ID,
      projectId: "p_si_2024_011",
      phase: "gewaehrleistung",
      kategorie: "Fußboden · Foyer",
      beschreibung: "Fugen-Risse im Foyer-Boden EG, Länge ca. 3 m. Aufgetreten 18 Monate nach Abnahme.",
      ortImBauwerk: "Foyer EG",
      gemeldetVon: "Mieter (Hausverwaltung)",
      gemeldetAm: isoPlus(-12),
      status: "in_bearbeitung",
      prioritaet: "mittel",
      fristsetzungDatum: isoPlus(8),
      kostenGeschaetztCents: eur(2_800),
    },
    {
      id: "ma_si_001_holz",
      workspaceId: WS_ID,
      projectId: "p_si_2026_001",
      phase: "ausfuehrung",
      kategorie: "Holzwerk · Treppe",
      beschreibung: "Holztreppe geliefert mit fehlerhafter Maserung — Familie Lehmann verweigert Einbau.",
      ortImBauwerk: "Treppenhaus EG-OG",
      gemeldetVon: "Familie Lehmann",
      gemeldetAm: isoPlus(-3),
      status: "offen",
      prioritaet: "hoch",
    },
  ]);

  await db.insert(maengelAnzeigen).values([
    {
      id: "maa_si_011_fugen",
      workspaceId: WS_ID,
      mangelId: "ma_si_011_fugen",
      versendetAm: isoPlus(-10),
      versandweg: "einschreiben",
      inhaltText: "Sehr geehrte Damen und Herren, wir rügen hiermit die im Foyer-Boden EG aufgetretenen Fugen-Risse. Wir setzen Ihnen gem. § 13 Abs. 5 VOB/B eine Frist zur Mangelbeseitigung von 14 Werktagen.",
      anzeigeAnExtern: "Bauunion Bonn GmbH (AN) · info@bauunion-bonn.de",
    },
  ]);

  /* ============== BAUTAGEBUCH (AG-Sicht: Begehungen, Anordnungen) ============== */
  await db.insert(bautagebuchEntries).values([
    {
      id: "bt_si_001",
      workspaceId: WS_ID,
      projectId: "p_si_2026_001",
      authorId: USER_PL,
      authorName: "M. Weber",
      entryDate: isoPlus(-3),
      category: "anordnung",
      text: "AG-Begehung mit Familie Lehmann. Familie wünscht Holztreppe statt Stahltreppe — Mehrkosten ca. 4.500 EUR. Anordnung schriftlich nachreichen.",
      weatherCondition: "sonnig",
      temperatureCelsius: 15,
      urgency: "warning",
      suggestion: "Schriftliche Anordnung mit Mehrkosten-Bestätigung an AN versenden",
      createdAt: dateAgo(3),
    },
    {
      id: "bt_si_002",
      workspaceId: WS_ID,
      projectId: "p_si_2026_005",
      authorId: USER_PL,
      authorName: "M. Weber",
      entryDate: isoPlus(-1),
      category: "besichtigung",
      text: "Wöchentliche Bauüberwachung MFH Hennef. Hansen Generalbau im Plan, Rohbau OG verläuft termingerecht.",
      weatherCondition: "bewoelkt",
      temperatureCelsius: 11,
      urgency: "info",
      createdAt: dateAgo(1),
    },
  ]);

  /* ============== VORGÄNGE ============== */
  await db.insert(vorgaenge).values([
    {
      id: "vg_si_anordnung_holz",
      workspaceId: WS_ID,
      projectId: "p_si_2026_001",
      title: "AG-Anordnung Familie Lehmann · Holztreppe statt Stahltreppe",
      category: "vertragspflicht",
      status: "in_bearbeitung",
      riskScore: 32,
      createdBy: USER_PL,
      assignedTo: USER_GF,
      dueDate: isoPlus(2),
      createdAt: dateAgo(3),
      updatedAt: dateAgoH(12),
    },
    {
      id: "vg_si_ruege_fugen",
      workspaceId: WS_ID,
      projectId: "p_si_2024_011",
      title: "Mängelrüge AN · Fugen-Risse Foyer (Gewährleistung)",
      category: "maengelruege",
      status: "in_bearbeitung",
      riskScore: 55,
      createdBy: USER_PL,
      dueDate: isoPlus(8),
      createdAt: dateAgo(12),
      updatedAt: dateAgo(10),
    },
  ]);

  await db.insert(vorgangAuditLog).values([
    { id: "au_si_1", vorgangId: "vg_si_anordnung_holz", actorId: USER_PL, action: "created", payloadJson: JSON.stringify({ title: "AG-Anordnung Holztreppe" }), createdAt: dateAgo(3) },
    { id: "au_si_2", vorgangId: "vg_si_ruege_fugen", actorId: USER_PL, action: "created", payloadJson: JSON.stringify({ title: "Mängelrüge Fugen Foyer" }), createdAt: dateAgo(12) },
  ]);

  /* ============== ANFRAGEN ============== */
  await db.insert(queries).values([
    { id: "q_si_001", workspaceId: WS_ID, userId: USER_GF, question: "Verbraucherbauvertrag — welche Widerrufsfristen?", category: "BGB", createdAt: dateAgo(20) },
    { id: "q_si_002", workspaceId: WS_ID, userId: USER_PL, question: "Mängelrüge in der Gewährleistung — welche Form ist Pflicht?", category: "Mängel", createdAt: dateAgo(11) },
  ]);

  console.log("  ✓ Schneider Immo: 3 Projekte · 4 Verträge · 2 Sicherheiten · 4 Fristen · 7 Meilensteine · 2 Mängel · 2 Vorgänge");
}
