/**
 * Seed-Workspace: Hoffmann + Partner Architekten (Ingenieurbüro).
 *
 * HOAI-Welt — 3 Projekte über alle LP, mit voller Demo der ING-Lücken-Module:
 * Hinweise (§ 650p BGB), Bemusterungen (LP5/LP8), HOAI-Kostenversionierung,
 * Sachverständige, Subplaner-Vergaben, Meilensteine, Stunden je LP.
 */
import { db } from "../index";
import { serializeDisciplines } from "@/lib/workspace/disciplines";
import {
  workspaces,
  users,
  projects,
  contracts,
  projectContacts,
  fristen,
  bautagebuchEntries,
  meilensteine,
  hinweise,
  hoaiKostenVersionen,
  bemusterungen,
  sachverstaendige,
  subplanerVergaben,
  mitarbeiter,
  stunden,
  ausgangsrechnungen,
  ausgangsrechnungPositionen,
  vorgaenge,
  vorgangAuditLog,
  queries,
} from "../schema";
import { isoPlus, dateAgo, dateAgoH, eur } from "./lib";

export const WS_ID = "ws_hoffmann_partner";
const USER_GF = "u_hp_ingrid";
const USER_ARCH = "u_hp_markus";
const USER_BL = "u_hp_lena";

export async function seedHoffmannWorkspace(): Promise<void> {
  console.log("→ Workspace: Hoffmann + Partner Architekten (Ingenieurbüro)");

  await db.insert(workspaces).values({
    id: WS_ID,
    name: "Hoffmann + Partner Architekten",
    tier: "team",
    workspaceRole: "ingenieurbuero",
    // Generalplanung — Hochbau mit eigener Tragwerks-/TGA-/Bauphysik-Kompetenz
    // und SiGeKo. Spiegelt das Demo-Projekt-Portfolio (KiTa, Stadtvilla, Schule).
    disciplinesJson: serializeDisciplines([
      "hochbau_objektplanung",
      "tragwerksplanung",
      "tga",
      "bauphysik",
      "sigeko_projektsteuerung",
    ]),
    disciplineSubprofile: "generalplanung",
    clientFocus: "gemischt",
    companySize: 18,
    vobLicenseStatus: "active",
    vobLicenseProvider: "din_media",
    address: "Hoffmann + Partner · Hindenburgallee 14 · 50968 Köln",
    email: "info@hoffmann-partner.de",
    phone: "+49 30 0000-0003",
    taxId: "000/0000/0003",
    vatId: "DE100000003",
    iban: "DE00100000000000000003",
    bauabzugPflichtig: false,
  });

  await db.insert(users).values([
    {
      id: USER_GF,
      workspaceId: WS_ID,
      name: "Ingrid Hoffmann",
      email: "i.hoffmann@hoffmann-partner.de",
      role: "admin",
      memberRole: "gf",
      roleLabel: "Inhaberin · Architektin",
      hasLicense: true,
      lastLoginAt: new Date(),
    },
    {
      id: USER_ARCH,
      workspaceId: WS_ID,
      name: "Markus Berg",
      email: "m.berg@hoffmann-partner.de",
      role: "user",
      memberRole: "ingenieur",
      roleLabel: "Architekt · LP1-7",
      hasLicense: true,
      lastLoginAt: dateAgoH(6),
    },
    {
      id: USER_BL,
      workspaceId: WS_ID,
      name: "Lena Vogt",
      email: "l.vogt@hoffmann-partner.de",
      role: "user",
      memberRole: "bauleiter",
      roleLabel: "Bauleitung · LP8",
      hasLicense: true,
      lastLoginAt: dateAgoH(2),
    },
  ]);

  /* ============== PROJEKTE (mit HOAI-Stammdaten) ============== */
  await db.insert(projects).values([
    {
      // 1. KiTa — laufende Bauleitung (LP8)
      id: "p_hp_2025_007",
      workspaceId: WS_ID,
      identifier: "AP-2025-007",
      name: "Kindertagesstätte Köln-Ehrenfeld",
      ag: "Stadt Köln · Amt für Kinder, Jugend und Familie",
      value: 0, // ING führt nur HOAI-Honorar
      status: "Bauphase",
      progress: 0.55,
      contractType: "bgb_werkvertrag",
      contractDate: "2024-08-15",
      plannedCompletion: "2026-08-31",
      siteAddress: "Venloer Str. 421, 50825 Köln",
      lat: 50.954,
      lon: 6.892,
      isBauleistung: false,
      hoaiLeistungsbild: "gebaeude",
      hoaiParagraph: "§ 35 HOAI",
      hoaiHonorarzone: "III",
      hoaiSatz: "mittel",
      hoaiAnrechenbareKostenCents: eur(2_400_000),
      hoaiBeauftragteLpsJson: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]),
      hoaiUmbauZuschlagPct: 0,
      hoaiNebenkostenPct: 6,
      hoaiHonorarsummeNettoCents: eur(287_400),
      hoaiBerechnetAm: dateAgo(120),
      notes: "Vollauftrag LP1-9 · Bauleitung läuft (LP8).",
    },
    {
      // 2. Stadtvilla — LP8 läuft, Privatbauherr
      id: "p_hp_2024_019",
      workspaceId: WS_ID,
      identifier: "AP-2024-019",
      name: "Stadtvilla Bonn Südstadt",
      ag: "Privat · Familie Dr. Berghaus",
      value: 0,
      status: "Bauphase",
      progress: 0.78,
      contractType: "bgb_werkvertrag",
      contractDate: "2023-11-01",
      plannedCompletion: "2026-04-30",
      siteAddress: "Kaiserstr. 88, 53113 Bonn",
      lat: 50.715,
      lon: 7.097,
      hoaiLeistungsbild: "gebaeude",
      hoaiParagraph: "§ 35 HOAI",
      hoaiHonorarzone: "IV",
      hoaiSatz: "mittel",
      hoaiAnrechenbareKostenCents: eur(850_000),
      hoaiBeauftragteLpsJson: JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9]),
      hoaiUmbauZuschlagPct: 0,
      hoaiNebenkostenPct: 7,
      hoaiHonorarsummeNettoCents: eur(127_800),
      hoaiBerechnetAm: dateAgo(60),
      vertraulich: true,
    },
    {
      // 3. Schulerweiterung — Wettbewerb / Geplant (LP1-3)
      id: "p_hp_2026_002",
      workspaceId: WS_ID,
      identifier: "AP-2026-002",
      name: "Schulerweiterung Leverkusen-Opladen",
      ag: "Stadt Leverkusen · Schulträger",
      value: 0,
      status: "Geplant",
      progress: 0.12,
      contractType: "bgb_werkvertrag",
      contractDate: isoPlus(-30),
      plannedCompletion: "2028-06-30",
      siteAddress: "Goetheplatz 1, 51379 Leverkusen",
      lat: 51.075,
      lon: 7.005,
      hoaiLeistungsbild: "gebaeude",
      hoaiParagraph: "§ 35 HOAI",
      hoaiHonorarzone: "III",
      hoaiSatz: "mittel",
      hoaiAnrechenbareKostenCents: eur(1_200_000),
      hoaiBeauftragteLpsJson: JSON.stringify([1, 2, 3]),
      hoaiUmbauZuschlagPct: 25,
      hoaiNebenkostenPct: 6,
      hoaiHonorarsummeNettoCents: eur(48_300),
      hoaiBerechnetAm: dateAgo(20),
      notes: "Auftrag nur LP1-3 (Vorplanung-Ausführungsplanung) — LP4-9 separate Vergabe.",
    },
  ]);

  /* ============== KONTAKTE ============== */
  await db.insert(projectContacts).values([
    // KiTa
    { id: "pc_hp_007_ag", workspaceId: WS_ID, projectId: "p_hp_2025_007", role: "ag_vertreter", name: "Dr. Karin Wessel", organization: "Stadt Köln · Amt 51", email: "k.wessel@demo-stadt.example", phone: "+49 221 221-23456" },
    { id: "pc_hp_007_an", workspaceId: WS_ID, projectId: "p_hp_2025_007", role: "nachunternehmer", name: "Hansen Generalbau (AN)", organization: "Demo Generalbau GmbH", email: "vergabe@demo-generalbau.example" },
    // Stadtvilla
    { id: "pc_hp_019_ag", workspaceId: WS_ID, projectId: "p_hp_2024_019", role: "ag_vertreter", name: "Dr. Stefan Berghaus", organization: "Familie Berghaus", email: "berghaus@private.de" },
    { id: "pc_hp_019_an", workspaceId: WS_ID, projectId: "p_hp_2024_019", role: "nachunternehmer", name: "Müller Bau (AN)", organization: "Müller Bau GmbH", email: "info@muellerbau.de" },
    // Schulerweiterung
    { id: "pc_hp_002_ag", workspaceId: WS_ID, projectId: "p_hp_2026_002", role: "ag_vertreter", name: "Heinrich Bauer", organization: "Stadt Leverkusen · Schulträger", email: "h.bauer@demo-stadt.example" },
  ]);

  /* ============== HOAI-VERTRÄGE ============== */
  await db.insert(contracts).values([
    {
      id: "ct_hp_007_haupt",
      workspaceId: WS_ID,
      projectId: "p_hp_2025_007",
      title: "HOAI-Vertrag · KiTa Köln-Ehrenfeld · LP1-9",
      kind: "hauptvertrag",
      contractText: "Architektenleistungen LP1-9 nach HOAI 2021. Honorarzone III, Mittelsatz. Anrechenbare Kosten Stand Bauantrag: 2.400.000 EUR.",
      signedAt: "2024-08-15",
      partyAg: "Stadt Köln",
      partyAn: "Hoffmann + Partner Architekten",
      riskScore: 18,
    },
    {
      id: "ct_hp_019_haupt",
      workspaceId: WS_ID,
      projectId: "p_hp_2024_019",
      title: "HOAI-Vertrag · Stadtvilla Bonn",
      kind: "hauptvertrag",
      contractText: "Architektenleistungen LP1-9. Honorarzone IV, Mittelsatz.",
      signedAt: "2023-11-01",
      partyAg: "Familie Berghaus",
      partyAn: "Hoffmann + Partner Architekten",
      riskScore: 15,
    },
    {
      id: "ct_hp_002_haupt",
      workspaceId: WS_ID,
      projectId: "p_hp_2026_002",
      title: "HOAI-Vertrag · Schulerweiterung · LP1-3",
      kind: "hauptvertrag",
      contractText: "Architektenleistungen LP1-3 nach HOAI 2021. Umbau-Zuschlag 25 %.",
      signedAt: isoPlus(-30),
      partyAg: "Stadt Leverkusen",
      partyAn: "Hoffmann + Partner Architekten",
      riskScore: 22,
    },
  ]);

  /* ============== HOAI-KOSTEN-VERSIONEN ============== */
  await db.insert(hoaiKostenVersionen).values([
    // KiTa: Planungsgrundlage → Kostenanschlag → Änderung AG (Mehrfläche)
    { id: "hkv_hp_007_1", workspaceId: WS_ID, projectId: "p_hp_2025_007", effectiveAt: "2024-08-15", anrechenbareKostenCents: eur(2_100_000), anlass: "planung_grundlage", honorarsummeNettoCents: eur(248_500), notes: "Vertragsabschluss · LP1-Beginn." },
    { id: "hkv_hp_007_2", workspaceId: WS_ID, projectId: "p_hp_2025_007", effectiveAt: "2024-12-20", anrechenbareKostenCents: eur(2_280_000), anlass: "kostenanschlag", honorarsummeNettoCents: eur(269_800), notes: "Kostenanschlag nach Vorplanung." },
    { id: "hkv_hp_007_3", workspaceId: WS_ID, projectId: "p_hp_2025_007", effectiveAt: "2025-09-15", anrechenbareKostenCents: eur(2_400_000), anlass: "aenderung_ag", honorarsummeNettoCents: eur(287_400), notes: "AG-Wunsch zusätzlicher Mehrzweckraum (+120k)." },
    // Stadtvilla
    { id: "hkv_hp_019_1", workspaceId: WS_ID, projectId: "p_hp_2024_019", effectiveAt: "2023-11-01", anrechenbareKostenCents: eur(720_000), anlass: "planung_grundlage", honorarsummeNettoCents: eur(108_400) },
    { id: "hkv_hp_019_2", workspaceId: WS_ID, projectId: "p_hp_2024_019", effectiveAt: "2024-06-12", anrechenbareKostenCents: eur(850_000), anlass: "kostenanschlag", honorarsummeNettoCents: eur(127_800), notes: "Materialqualität AG-Wunsch hochgesetzt." },
    // Schulerweiterung
    { id: "hkv_hp_002_1", workspaceId: WS_ID, projectId: "p_hp_2026_002", effectiveAt: isoPlus(-30), anrechenbareKostenCents: eur(1_200_000), anlass: "planung_grundlage", honorarsummeNettoCents: eur(48_300), notes: "Vorplanung gestartet." },
  ]);

  /* ============== HINWEISPFLICHT-DOKU (§ 650p BGB) ============== */
  await db.insert(hinweise).values([
    {
      id: "hw_hp_007_kosten",
      workspaceId: WS_ID,
      projectId: "p_hp_2025_007",
      anlass: "kostensteigerung",
      datum: isoPlus(-15),
      empfaengerName: "Dr. Karin Wessel",
      empfaengerRolle: "AG-Vertreterin",
      form: "schriftlich",
      wortlaut: "Sehr geehrte Frau Dr. Wessel, wir weisen darauf hin, dass die Materialpreissteigerungen seit Vertragsabschluss (insbes. Stahl + Holzbau) zu einer Anpassung der anrechenbaren Kosten um ca. 8 % führen werden. Die Honorarsumme ist gem. § 10 II HOAI entsprechend anzupassen.",
      potentialKostenwirkungCents: eur(192_000),
      agReaktion: "in_bearbeitung",
      agReaktionDatum: isoPlus(-10),
      agReaktionText: "AG hat schriftlich Prüfung im Stadtrat zugesagt.",
      status: "nachverfolgt",
      notes: "Wichtig für Honorar-Nachforderung — Beweismittel.",
    },
    {
      id: "hw_hp_019_material",
      workspaceId: WS_ID,
      projectId: "p_hp_2024_019",
      anlass: "materialwahl",
      datum: isoPlus(-45),
      empfaengerName: "Dr. Stefan Berghaus",
      empfaengerRolle: "Bauherr",
      form: "email",
      wortlaut: "Sehr geehrter Herr Dr. Berghaus, wir weisen ausdrücklich darauf hin, dass das von Ihnen gewünschte Holz-Eichenparkett (massiv) im Bad-Bereich nicht für Feuchträume geeignet ist. Bei Wasserschäden besteht erhebliches Quell-/Schimmel-Risiko. Wir empfehlen Eichen-Mehrschichtparkett mit Wasserdampfsperre.",
      agReaktion: "akzeptiert",
      agReaktionDatum: isoPlus(-40),
      agReaktionText: "Bauherr stimmt Mehrschichtparkett zu.",
      status: "geschlossen",
    },
    {
      id: "hw_hp_007_termin",
      workspaceId: WS_ID,
      projectId: "p_hp_2025_007",
      anlass: "terminverzug",
      datum: isoPlus(-7),
      empfaengerName: "Hansen Generalbau (AN)",
      empfaengerRolle: "Auftragnehmer",
      form: "schriftlich",
      wortlaut: "Hiermit weisen wir den ausführenden AN darauf hin, dass die Plan-Lieferung Tragwerk für 2.OG bislang ausstand und gerade beim AG zur Stellungnahme liegt. Bauablauf-Plan ist entsprechend zu strecken.",
      agReaktion: "keine",
      status: "erteilt",
    },
  ]);

  /* ============== BEMUSTERUNGS-PROTOKOLLE ============== */
  await db.insert(bemusterungen).values([
    {
      id: "bm_hp_007_boden",
      workspaceId: WS_ID,
      projectId: "p_hp_2025_007",
      datum: isoPlus(-25),
      gewerk: "Bodenbelag",
      raumBauteil: "Gruppenräume EG + 1.OG",
      material: "Linoleum 2.5 mm, antibakteriell, FCKW-frei",
      hersteller: "Forbo",
      artikelNr: "Marmoleum Real 3038",
      farbeVariante: "caribbean — hellgrün",
      empfehlung: "Empfohlen wegen pflegeleichtem Reinigungsbild und KiTa-Tauglichkeit.",
      agEntscheidung: "ausgewaehlt",
      agEntscheiderName: "Dr. Karin Wessel",
      agEntscheidungDatum: isoPlus(-22),
      status: "entschieden",
    },
    {
      id: "bm_hp_007_wand",
      workspaceId: WS_ID,
      projectId: "p_hp_2025_007",
      datum: isoPlus(-12),
      gewerk: "Wandfarben",
      raumBauteil: "Gruppenräume",
      material: "Mineralfarbe schadstofffrei",
      hersteller: "Keim",
      artikelNr: "Optil 9510",
      farbeVariante: "Schöllkraut · NCS S 0540-G50Y",
      empfehlung: "KiTa-spezifisch · diffusionsoffen, gute Reinigungsfähigkeit.",
      agEntscheidung: "alternative",
      agEntscheiderName: "Dr. Karin Wessel",
      agEntscheidungDatum: isoPlus(-8),
      status: "vorgelegt",
      notes: "AG wünscht weitere Farbalternative — neue Bemusterung folgt.",
    },
    {
      id: "bm_hp_019_kueche",
      workspaceId: WS_ID,
      projectId: "p_hp_2024_019",
      datum: isoPlus(-60),
      gewerk: "Sanitär",
      raumBauteil: "Bad-EG · Bad-OG",
      material: "Wandfliese Feinsteinzeug 60×120",
      hersteller: "Villeroy & Boch",
      artikelNr: "Pure Stone 2682PS61",
      farbeVariante: "weiß-grau · matt",
      agEntscheidung: "ausgewaehlt",
      agEntscheiderName: "Dr. Stefan Berghaus",
      agEntscheidungDatum: isoPlus(-55),
      status: "entschieden",
    },
    {
      id: "bm_hp_019_kuechen",
      workspaceId: WS_ID,
      projectId: "p_hp_2024_019",
      datum: isoPlus(-3),
      gewerk: "Tischlerei · Küche",
      raumBauteil: "Wohnküche EG",
      material: "Küchenfront Massivholz Eiche, geölt",
      hersteller: "Bulthaup",
      artikelNr: "B3 Korpus 670 · Eiche natur geölt",
      farbeVariante: "Eiche natur",
      empfehlung: "Höherwertige Wahl — passend zum Innenausbau-Stand.",
      agEntscheidung: "offen",
      status: "vorgelegt",
    },
  ]);

  /* ============== SUBPLANER-VERGABEN ============== */
  await db.insert(subplanerVergaben).values([
    { id: "sv_hp_007_tw", workspaceId: WS_ID, projektId: "p_hp_2025_007", fachplanerName: "Tragwerk Tahir Ingenieure GmbH", fachplanerKontakt: "kontakt@tahir-ing.de", leistungsbereich: "tragwerk", lpReferenzJson: JSON.stringify([1, 2, 3, 4, 5, 6]), vergabeDatum: "2024-09-01", vergabeSummeCents: eur(38_500), status: "beauftragt", createdAt: dateAgo(280), updatedAt: dateAgo(280) },
    { id: "sv_hp_007_tga", workspaceId: WS_ID, projektId: "p_hp_2025_007", fachplanerName: "Eberhardt + Partner Ingenieure", fachplanerKontakt: "info@demo-tga-planer.example", leistungsbereich: "tga", lpReferenzJson: JSON.stringify([2, 3, 5, 6]), vergabeDatum: "2024-10-10", vergabeSummeCents: eur(42_000), status: "beauftragt", createdAt: dateAgo(260), updatedAt: dateAgo(260) },
    { id: "sv_hp_007_bra", workspaceId: WS_ID, projektId: "p_hp_2025_007", fachplanerName: "Brandschutz Köln GmbH", leistungsbereich: "brandschutz", lpReferenzJson: JSON.stringify([4, 5]), vergabeDatum: "2025-02-15", vergabeSummeCents: eur(8_500), status: "abgeschlossen", createdAt: dateAgo(180), updatedAt: dateAgo(150) },
    { id: "sv_hp_019_tw", workspaceId: WS_ID, projektId: "p_hp_2024_019", fachplanerName: "Tragwerk Tahir Ingenieure GmbH", leistungsbereich: "tragwerk", lpReferenzJson: JSON.stringify([1, 2, 3, 4, 5]), vergabeDatum: "2023-12-01", vergabeSummeCents: eur(18_500), status: "abgeschlossen", createdAt: dateAgo(450), updatedAt: dateAgo(220) },
    { id: "sv_hp_002_geo", workspaceId: WS_ID, projektId: "p_hp_2026_002", fachplanerName: "Geotechnik Rheinland", leistungsbereich: "geotechnik", lpReferenzJson: JSON.stringify([1, 2]), vergabeDatum: isoPlus(-12), vergabeSummeCents: eur(6_800), status: "angefragt", createdAt: dateAgo(12), updatedAt: dateAgo(12) },
  ]);

  /* ============== SACHVERSTÄNDIGE ============== */
  await db.insert(sachverstaendige).values([
    {
      id: "sv_hp_019_feucht",
      workspaceId: WS_ID,
      projectId: "p_hp_2024_019",
      anlass: "baumangel",
      fragestellung: "Ist die Feuchteerscheinung im Keller der Stadtvilla auf einen Bauwerksabdichtungs-Mangel oder eine wasserführende Schicht im Untergrund zurückzuführen?",
      rechtsgrundlage: "privatauftrag",
      sachverstaendigerName: "Dr. Helga Brückner",
      sachverstaendigerOrganization: "ÖbVI Brückner · Bausachverstand",
      sachverstaendigerEmail: "brueckner@bausv-brueckner.de",
      beauftragtAm: isoPlus(-20),
      fristGutachten: isoPlus(15),
      kostenGeschaetztCents: eur(2_800),
      kostenTraeger: "ag",
      status: "beauftragt",
    },
  ]);

  /* ============== MEILENSTEINE ============== */
  await db.insert(meilensteine).values([
    // KiTa
    { id: "ms_hp_007_1", workspaceId: WS_ID, projectId: "p_hp_2025_007", bezeichnung: "LP1-2 abgeschlossen (Grundlagen + Vorplanung)", reihenfolge: 0, sollDatum: "2024-11-30", istDatum: "2024-11-30", status: "erreicht" },
    { id: "ms_hp_007_2", workspaceId: WS_ID, projectId: "p_hp_2025_007", bezeichnung: "LP3-4 abgeschlossen (Entwurf + Genehmigung)", reihenfolge: 1, sollDatum: "2025-04-30", istDatum: "2025-05-12", status: "erreicht" },
    { id: "ms_hp_007_3", workspaceId: WS_ID, projectId: "p_hp_2025_007", bezeichnung: "Baubeginn", reihenfolge: 2, sollDatum: "2025-08-15", istDatum: "2025-08-20", status: "erreicht" },
    { id: "ms_hp_007_4", workspaceId: WS_ID, projectId: "p_hp_2025_007", bezeichnung: "Rohbau abgeschlossen", reihenfolge: 3, sollDatum: isoPlus(40), status: "verzoegert", verzoegerungGrund: "Plan-Verzug Tragwerk + Materialknappheit Stahl" },
    { id: "ms_hp_007_5", workspaceId: WS_ID, projectId: "p_hp_2025_007", bezeichnung: "Förmliche Abnahme", reihenfolge: 4, sollDatum: "2026-08-31", status: "geplant" },
    // Stadtvilla
    { id: "ms_hp_019_1", workspaceId: WS_ID, projectId: "p_hp_2024_019", bezeichnung: "LP1-4 abgeschlossen", reihenfolge: 0, sollDatum: "2024-04-30", istDatum: "2024-04-25", status: "erreicht" },
    { id: "ms_hp_019_2", workspaceId: WS_ID, projectId: "p_hp_2024_019", bezeichnung: "Rohbau fertig", reihenfolge: 1, sollDatum: "2025-06-30", istDatum: "2025-07-08", status: "erreicht" },
    { id: "ms_hp_019_3", workspaceId: WS_ID, projectId: "p_hp_2024_019", bezeichnung: "Innenausbau abgeschlossen", reihenfolge: 2, sollDatum: isoPlus(60), status: "laufend" },
    { id: "ms_hp_019_4", workspaceId: WS_ID, projectId: "p_hp_2024_019", bezeichnung: "Übergabe Familie Berghaus", reihenfolge: 3, sollDatum: "2026-04-30", status: "geplant" },
    // Schulerweiterung
    { id: "ms_hp_002_1", workspaceId: WS_ID, projectId: "p_hp_2026_002", bezeichnung: "LP1 (Grundlagenermittlung)", reihenfolge: 0, sollDatum: isoPlus(45), status: "laufend" },
    { id: "ms_hp_002_2", workspaceId: WS_ID, projectId: "p_hp_2026_002", bezeichnung: "LP2 (Vorplanung) abgeschlossen", reihenfolge: 1, sollDatum: isoPlus(120), status: "geplant" },
    { id: "ms_hp_002_3", workspaceId: WS_ID, projectId: "p_hp_2026_002", bezeichnung: "LP3 (Entwurfsplanung) Übergabe an AG", reihenfolge: 2, sollDatum: isoPlus(220), status: "geplant" },
  ]);

  /* ============== FRISTEN ============== */
  await db.insert(fristen).values([
    { id: "f_hp_001", workspaceId: WS_ID, projectId: "p_hp_2025_007", task: "Bemusterung Wandfarbe — neue Alternative für AG vorlegen", deadline: isoPlus(4) },
    { id: "f_hp_002", workspaceId: WS_ID, projectId: "p_hp_2025_007", task: "Honorar-Nachforderung erstellen (Kostensteigerung Material)", deadline: isoPlus(14), legalBasis: "§ 10 II HOAI" },
    { id: "f_hp_003", workspaceId: WS_ID, projectId: "p_hp_2024_019", task: "Sachverständigen-Termin Feuchte-Schaden Keller koordinieren", deadline: isoPlus(7) },
    { id: "f_hp_004", workspaceId: WS_ID, projectId: "p_hp_2024_019", task: "Bemusterung Küchenfront Eiche — AG-Entscheidung einholen", deadline: isoPlus(2) },
    { id: "f_hp_005", workspaceId: WS_ID, projectId: "p_hp_2026_002", task: "Vorplanung LP2 — Abgabe an Stadt Leverkusen", deadline: isoPlus(60) },
  ]);

  /* ============== BAUTAGEBUCH (LP8 — Bauüberwachung) ============== */
  await db.insert(bautagebuchEntries).values([
    {
      id: "bt_hp_001",
      workspaceId: WS_ID,
      projectId: "p_hp_2025_007",
      authorId: USER_BL,
      authorName: "L. Vogt",
      entryDate: isoPlus(0),
      category: "besichtigung",
      text: "LP8-Bauüberwachung. Hansen Generalbau verlegt aktuell Estrich Halle Eingangsbereich. Tragwerk Halle 2.OG fehlt weiterhin — Folge-Termin verschiebt sich.",
      weatherCondition: "bewoelkt",
      temperatureCelsius: 14,
      urgency: "warning",
      createdAt: dateAgoH(4),
    },
    {
      id: "bt_hp_002",
      workspaceId: WS_ID,
      projectId: "p_hp_2024_019",
      authorId: USER_BL,
      authorName: "L. Vogt",
      entryDate: isoPlus(-1),
      category: "mangel",
      text: "Feuchteerscheinung im Keller Eingangsbereich entdeckt. SV Brückner beauftragt — Klärung Ursache (Abdichtung vs. wasserführende Schicht).",
      weatherCondition: "regen",
      temperatureCelsius: 9,
      trigger: "mangelruege",
      triggerLabel: "Feuchte-Verdacht",
      urgency: "warning",
      createdAt: dateAgo(1),
    },
  ]);

  /* ============== MITARBEITER + STUNDEN (× LP) ============== */
  await db.insert(mitarbeiter).values([
    { id: "ma_hp_ingrid", workspaceId: WS_ID, name: "Ingrid Hoffmann", personalnummer: "HP-001", lohnart: "monat", monatsgehaltCents: eur(8_500), gewerk: "GF + Architektin", eintrittDatum: "2003-04-01", aktiv: true },
    { id: "ma_hp_markus", workspaceId: WS_ID, name: "Markus Berg", personalnummer: "HP-005", lohnart: "monat", monatsgehaltCents: eur(5_800), gewerk: "Architekt", eintrittDatum: "2018-09-01", aktiv: true },
    { id: "ma_hp_lena", workspaceId: WS_ID, name: "Lena Vogt", personalnummer: "HP-008", lohnart: "monat", monatsgehaltCents: eur(5_200), gewerk: "Bauleitung", eintrittDatum: "2020-03-01", aktiv: true },
    { id: "ma_hp_sara", workspaceId: WS_ID, name: "Sara Lindner", personalnummer: "HP-011", lohnart: "stunden", stundensatzCents: eur(38), gewerk: "Bauzeichnerin", eintrittDatum: "2022-09-01", aktiv: true },
  ]);

  // Stunden je LP × Projekt — letzte Woche
  const days = [-6, -5, -4, -3, -2];
  const stundenInserts: typeof stunden.$inferInsert[] = [];
  for (const d of days) {
    // Lena (Bauleitung) auf KiTa LP8 + Stadtvilla LP8
    stundenInserts.push({ id: `st_hp_lena_007_${d}`, workspaceId: WS_ID, mitarbeiterId: "ma_hp_lena", projektId: "p_hp_2025_007", datum: isoPlus(d), stunden: 5, taetigkeit: "Bauüberwachung KiTa (LP8)", leistungsphase: 8, stundensatzCents: eur(5_200 / 173.33) });
    stundenInserts.push({ id: `st_hp_lena_019_${d}`, workspaceId: WS_ID, mitarbeiterId: "ma_hp_lena", projektId: "p_hp_2024_019", datum: isoPlus(d), stunden: 3, taetigkeit: "Bauüberwachung Stadtvilla (LP8)", leistungsphase: 8, stundensatzCents: eur(5_200 / 173.33) });
    // Markus (Architekt) auf Schulerweiterung LP1-2
    stundenInserts.push({ id: `st_hp_markus_002_${d}`, workspaceId: WS_ID, mitarbeiterId: "ma_hp_markus", projektId: "p_hp_2026_002", datum: isoPlus(d), stunden: 6, taetigkeit: "Vorplanung Schulerweiterung (LP2)", leistungsphase: 2, stundensatzCents: eur(5_800 / 173.33) });
    // Sara (Zeichnerin) auf KiTa LP5
    stundenInserts.push({ id: `st_hp_sara_007_${d}`, workspaceId: WS_ID, mitarbeiterId: "ma_hp_sara", projektId: "p_hp_2025_007", datum: isoPlus(d), stunden: 8, taetigkeit: "Werkpläne Innenausbau (LP5)", leistungsphase: 5, stundensatzCents: eur(38) });
  }
  await db.insert(stunden).values(stundenInserts);

  /* ============== HOAI-AUSGANGSRECHNUNGEN ============== */
  await db.insert(ausgangsrechnungen).values([
    {
      id: "ar_hp_007_a1",
      workspaceId: WS_ID,
      projectId: "p_hp_2025_007",
      number: "AR-2025-HP-0001",
      kind: "abschlag",
      abschlagNo: 1,
      invoiceDate: "2025-02-15",
      dueDate: "2025-03-17",
      partyAg: "Stadt Köln · Amt für Kinder, Jugend und Familie",
      partyAn: "Hoffmann + Partner Architekten",
      partyAnTaxId: "000/0000/0003",
      partyAnVatId: "DE100000003",
      vatPercent: 19,
      reverseCharge: false,
      previousAbschlaegeNet: 0,
      totalPositionsNet: 87_300,
      payoutNet: 87_300,
      payoutVat: 16_587,
      payoutGross: 103_887,
      status: "bezahlt",
      sentAt: new Date("2025-02-16"),
      paidAt: new Date("2025-03-12"),
      paidAmount: 103_887,
    },
    {
      id: "ar_hp_007_a2",
      workspaceId: WS_ID,
      projectId: "p_hp_2025_007",
      number: "AR-2025-HP-0008",
      kind: "abschlag",
      abschlagNo: 2,
      invoiceDate: isoPlus(-22),
      dueDate: isoPlus(8),
      partyAg: "Stadt Köln",
      partyAn: "Hoffmann + Partner Architekten",
      vatPercent: 19,
      previousAbschlaegeNet: 87_300,
      totalPositionsNet: 76_500,
      payoutNet: 76_500,
      payoutVat: 14_535,
      payoutGross: 91_035,
      status: "versendet",
      sentAt: dateAgo(20),
    },
    {
      id: "ar_hp_019_schluss",
      workspaceId: WS_ID,
      projectId: "p_hp_2024_019",
      number: "AR-2025-HP-0011",
      kind: "schluss",
      invoiceDate: isoPlus(-3),
      dueDate: isoPlus(27),
      partyAg: "Familie Berghaus",
      partyAn: "Hoffmann + Partner Architekten",
      vatPercent: 19,
      previousAbschlaegeNet: 95_000,
      totalPositionsNet: 32_800,
      payoutNet: 32_800,
      payoutVat: 6_232,
      payoutGross: 39_032,
      status: "versendet",
      sentAt: dateAgo(2),
    },
  ]);

  await db.insert(ausgangsrechnungPositionen).values([
    { id: "arp_hp_007_a2_1", workspaceId: WS_ID, ausgangsrechnungId: "ar_hp_007_a2", sortIndex: 0, oz: "LP3", description: "LP3 Entwurfsplanung — anteilig", quantity: 1, unit: "psch", unitPrice: 24_500, totalPrice: 24_500, lpReferenz: 3 },
    { id: "arp_hp_007_a2_2", workspaceId: WS_ID, ausgangsrechnungId: "ar_hp_007_a2", sortIndex: 1, oz: "LP4", description: "LP4 Genehmigungsplanung", quantity: 1, unit: "psch", unitPrice: 19_800, totalPrice: 19_800, lpReferenz: 4 },
    { id: "arp_hp_007_a2_3", workspaceId: WS_ID, ausgangsrechnungId: "ar_hp_007_a2", sortIndex: 2, oz: "LP5", description: "LP5 Ausführungsplanung — anteilig", quantity: 1, unit: "psch", unitPrice: 32_200, totalPrice: 32_200, lpReferenz: 5 },
    { id: "arp_hp_019_s_1", workspaceId: WS_ID, ausgangsrechnungId: "ar_hp_019_schluss", sortIndex: 0, oz: "LP8", description: "LP8 Objektüberwachung — Restleistung", quantity: 1, unit: "psch", unitPrice: 22_000, totalPrice: 22_000, lpReferenz: 8 },
    { id: "arp_hp_019_s_2", workspaceId: WS_ID, ausgangsrechnungId: "ar_hp_019_schluss", sortIndex: 1, oz: "LP9", description: "LP9 Objektbetreuung Phase 1", quantity: 1, unit: "psch", unitPrice: 10_800, totalPrice: 10_800, lpReferenz: 9 },
  ]);

  /* ============== VORGÄNGE ============== */
  await db.insert(vorgaenge).values([
    {
      id: "vg_hp_kostensteigerung",
      workspaceId: WS_ID,
      projectId: "p_hp_2025_007",
      title: "Honorar-Nachforderung KiTa · Kostensteigerung 8 %",
      category: "vertragspflicht",
      status: "in_bearbeitung",
      riskScore: 45,
      createdBy: USER_GF,
      assignedTo: USER_GF,
      dueDate: isoPlus(14),
      createdAt: dateAgo(15),
      updatedAt: dateAgo(10),
    },
    {
      id: "vg_hp_feuchte_keller",
      workspaceId: WS_ID,
      projectId: "p_hp_2024_019",
      title: "Feuchte-Schaden Keller Stadtvilla — SV beauftragt",
      category: "maengelruege",
      status: "wartet_auf_anwalt",
      riskScore: 60,
      createdBy: USER_BL,
      dueDate: isoPlus(15),
      createdAt: dateAgo(20),
      updatedAt: dateAgo(8),
    },
  ]);

  await db.insert(vorgangAuditLog).values([
    { id: "au_hp_1", vorgangId: "vg_hp_kostensteigerung", actorId: USER_GF, action: "created", payloadJson: JSON.stringify({ title: "Honorar-Nachforderung Kostensteigerung" }), createdAt: dateAgo(15) },
    { id: "au_hp_2", vorgangId: "vg_hp_feuchte_keller", actorId: USER_BL, action: "created", payloadJson: JSON.stringify({ title: "Feuchte-Schaden Keller" }), createdAt: dateAgo(20) },
  ]);

  /* ============== ANFRAGEN ============== */
  await db.insert(queries).values([
    { id: "q_hp_001", workspaceId: WS_ID, userId: USER_GF, question: "HOAI § 10 — Kostenanpassung Honorar bei AG-bedingten Mehrkosten", category: "HOAI", createdAt: dateAgo(15) },
    { id: "q_hp_002", workspaceId: WS_ID, userId: USER_BL, question: "Architektenhinweispflicht § 650p — wann formal schriftlich?", category: "BGB", createdAt: dateAgo(45) },
    { id: "q_hp_003", workspaceId: WS_ID, userId: USER_ARCH, question: "Umbau-Zuschlag HOAI — Voraussetzungen und Höhe", category: "HOAI", createdAt: dateAgo(8) },
  ]);

  console.log("  ✓ Hoffmann + Partner: 3 Projekte · 6 HOAI-Versionen · 3 Hinweise · 4 Bemusterungen · 5 Subplaner · 1 SV · 12 Meilensteine · 4 MA + 20 Stundensätze · 3 ARs");
}
