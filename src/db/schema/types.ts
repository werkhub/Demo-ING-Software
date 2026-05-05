/**
 * Zentrales Type-Bündel. Alle inferred types und String-Literal-Unions an einem
 * Ort, damit Konsumenten nicht aus 9 Domain-Files importieren müssen.
 */
import type {
  workspaces,
  users,
} from "./core";
import type {
  projects,
  contracts,
  subcontractors,
  subcontractorCertificates,
  securities,
  nachtraege,
  projectContacts,
} from "./projekte";
import type { fristen } from "./fristen";
import type { queries } from "./assistent";
import type {
  bautagebuchEntries,
  beweisChecklists,
  bautagebuchFotos,
  behinderungen,
} from "./bautagebuch";
import type {
  legalChunks,
  licensedSources,
  licensedAccessLog,
  caseDecisions,
} from "./legal";
import type {
  vorgaenge,
  vorgangDocuments,
  vorgangAnalysisSteps,
  vorgangCitations,
  vorgangDrafts,
  vorgangAuditLog,
  vorgangLinks,
} from "./vorgaenge";
import type {
  rechnungen,
  rechnungPositionen,
  rechnungAnomalien,
} from "./rechnungen";
import type { anzeigen } from "./anzeigen";
import type { abnahmen } from "./abnahme";
import type { maengel, maengelAnzeigen } from "./maengel";
import type { hinschgMeldungen, hinschgMessages } from "./hinschg";
import type { lv, lvItems } from "./lv";
import type { aufmass, aufmassZeilen } from "./aufmass";
import type {
  aufmassPrueferTokens,
  aufmassPrueferAccessLog,
} from "./aufmass-pruefer";
import type {
  ausgangsrechnungen,
  ausgangsrechnungPositionen,
  ausgangsrechnungCounter,
  ausgangsrechnungMahnungen,
} from "./ausgangsrechnungen";
import type {
  mitarbeiter,
  stunden,
  stundenWochenLock,
} from "./stunden";
import type {
  geraete,
  geraeteDisposition,
  geraeteWartung,
} from "./geraete";
import type {
  nuAuftraege,
  nuAuftraegeLv,
  nuEingangsrechnungen,
  nuSicherheitsKonto,
} from "./nu-operations";
import type {
  bestellungen,
  bestellungenPositionen,
  lieferscheine,
  lieferscheinePositionen,
  materialMatch,
} from "./material";
import type { datevExports } from "./datev";
import type {
  liquiditaetSzenarien,
  liquiditaetZeitreihe,
} from "./liquiditaet";
import type { nachkalkulationSnapshots } from "./nachkalk";
import type {
  plaene,
  plaeneVersionen,
  plaeneFreigaben,
  plaeneVersand,
  dokumente,
} from "./plaene";
import type { permissionsMatrix } from "./permissions";
import type { hinweise } from "./hinweise";
import type { hoaiKostenVersionen } from "./hoai-kosten-versionen";
import type { bemusterungen } from "./bemusterung";
import type { sachverstaendige } from "./sachverstaendige";
import type { meilensteine } from "./meilensteine";

/* ============== INFERRED ROW-TYPES ============== */

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Frist = typeof fristen.$inferSelect;
export type NewFrist = typeof fristen.$inferInsert;

export type Query = typeof queries.$inferSelect;
export type NewQuery = typeof queries.$inferInsert;

export type BautagebuchEntry = typeof bautagebuchEntries.$inferSelect;
export type NewBautagebuchEntry = typeof bautagebuchEntries.$inferInsert;

export type BautagebuchFoto = typeof bautagebuchFotos.$inferSelect;
export type NewBautagebuchFoto = typeof bautagebuchFotos.$inferInsert;

export type Behinderung = typeof behinderungen.$inferSelect;
export type NewBehinderung = typeof behinderungen.$inferInsert;

export type LegalChunk = typeof legalChunks.$inferSelect;
export type NewLegalChunk = typeof legalChunks.$inferInsert;

export type CaseDecision = typeof caseDecisions.$inferSelect;
export type NewCaseDecision = typeof caseDecisions.$inferInsert;

export type LicensedSource = typeof licensedSources.$inferSelect;
export type NewLicensedSource = typeof licensedSources.$inferInsert;
export type LicensedAccessLog = typeof licensedAccessLog.$inferSelect;
export type NewLicensedAccessLog = typeof licensedAccessLog.$inferInsert;

export type Nachtrag = typeof nachtraege.$inferSelect;
export type NewNachtrag = typeof nachtraege.$inferInsert;

export type Contract = typeof contracts.$inferSelect;
export type NewContract = typeof contracts.$inferInsert;

export type Subcontractor = typeof subcontractors.$inferSelect;
export type NewSubcontractor = typeof subcontractors.$inferInsert;

export type SubcontractorCertificate =
  typeof subcontractorCertificates.$inferSelect;
export type NewSubcontractorCertificate =
  typeof subcontractorCertificates.$inferInsert;

export type Security = typeof securities.$inferSelect;
export type NewSecurity = typeof securities.$inferInsert;

export type ProjectContact = typeof projectContacts.$inferSelect;
export type NewProjectContact = typeof projectContacts.$inferInsert;

export type BeweisChecklist = typeof beweisChecklists.$inferSelect;
export type NewBeweisChecklist = typeof beweisChecklists.$inferInsert;

export type Vorgang = typeof vorgaenge.$inferSelect;
export type NewVorgang = typeof vorgaenge.$inferInsert;
export type VorgangDocument = typeof vorgangDocuments.$inferSelect;
export type NewVorgangDocument = typeof vorgangDocuments.$inferInsert;
export type VorgangAnalysisStep = typeof vorgangAnalysisSteps.$inferSelect;
export type NewVorgangAnalysisStep = typeof vorgangAnalysisSteps.$inferInsert;
export type VorgangCitation = typeof vorgangCitations.$inferSelect;
export type NewVorgangCitation = typeof vorgangCitations.$inferInsert;
export type VorgangDraft = typeof vorgangDrafts.$inferSelect;
export type NewVorgangDraft = typeof vorgangDrafts.$inferInsert;
export type VorgangAuditEntry = typeof vorgangAuditLog.$inferSelect;
export type NewVorgangAuditEntry = typeof vorgangAuditLog.$inferInsert;
export type VorgangLink = typeof vorgangLinks.$inferSelect;
export type NewVorgangLink = typeof vorgangLinks.$inferInsert;

export type Rechnung = typeof rechnungen.$inferSelect;
export type NewRechnung = typeof rechnungen.$inferInsert;
export type RechnungPosition = typeof rechnungPositionen.$inferSelect;
export type NewRechnungPosition = typeof rechnungPositionen.$inferInsert;
export type RechnungAnomalie = typeof rechnungAnomalien.$inferSelect;
export type NewRechnungAnomalie = typeof rechnungAnomalien.$inferInsert;

export type Anzeige = typeof anzeigen.$inferSelect;
export type NewAnzeige = typeof anzeigen.$inferInsert;

export type Abnahme = typeof abnahmen.$inferSelect;
export type NewAbnahme = typeof abnahmen.$inferInsert;
export type Mangel = typeof maengel.$inferSelect;
export type NewMangel = typeof maengel.$inferInsert;
export type MangelAnzeige = typeof maengelAnzeigen.$inferSelect;
export type NewMangelAnzeige = typeof maengelAnzeigen.$inferInsert;

export type HinschgMeldung = typeof hinschgMeldungen.$inferSelect;
export type NewHinschgMeldung = typeof hinschgMeldungen.$inferInsert;
export type HinschgMessage = typeof hinschgMessages.$inferSelect;
export type NewHinschgMessage = typeof hinschgMessages.$inferInsert;

export type Lv = typeof lv.$inferSelect;
export type NewLv = typeof lv.$inferInsert;
export type LvItem = typeof lvItems.$inferSelect;
export type NewLvItem = typeof lvItems.$inferInsert;

export type Aufmass = typeof aufmass.$inferSelect;
export type NewAufmass = typeof aufmass.$inferInsert;
export type AufmassZeile = typeof aufmassZeilen.$inferSelect;
export type NewAufmassZeile = typeof aufmassZeilen.$inferInsert;

export type AufmassPrueferToken = typeof aufmassPrueferTokens.$inferSelect;
export type NewAufmassPrueferToken = typeof aufmassPrueferTokens.$inferInsert;
export type AufmassPrueferAccessLogEntry =
  typeof aufmassPrueferAccessLog.$inferSelect;
export type NewAufmassPrueferAccessLogEntry =
  typeof aufmassPrueferAccessLog.$inferInsert;
export type AufmassPrueferAction = "view" | "approve" | "reduce" | "dispute";

export type Ausgangsrechnung = typeof ausgangsrechnungen.$inferSelect;
export type NewAusgangsrechnung = typeof ausgangsrechnungen.$inferInsert;
export type AusgangsrechnungPosition =
  typeof ausgangsrechnungPositionen.$inferSelect;
export type NewAusgangsrechnungPosition =
  typeof ausgangsrechnungPositionen.$inferInsert;
export type AusgangsrechnungCounter =
  typeof ausgangsrechnungCounter.$inferSelect;
export type NewAusgangsrechnungCounter =
  typeof ausgangsrechnungCounter.$inferInsert;
export type AusgangsrechnungMahnung =
  typeof ausgangsrechnungMahnungen.$inferSelect;
export type NewAusgangsrechnungMahnung =
  typeof ausgangsrechnungMahnungen.$inferInsert;

export type Mitarbeiter = typeof mitarbeiter.$inferSelect;
export type NewMitarbeiter = typeof mitarbeiter.$inferInsert;
export type StundenEintrag = typeof stunden.$inferSelect;
export type NewStundenEintrag = typeof stunden.$inferInsert;
export type StundenWochenLock = typeof stundenWochenLock.$inferSelect;
export type NewStundenWochenLock = typeof stundenWochenLock.$inferInsert;

export type Geraet = typeof geraete.$inferSelect;
export type NewGeraet = typeof geraete.$inferInsert;
export type GeraeteDisposition = typeof geraeteDisposition.$inferSelect;
export type NewGeraeteDisposition = typeof geraeteDisposition.$inferInsert;
export type GeraeteWartung = typeof geraeteWartung.$inferSelect;
export type NewGeraeteWartung = typeof geraeteWartung.$inferInsert;

export type NuAuftrag = typeof nuAuftraege.$inferSelect;
export type NewNuAuftrag = typeof nuAuftraege.$inferInsert;
export type NuAuftragLvPosition = typeof nuAuftraegeLv.$inferSelect;
export type NewNuAuftragLvPosition = typeof nuAuftraegeLv.$inferInsert;
export type NuEingangsrechnung = typeof nuEingangsrechnungen.$inferSelect;
export type NewNuEingangsrechnung = typeof nuEingangsrechnungen.$inferInsert;
export type NuSicherheitsKontoEintrag =
  typeof nuSicherheitsKonto.$inferSelect;
export type NewNuSicherheitsKontoEintrag =
  typeof nuSicherheitsKonto.$inferInsert;

export type Bestellung = typeof bestellungen.$inferSelect;
export type NewBestellung = typeof bestellungen.$inferInsert;
export type BestellungPosition = typeof bestellungenPositionen.$inferSelect;
export type NewBestellungPosition = typeof bestellungenPositionen.$inferInsert;
export type Lieferschein = typeof lieferscheine.$inferSelect;
export type NewLieferschein = typeof lieferscheine.$inferInsert;
export type LieferscheinPosition =
  typeof lieferscheinePositionen.$inferSelect;
export type NewLieferscheinPosition =
  typeof lieferscheinePositionen.$inferInsert;
export type MaterialMatchRow = typeof materialMatch.$inferSelect;
export type NewMaterialMatchRow = typeof materialMatch.$inferInsert;

export type DatevExport = typeof datevExports.$inferSelect;
export type NewDatevExport = typeof datevExports.$inferInsert;

export type LiquiditaetSzenario = typeof liquiditaetSzenarien.$inferSelect;
export type NewLiquiditaetSzenario = typeof liquiditaetSzenarien.$inferInsert;
export type LiquiditaetZeitreiheRow = typeof liquiditaetZeitreihe.$inferSelect;
export type NewLiquiditaetZeitreiheRow =
  typeof liquiditaetZeitreihe.$inferInsert;

export type NachkalkSnapshot = typeof nachkalkulationSnapshots.$inferSelect;
export type NewNachkalkSnapshot =
  typeof nachkalkulationSnapshots.$inferInsert;

export type Plan = typeof plaene.$inferSelect;
export type NewPlan = typeof plaene.$inferInsert;
export type PlanVersion = typeof plaeneVersionen.$inferSelect;
export type NewPlanVersion = typeof plaeneVersionen.$inferInsert;
export type PlanFreigabe = typeof plaeneFreigaben.$inferSelect;
export type NewPlanFreigabe = typeof plaeneFreigaben.$inferInsert;
export type PlanVersand = typeof plaeneVersand.$inferSelect;
export type NewPlanVersand = typeof plaeneVersand.$inferInsert;
export type Dokument = typeof dokumente.$inferSelect;
export type NewDokument = typeof dokumente.$inferInsert;

export type PlanIndexKategorie = "entwurf" | "freigegeben";
export type PlanVersandweg =
  | "email"
  | "brief"
  | "einschreiben"
  | "uebergabe"
  | "upload";

export type PermissionsMatrixRow = typeof permissionsMatrix.$inferSelect;
export type NewPermissionsMatrixRow = typeof permissionsMatrix.$inferInsert;

export type Hinweis = typeof hinweise.$inferSelect;
export type NewHinweis = typeof hinweise.$inferInsert;
export type HinweisAnlass =
  | "kostensteigerung"
  | "planungsaenderung"
  | "materialwahl"
  | "risiko"
  | "terminverzug"
  | "sonstiges";
export type HinweisForm = "muendlich" | "schriftlich" | "email";
export type HinweisStatus = "entwurf" | "erteilt" | "nachverfolgt" | "geschlossen";
export type HinweisAgReaktion =
  | "keine"
  | "akzeptiert"
  | "abgelehnt"
  | "in_bearbeitung";

export type HoaiKostenVersion = typeof hoaiKostenVersionen.$inferSelect;
export type NewHoaiKostenVersion = typeof hoaiKostenVersionen.$inferInsert;
export type HoaiKostenAnlass =
  | "planung_grundlage"
  | "kostenanschlag"
  | "kostenfeststellung"
  | "aenderung_ag"
  | "aenderung_planung";

export type Bemusterung = typeof bemusterungen.$inferSelect;
export type NewBemusterung = typeof bemusterungen.$inferInsert;
export type BemusterungStatus = "entwurf" | "vorgelegt" | "entschieden";
export type BemusterungAgEntscheidung =
  | "offen"
  | "ausgewaehlt"
  | "abgelehnt"
  | "alternative";

export type Sachverstaendiger = typeof sachverstaendige.$inferSelect;
export type NewSachverstaendiger = typeof sachverstaendige.$inferInsert;
export type SachverstaendigenAnlass =
  | "maengelstreit"
  | "aufmassstreit"
  | "baufortschritt"
  | "baumangel"
  | "sonstiges";
export type SachverstaendigenRechtsgrundlage =
  | "paragraph_485_zpo"
  | "privatauftrag"
  | "gerichtsbeauftragt"
  | "sonstiges";
export type SachverstaendigenStatus =
  | "angefragt"
  | "beauftragt"
  | "gutachten_erhalten"
  | "geschlossen";
export type SachverstaendigenKostenTraeger = "ag" | "an" | "geteilt" | "streit";

export type Meilenstein = typeof meilensteine.$inferSelect;
export type NewMeilenstein = typeof meilensteine.$inferInsert;
export type MeilensteinStatus =
  | "geplant"
  | "laufend"
  | "erreicht"
  | "verzoegert"
  | "abgesagt";

/* ============== STRING-LITERAL-UNIONS ============== */

export type LegalSource = "bgb" | "hoai" | "vob_a" | "vob_b" | "vob_c";

export type ProjectStatus =
  | "Geplant"
  | "Bauphase"
  | "Abnahme"
  | "Gewährleistung"
  | "Abgeschlossen";

export type ContractType =
  | "bgb_werkvertrag"
  | "vob_vertrag"
  | "verbraucherbauvertrag";

export type Urgency = "critical" | "warning" | "info";

export type BautagebuchCategory =
  | "allgemein"
  | "anordnung"
  | "behinderung"
  | "mangel"
  | "bedenken"
  | "lieferung"
  | "besichtigung"
  | "personal";

export type WeatherCondition =
  | "sonnig"
  | "bewoelkt"
  | "regen"
  | "schnee"
  | "frost"
  | "sturm"
  | "nebel";

export type WeatherSource = "manual" | "api";

export type BehinderungArt =
  | "frost"
  | "sturm"
  | "starkregen"
  | "hitze"
  | "sonstiges";

/**
 * Workspace-Typ — fusioniert die alten Konzepte „Rolle" + „Branche" zu einer
 * einzigen Liste. Siehe core.ts für Bedeutung.
 *
 *   bauunternehmer — VOB/B-Welt (vorher: Rolle "an")
 *   bauherr        — AG-Sicht  (vorher: Rolle "ag")
 *   ingenieurbuero — HOAI-Welt (vorher: Rolle "ps" oder "bl" oder
 *                    industry="ingenieurbuero")
 */
export type WorkspaceRole = "bauunternehmer" | "bauherr" | "ingenieurbuero";

/**
 * Fachdisziplinen (mehrfach am Workspace auswählbar).
 *
 * Orthogonal zu workspaceRole — ein bauunternehmer-Workspace mit Tiefbau-
 * Schwerpunkt sieht andere Vorlagen als ein Hochbau-BU; ein ingenieurbuero-
 * Workspace mit Verkehrsanlagen-Fokus sieht andere HOAI-Tafeln als ein
 * Hochbau-IB.
 *
 * Steuert HOAI-Rechner-Sichtbarkeit, Vorlagen-Auswahl, Recht-Assistent-
 * Perspektive, Bautagebuch-Felder und priorisierte Bibliotheks-Inhalte.
 */
export const DISCIPLINES = [
  "hochbau_objektplanung",   // HOAI § 35 — Gebäude
  "tragwerksplanung",        // HOAI § 51 — Tragwerk
  "tga",                     // HOAI § 56 — Technische Ausrüstung
  "bauphysik",               // Brand-/Wärme-/Schallschutz, kein HOAI
  "verkehrsanlagen",         // HOAI § 43 — Straßen, Plätze, Bahn
  "ingenieurbauwerke",       // HOAI § 47 — Wasser, Brücken, Stützmauern, Tunnel
  "freianlagen",             // HOAI § 39 — Landschaftsplanung
  "vermessung",              // VV-Verträge, ggf. Ländersätze
  "bauwerkspruefung",        // DIN 1076 — Brückenprüfung
  "sigeko_projektsteuerung", // SiGeKo + AHO/Projektsteuerung
] as const;
export type Discipline = (typeof DISCIPLINES)[number];

/**
 * Schnell-Presets für das Onboarding. Setzen ein Default-Set von
 * `disciplines` und passen weitere Defaults (z. B. clientFocus).
 *
 *   "custom" = User-Disziplinen wurden manuell überarbeitet, kein Preset-Match.
 */
export const DISCIPLINE_SUBPROFILES = [
  "hochbau_klassisch",       // Wilfling-Typ: Objekt+Tragwerk+Bauphysik+SiGeKo
  "tiefbau_infrastruktur",   // INGPLAN-Typ: Verkehr+Ingenieurbauwerke+Freianlagen+Vermessung
  "tga_spezialist",          // Reines TGA-Büro
  "tragwerk_spezialist",     // Reines Tragwerksbüro
  "generalplanung",          // Hochbau + Tragwerk + TGA + Bauphysik + SiGeKo
  "pruefingenieur",          // Bauwerksprüfung-fokussiert
  "custom",                  // Manuelle Auswahl
] as const;
export type DisciplineSubprofile = (typeof DISCIPLINE_SUBPROFILES)[number];

/**
 * Auftraggeber-Schwerpunkt. Steuert Sichtbarkeit von Vergabe-,
 * Förderprojekt- und Honorarprüfungs-Workflows.
 */
export const CLIENT_FOCUS = ["privat", "gemischt", "oeffentlich"] as const;
export type ClientFocus = (typeof CLIENT_FOCUS)[number];

export type HoaiLeistungsbild =
  | "gebaeude"
  | "ingenieurbau"
  | "tragwerk"
  | "tga"
  | "verkehr";

export type HoaiHonorarzone = "I" | "II" | "III" | "IV" | "V";

export type HoaiSatz = "min" | "mittel" | "max";

export type VobLicenseProvider = "none" | "din_media" | "juris" | "beck_online";
export type VobPreferredExternalProvider =
  | "all"
  | "juris"
  | "din_media"
  | "beck_online";

export type VorgangCategory =
  | "maengelruege"
  | "anlieferung"
  | "vertragspflicht"
  | "sonstiges";
export type VorgangStatus =
  | "offen"
  | "in_bearbeitung"
  | "wartet_auf_anwalt"
  | "abgeschlossen"
  | "archiviert";
export type VorgangAnalysisKind = "klassifikation" | "recherche" | "empfehlung";
export type VorgangCitationKind = "bgb" | "hoai" | "vob" | "urteil" | "intern";
export type VorgangDraftKind = "email" | "brief";
export type VorgangDraftStatus = "entwurf" | "gesendet" | "verworfen";
export type VorgangLinkKind =
  | "project"
  | "contract"
  | "bautagebuch"
  | "frist"
  | "vorgang"
  | "rechnung";

export type RechnungStatus =
  | "eingegangen"
  | "geprueft"
  | "freigegeben"
  | "abgelehnt";
export type RechnungAnomalieKind =
  | "price_jump"
  | "not_in_contract"
  | "duplicate"
  | "math_error"
  | "format_warning";
export type AnomalieSeverity = "info" | "warning" | "critical";

export type SubcontractorCertificateKind =
  | "freistellung_48b"
  | "unbedenklich_finanzamt"
  | "soka_bau"
  | "unbedenklich_kk"
  | "bg_bau"
  | "mindestlohn"
  | "a1_entsendung"
  | "gewerbeanmeldung"
  | "haftpflicht";

export type SubcontractorCertificateStatus =
  | "gueltig"
  | "abgelaufen"
  | "fehlt"
  | "angefordert";

export type ComplianceLevel = "ok" | "warning" | "critical";

export type SecurityKind =
  | "vertragserfuellung"
  | "maengelanspruch"
  | "vorauszahlung"
  | "bareinbehalt"
  | "bauhandwerker";

export type SecurityDirection =
  | "provided_to_ag"
  | "received_from_ag"
  | "provided_by_nu";

export type SecurityReleaseTrigger =
  | "bei_abnahme"
  | "bei_gewaehrleistungsende"
  | "manuell";

export type SecurityStatus =
  | "aktiv"
  | "rueckgabe_angefordert"
  | "freigegeben"
  | "verfallen";

export type SecurityState = "aktiv" | "expiring" | "overdue" | "released";

export type AnzeigeKind = "behinderung" | "bedenken";

export type AnzeigeStatus =
  | "entwurf"
  | "versendet"
  | "bestaetigt"
  | "zurueckgewiesen"
  | "erledigt";

export type AnzeigeRecipientRole =
  | "ag_vertreter"
  | "bauleiter_ag"
  | "architekt"
  | "fachplaner"
  | "sonstiges";

export type AnzeigeCausedBy =
  | "ag_anordnung"
  | "fehlende_plaene"
  | "vorgewerk"
  | "hoehere_gewalt"
  | "wetter"
  | "streik"
  | "sonstiges";

export type AnzeigeConcernAbout =
  | "ausfuehrungsart"
  | "bauseits_stoffe"
  | "vorleistung"
  | "planvorgabe"
  | "sonstiges";

export type AbnahmeKind =
  | "foermlich"
  | "fiktiv"
  | "konkludent"
  | "teilabnahme"
  | "verweigert";

export type AbnahmeBeurteilung =
  | "mangelfrei"
  | "mit_unwesentlichen_maengeln"
  | "mit_wesentlichen_maengeln"
  | "verweigert";

export type AbnahmeAttendee = {
  name: string;
  role: string;
  signed: boolean;
};

export type MangelPhase = "ausfuehrung" | "abnahme" | "gewaehrleistung";
export type MangelStatus =
  | "offen"
  | "in_bearbeitung"
  | "behoben"
  | "abgelehnt"
  | "strittig";
export type MangelPrioritaet = "niedrig" | "mittel" | "hoch" | "kritisch";
export type MangelDeadlineState = "ok" | "expiring" | "overdue" | "done";
export type MangelAnzeigeVersandweg =
  | "email"
  | "brief"
  | "einschreiben"
  | "uebergabe";
export type GewaehrleistungEndState = "ok" | "expiring" | "expired";

export type HinschgCategory =
  | "korruption"
  | "diskriminierung"
  | "arbeitssicherheit"
  | "umwelt"
  | "datenschutz"
  | "finanz"
  | "arbeitsrecht"
  | "sonstiges";

export type HinschgStatus =
  | "eingegangen"
  | "in_pruefung"
  | "massnahme_ergriffen"
  | "abgeschlossen"
  | "unbegruendet"
  | "archiviert";

export type HinschgUiState =
  | "neu"
  | "ack_ueberfaellig"
  | "in_pruefung"
  | "antwort_ueberfaellig"
  | "abgeschlossen"
  | "unbegruendet"
  | "archiviert";

export type HinschgMessageDirection = "from_reporter" | "from_office";

export type LvStatus =
  | "entwurf"
  | "angebot"
  | "auftrag"
  | "aufmass"
  | "abgerechnet";

export type LvItemKind =
  | "titel"
  | "untertitel"
  | "position"
  | "eventual"
  | "bedarfsposition"
  | "stundenlohn";

export type AufmassStatus =
  | "entwurf"
  | "eingereicht"
  | "geprueft"
  | "freigegeben"
  | "abgerechnet";

export type AufmassZeileStatus =
  | "offen"
  | "zugestimmt"
  | "gekuerzt"
  | "bestritten";

export type AusgangsrechnungKind = "abschlag" | "schluss";

export type AusgangsrechnungStatus =
  | "entwurf"
  | "versendet"
  | "teilweise_bezahlt"
  | "bezahlt"
  | "mahnung_1"
  | "mahnung_2"
  | "mahnung_3"
  | "gerichtlich";

export type MitarbeiterLohnart = "stunden" | "monat";

export type GeraetKategorie =
  | "kran"
  | "bagger"
  | "radlader"
  | "geruest"
  | "handwerk"
  | "fahrzeug"
  | "sonstiges";

export type GeraetStatus =
  | "verfuegbar"
  | "disponiert"
  | "in_wartung"
  | "defekt"
  | "ausgemustert";

export type GeraetEigentum = "eigen" | "miete" | "leasing";

export type DispositionStatus = "geplant" | "aktiv" | "zurueck" | "storniert";

export type WartungArt =
  | "uvv_pruefung"
  | "tuev"
  | "inspektion"
  | "reparatur";

export type WartungState = "done" | "ok" | "expiring" | "overdue";

export type DatevExportArt = "verkauf" | "einkauf_nu" | "lohn";
export type DatevKontenrahmen = "skr03" | "skr04";

export type NuAuftragVertragstyp = "vob" | "bgb" | "werkvertrag";
export type NuAuftragStatus = "offen" | "laufend" | "fertig" | "gekuendigt";
export type NuRechnungStatus =
  | "eingegangen"
  | "geprueft"
  | "gezahlt"
  | "strittig";
export type NuSicherheitsArt = "vertragserfuellung" | "gewaehrleistung";

export type PlanTyp =
  | "architektur"
  | "statik"
  | "tga"
  | "elektro"
  | "sanitaer"
  | "detail"
  | "sonstiges";

export type PlanStatus =
  | "entwurf"
  | "zur_freigabe"
  | "freigegeben"
  | "aufgehoben";

export type FreigabeStatus =
  | "offen"
  | "zugestimmt"
  | "abgelehnt"
  | "zurueckgestellt";

/** Domain-Rolle eines Users im Workspace (Modul 4.8). */
export type MemberRole =
  // Bauunternehmer-spezifisch
  | "gf"
  | "kalkulator"
  | "polier"
  | "buchhaltung"
  // Ingenieurbüro-spezifisch
  | "ingenieur"
  | "bauleiter"
  | "verwaltung"
  | "zeichner"
  // Universal
  | "viewer"
  | "admin";

/** Resourcen, die per Permission-Matrix gesteuert werden (Modul 4.8). */
export type PermissionResource =
  | "team"
  | "permissions"
  | "projekte"
  | "vorgaenge"
  | "bautagebuch"
  | "maengel"
  | "plaene"
  | "geraete"
  | "stunden"
  | "lv"
  | "aufmass"
  | "ausgangsrechnungen"
  | "mahnungen"
  | "eingangsrechnungen"
  | "nachkalk"
  | "datev"
  | "finanzen";

export type PermissionAction = "read" | "write";

/** Eintrag im JSON-Override-Array auf users.permissionsOverrideJson. */
export type PermissionOverride = {
  resource: PermissionResource;
  action: PermissionAction;
  allowed: boolean;
};
