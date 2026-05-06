/**
 * Demo-Datensatz für den Ausschreibungs-Radar.
 *
 * Geformt wie Treffer es WÄREN, wenn wir tatsächlich DTVP / eVergabe / TED /
 * Subreport / Land-Plattformen scrapen würden. IDs sind stabil (für die
 * tender_feed_watch / tender_feed_hidden-Joins). Felder bewusst breit, damit
 * der spätere Real-Adapter dieselbe Form befüllen kann.
 */

import type { Discipline, ClientFocus } from "@/db/schema/types";
import type { TenderPlatform } from "./platforms";

export type TenderFeedItem = {
  /** Stabile ID — referenziert von tender_feed_watch / tender_feed_hidden. */
  id: string;
  /** Plattform-ID aus platforms.ts, z. B. "dtvp", "ted". */
  platformId: TenderPlatform["id"];
  /** Veröffentlichungs-URL (Detail-Seite der Ausschreibung). Mock-URL. */
  url: string;
  /** Vergabestelle (Auftraggeber). */
  vergabestelle: string;
  /** Kurztitel — wie er in Listen-Ansichten erscheint. */
  title: string;
  /** Länger: 1-2 Sätze, was beschafft wird. */
  description: string;
  /** Vergabe- / Verfahrens-Nummer der Stelle. */
  vergabeNr: string;
  /** Verfahrensart in lesbarer Form. */
  verfahrensart: string;
  /** Geschätzter Auftragswert in EUR netto. null = nicht angegeben. */
  wertEur: number | null;
  /** Bundesland (ISO-2: BY, NRW, BE, HH, BW, NDS, HE, RP, SH, ST, SN, TH, MV, BB, SL, HB). */
  bundesland: string;
  /** PLZ-Präfix (1-stellig) für grobe Region. */
  plzPraefix: string;
  /** Disziplin/Gewerk-Tags (mehrere möglich). */
  disciplines: readonly Discipline[];
  /** Auftraggeber-Schwerpunkt — privat / oeffentlich / gemischt. */
  clientFocus: ClientFocus;
  /** ISO-Datum YYYY-MM-DD — Angebotsabgabe-Frist. */
  angebotsfrist: string;
  /** ISO-Datum YYYY-MM-DD — Veröffentlichungsdatum. */
  publishedAt: string;
  /** EU-Verfahren (Wert ≥ Schwellenwert)? */
  isEu: boolean;
  /** Volltext-Snippet (BVB-/Aufforderungs-Auszug), wird in den Analyzer übergeben. */
  excerpt: string;
};

const today = new Date();
function isoIn(days: number): string {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const TENDER_FEED_ITEMS: readonly TenderFeedItem[] = [
  {
    id: "dtvp-2026-001",
    platformId: "dtvp",
    url: "https://www.dtvp.de/Center/notice/CXP4YVDDXNK",
    vergabestelle: "Stadt Lüdenscheid · Hochbauamt",
    title: "Dachsanierung Sporthalle Buckesfeld",
    description:
      "Komplettsanierung Flachdach 1.250 m² inkl. Dämmung WLG 035, Lichtkuppeln und Dachrandanschluss.",
    vergabeNr: "2026-HB-014",
    verfahrensart: "Öffentliche Ausschreibung (VOB/A § 3)",
    wertEur: 480_000,
    bundesland: "NRW",
    plzPraefix: "5",
    disciplines: ["hochbau_objektplanung", "bauphysik"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(18),
    publishedAt: isoIn(-3),
    isEu: false,
    excerpt: `Auftraggeber: Stadt Lüdenscheid — Hochbauamt
Vergabe-Nr.: 2026-HB-014
Verfahrensart: Öffentliche Ausschreibung nach VOB/A § 3
Leistung: Dachsanierung Sporthalle Buckesfeld, ca. 1.250 m² inkl. Dämmung WLG 035

Termine
- Angebotsabgabe bis: ${isoIn(18)}, 11:00 Uhr (elektronisch über DTVP)
- Bieterfragen bis: ${isoIn(10)}, 12:00 Uhr

Eignung
Mindestjahresumsatz im Bereich Bedachung: 1.500.000 EUR
3 vergleichbare Referenzen. PQ-VOB oder Eigenerklärung Formblatt 124.

Vertragsbedingungen
- Vertragsstrafe: 0,3 % je Werktag, max. 5 %.
- Vertragserfüllungsbürgschaft 5 %, Gewährleistungsbürgschaft 5 %, 5 Jahre Gewährleistung.`,
  },
  {
    id: "evergabe-bund-2026-088",
    platformId: "evergabe-bund",
    url: "https://www.evergabe-online.de/tenderdetails.html?id=88012",
    vergabestelle: "Bundesanstalt für Immobilienaufgaben (BImA)",
    title: "Tragwerksplanung Bürogebäude BMI Bonn",
    description:
      "TWP LP 1-6 nach HOAI § 51 für Erweiterungsneubau Bürogebäude (4.200 m² BGF), Stahlbeton-Skelett.",
    vergabeNr: "BImA-2026-OST-0233",
    verfahrensart: "Verhandlungsverfahren mit Teilnahmewettbewerb (EU)",
    wertEur: 380_000,
    bundesland: "NRW",
    plzPraefix: "5",
    disciplines: ["tragwerksplanung"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(28),
    publishedAt: isoIn(-1),
    isEu: false,
    excerpt: `Auftraggeber: Bundesanstalt für Immobilienaufgaben
Verfahrensart: Verhandlungsverfahren mit Teilnahmewettbewerb (EU)
Leistung: Tragwerksplanung LP 1-6 HOAI § 51 für Bürogebäude

Wertung
Zuschlag auf das wirtschaftlichste Angebot — Honorar 60 %, Konzept 30 %, Referenzen 10 %.

Eignungskriterien
Mindestumsatz Tragwerk: 800.000 EUR. 3 vergleichbare Referenzen ≥ 3.000 m² BGF.
Bietergemeinschaft zulässig.`,
  },
  {
    id: "ted-2026-eu-0451",
    platformId: "ted",
    url: "https://ted.europa.eu/udl?uri=TED:NOTICE:2026000451",
    vergabestelle: "Stadt München · Baureferat",
    title: "Neubau Stadtbibliothek Riem — Generalunternehmer",
    description:
      "Schlüsselfertige Errichtung Stadtbibliothek mit 5.800 m² BGF, KfW 40, BIM-Pflicht ab LP3.",
    vergabeNr: "2026/S 045-001233",
    verfahrensart: "Offenes Verfahren (EU)",
    wertEur: 18_500_000,
    bundesland: "BY",
    plzPraefix: "8",
    disciplines: ["hochbau_objektplanung", "tragwerksplanung", "tga"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(45),
    publishedAt: isoIn(-5),
    isEu: true,
    excerpt: `Auftraggeber: Landeshauptstadt München — Baureferat
Verfahrensart: Offenes Verfahren EU
Geschätzter Auftragswert: 18.500.000 EUR
Leistung: Schlüsselfertiger Neubau Stadtbibliothek Riem, 5.800 m² BGF
Vertragsstrafe: 0,2 % je Werktag, max. 5 %.
Mindestjahresumsatz: 25 Mio. EUR im Bereich Hochbau.
5 vergleichbare Referenzen ≥ 10 Mio. EUR Auftragswert.`,
  },
  {
    id: "subreport-2026-0712",
    platformId: "subreport",
    url: "https://www.subreport-elvis.de/E83712",
    vergabestelle: "Wasserverband Eifel-Rur",
    title: "Brückeninstandsetzung B266 — Pfeiler-Sanierung",
    description:
      "Instandsetzung 2 Pfeiler an Talbrücke B266, Spritzbetonaufbau, Korrosionsschutz Bewehrung.",
    vergabeNr: "WVER-2026-IB-007",
    verfahrensart: "Beschränkte Ausschreibung",
    wertEur: 920_000,
    bundesland: "NRW",
    plzPraefix: "5",
    disciplines: ["ingenieurbauwerke", "bauwerkspruefung"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(12),
    publishedAt: isoIn(-7),
    isEu: false,
    excerpt: `Auftraggeber: Wasserverband Eifel-Rur
Vergabe-Nr.: WVER-2026-IB-007
Beschränkte Ausschreibung — DIN 1076-Brücke
Leistung: Pfeilersanierung Talbrücke B266
Sicherheit: 5 % VEB, 5 % GLB, 4 Jahre Gewährleistung.
Funktionale Leistungsbeschreibung für Korrosionsschutz.`,
  },
  {
    id: "vmp-bayern-2026-552",
    platformId: "vmp-bayern",
    url: "https://www.vergabe.bayern.de/notice/N552",
    vergabestelle: "Staatliches Bauamt Freising",
    title: "TGA-Planung Klinikum Erding — Erweiterung OP-Bereich",
    description:
      "Fachplanung HLS und ELT (LP 1-9) für Erweiterung 4 OP-Säle inkl. Reinraumtechnik Klasse 1b.",
    vergabeNr: "STBAFS-2026-TGA-019",
    verfahrensart: "Offenes Verfahren (EU)",
    wertEur: 540_000,
    bundesland: "BY",
    plzPraefix: "8",
    disciplines: ["tga"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(34),
    publishedAt: isoIn(-2),
    isEu: false,
    excerpt: `Auftraggeber: Staatliches Bauamt Freising
EU-Verfahren — TGA-Planung HLS + ELT
Tariftreue- und Mindestlohnerklärung nach Bayer. ATG erforderlich.
Eignung: 5 Jahre Reinraum-Erfahrung, 2 Referenzen Klinik-OP.`,
  },
  {
    id: "vmp-nrw-2026-318",
    platformId: "vmp-nrw",
    url: "https://www.vergabe.nrw.de/notice/318",
    vergabestelle: "Stadt Essen · Grün und Gruga",
    title: "Freianlagen Schulhof Gesamtschule Bockmühle",
    description:
      "Umgestaltung Pausenhof 2.800 m² inkl. Versickerungsflächen, Spielgeräte, Pflanzungen.",
    vergabeNr: "ESS-GG-2026-FA-005",
    verfahrensart: "Öffentliche Ausschreibung (VOB/A § 3)",
    wertEur: 380_000,
    bundesland: "NRW",
    plzPraefix: "4",
    disciplines: ["freianlagen"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(21),
    publishedAt: isoIn(-4),
    isEu: false,
    excerpt: `Auftraggeber: Stadt Essen — Grün und Gruga
Leistung: Schulhof-Umgestaltung Gesamtschule Bockmühle, 2.800 m²
Tariftreue nach TVgG NRW.
Vertragsstrafe 0,2 % je Werktag, max 5 %.`,
  },
  {
    id: "dtvp-2026-002",
    platformId: "dtvp",
    url: "https://www.dtvp.de/Center/notice/CXP9P3KK21M",
    vergabestelle: "Landkreis Esslingen · Hochbauamt",
    title: "Generalsanierung Realschule Plochingen",
    description:
      "Energetische Sanierung Schulgebäude (1970er, 6.400 m² BGF), Fassade, Fenster, Technik, brand­schutztechnische Ertüchtigung.",
    vergabeNr: "LKES-2026-GS-002",
    verfahrensart: "Verhandlungsverfahren (EU)",
    wertEur: 8_200_000,
    bundesland: "BW",
    plzPraefix: "7",
    disciplines: ["hochbau_objektplanung", "bauphysik", "tga"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(38),
    publishedAt: isoIn(-6),
    isEu: true,
    excerpt: `Auftraggeber: Landkreis Esslingen
Geschätzter Auftragswert: 8,2 Mio. EUR
Leistung: Generalsanierung Realschule Plochingen
Mindestjahresumsatz: 12 Mio. EUR
Bietergemeinschaft zulässig.
Vertragsstrafe 6 % der Auftragssumme — Achtung: prüfen!`,
  },
  {
    id: "vergabe24-2026-441",
    platformId: "vergabe24",
    url: "https://www.vergabe24.de/notice/441",
    vergabestelle: "Stadtwerke Halle GmbH",
    title: "Vermessung Kanalnetz Halle Süd",
    description:
      "Bestandsvermessung 14 km Mischwasserkanal, Schachtdeckel-GPS, 3D-Punktwolke der Sammler.",
    vergabeNr: "SWH-2026-VM-009",
    verfahrensart: "Beschränkte Ausschreibung",
    wertEur: 145_000,
    bundesland: "ST",
    plzPraefix: "0",
    disciplines: ["vermessung"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(15),
    publishedAt: isoIn(-1),
    isEu: false,
    excerpt: `Auftraggeber: Stadtwerke Halle
Beschränkte Ausschreibung
Leistung: Bestandsvermessung Kanalnetz, 14 km
Eignung: 3 Referenzen Kanalnetz-Vermessung.`,
  },
  {
    id: "ted-2026-eu-0612",
    platformId: "ted",
    url: "https://ted.europa.eu/udl?uri=TED:NOTICE:2026000612",
    vergabestelle: "DEGES Deutsche Einheit Fernstraßenplanungs- und -bau GmbH",
    title: "Verkehrsanlagenplanung A14 Anschlussstelle Wittenberge",
    description:
      "Planungsleistungen LP 1-7 HOAI § 47 für AS Wittenberge der A14, inkl. Bauwerksvorentwurf 2 Brücken.",
    vergabeNr: "DEGES-2026-VAP-014",
    verfahrensart: "Offenes Verfahren (EU)",
    wertEur: 1_350_000,
    bundesland: "BB",
    plzPraefix: "1",
    disciplines: ["verkehrsanlagen", "ingenieurbauwerke"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(52),
    publishedAt: isoIn(-2),
    isEu: true,
    excerpt: `Auftraggeber: DEGES
EU-Verfahren — Offenes Verfahren
Leistung: AS Wittenberge A14, LP 1-7 HOAI § 47, 2 Brücken
Eignung: 5 Mio. Mindestumsatz, 3 Autobahn-Referenzen, BIM Level 2.`,
  },
  {
    id: "bi-medien-2026-077",
    platformId: "bi-medien",
    url: "https://www.bi-medien.de/notice/77",
    vergabestelle: "Wohnungsbau Müller GmbH (privat)",
    title: "Rohbau Wohnanlage Augsburg-Lechhausen",
    description:
      "Rohbau 24 WE in 3 Stadtvillen, Stahlbeton, Tiefgarage 38 Stellplätze, Bauzeit 11 Monate.",
    vergabeNr: "WBM-2026-RB-003",
    verfahrensart: "Freihändige Vergabe (privat)",
    wertEur: 2_100_000,
    bundesland: "BY",
    plzPraefix: "8",
    disciplines: ["hochbau_objektplanung", "tragwerksplanung"],
    clientFocus: "privat",
    angebotsfrist: isoIn(22),
    publishedAt: isoIn(-3),
    isEu: false,
    excerpt: `Auftraggeber: Wohnungsbau Müller GmbH
Privater Auftraggeber — VOB/B vereinbart, abweichende AGB beachten.
Leistung: Rohbau 24 WE, 3 Stadtvillen, TG 38 Plätze
Bauzeit: 11 Monate ab Beauftragung.
Pauschalfestpreis. Sicherheit 10 % bis Abnahme.`,
  },
  {
    id: "evergabe-bund-2026-103",
    platformId: "evergabe-bund",
    url: "https://www.evergabe-online.de/tenderdetails.html?id=103441",
    vergabestelle: "Deutsche Bahn AG · DB InfraGO",
    title: "Bauwerksprüfung Eisenbahnüberführungen Region Nord",
    description:
      "Hauptprüfung nach DIN 1076 für 47 EÜ in Niedersachsen / Hamburg, 2026-2028.",
    vergabeNr: "DB-IGO-2026-BWP-N",
    verfahrensart: "Offenes Verfahren (EU)",
    wertEur: 720_000,
    bundesland: "NDS",
    plzPraefix: "3",
    disciplines: ["bauwerkspruefung", "ingenieurbauwerke"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(31),
    publishedAt: isoIn(-1),
    isEu: false,
    excerpt: `Auftraggeber: DB InfraGO AG
EU-Verfahren — Offenes Verfahren
Leistung: Hauptprüfung 47 EÜ nach DIN 1076
Eignung: VFIB-Mitgliedschaft oder Nachweis vergleichbarer Qualifikation, 2 zertifizierte Brückenprüfer im Team.`,
  },
  {
    id: "dtvp-2026-003",
    platformId: "dtvp",
    url: "https://www.dtvp.de/Center/notice/CXP7T9MMVQR",
    vergabestelle: "Stadt Köln · Gebäudewirtschaft",
    title: "SiGeKo Großprojekt Stadtarchiv Neubau",
    description:
      "SiGeKo-Leistungen LP 1-9 für Neubau Stadtarchiv Köln, Bauzeit 36 Monate, max. 250 AN gleichzeitig.",
    vergabeNr: "K-GW-2026-SIGE-002",
    verfahrensart: "Öffentliche Ausschreibung (VOB/A § 3)",
    wertEur: 220_000,
    bundesland: "NRW",
    plzPraefix: "5",
    disciplines: ["sigeko_projektsteuerung"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(19),
    publishedAt: isoIn(-2),
    isEu: false,
    excerpt: `Auftraggeber: Stadt Köln — Gebäudewirtschaft
Leistung: SiGeKo LP 1-9 Neubau Stadtarchiv
Eignung: SiGeKo-Qualifikation nach RAB 30, 2 Referenzen ≥ 20 Mio. Bauvolumen.`,
  },
  {
    id: "vmp-bayern-2026-617",
    platformId: "vmp-bayern",
    url: "https://www.vergabe.bayern.de/notice/N617",
    vergabestelle: "Markt Garmisch-Partenkirchen",
    title: "Tiefbau Erschließung Wohngebiet Burgrain II",
    description:
      "Erschließung 1,8 ha Wohngebiet inkl. Kanal, Wasser, Strom-Leerrohre, Straßen-Endausbau.",
    vergabeNr: "GAP-2026-TB-011",
    verfahrensart: "Öffentliche Ausschreibung (VOB/A § 3)",
    wertEur: 1_650_000,
    bundesland: "BY",
    plzPraefix: "8",
    disciplines: ["verkehrsanlagen", "ingenieurbauwerke"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(26),
    publishedAt: isoIn(-4),
    isEu: false,
    excerpt: `Auftraggeber: Markt Garmisch-Partenkirchen
Leistung: Erschließung Wohngebiet Burgrain II, 1,8 ha
Pauschalierung Straßen-Endausbau, Einzelpreise Kanal/Wasser.
Vertragsstrafe 0,3 %/Werktag, max 5 %.`,
  },
  {
    id: "subreport-2026-0834",
    platformId: "subreport",
    url: "https://www.subreport-elvis.de/E83834",
    vergabestelle: "Universitätsklinikum Heidelberg",
    title: "Bauphysik Neubau Forschungsgebäude OncoTec",
    description:
      "Schall-, Wärme- und Brandschutz-Konzept Forschungsgebäude 8.500 m² BGF, Labor S2/S3.",
    vergabeNr: "UKHD-2026-BPH-007",
    verfahrensart: "Verhandlungsverfahren (EU)",
    wertEur: 290_000,
    bundesland: "BW",
    plzPraefix: "6",
    disciplines: ["bauphysik"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(40),
    publishedAt: isoIn(-1),
    isEu: false,
    excerpt: `Auftraggeber: UK Heidelberg
EU-Verhandlungsverfahren
Leistung: Bauphysik Forschungsbau OncoTec, Labor S2/S3
Wertung: Honorar 50 %, Konzept 35 %, Referenzen 15 %.`,
  },
  {
    id: "ai-bau-2026-198",
    platformId: "ai-bau",
    url: "https://www.ai-bau.de/notice/198",
    vergabestelle: "Vonovia SE",
    title: "Aufzugsmodernisierung 38 Wohnhochhäuser Bochum",
    description:
      "Komplettaustausch Personenaufzüge in 38 Wohngebäuden, Rahmenvertrag 24 Monate.",
    vergabeNr: "VON-2026-AUF-RV-002",
    verfahrensart: "Verhandlungsverfahren (privat)",
    wertEur: 4_800_000,
    bundesland: "NRW",
    plzPraefix: "4",
    disciplines: ["tga"],
    clientFocus: "privat",
    angebotsfrist: isoIn(33),
    publishedAt: isoIn(-2),
    isEu: false,
    excerpt: `Auftraggeber: Vonovia SE
Privater Rahmenvertrag — keine VOB/B, eigene AGB Vonovia 2025.
Leistung: 38 Personenaufzüge austauschen, 24 Monate Laufzeit.
Pönale 5.000 EUR pro überschrittenem Meilenstein.`,
  },
  {
    id: "evergabe-bund-2026-141",
    platformId: "evergabe-bund",
    url: "https://www.evergabe-online.de/tenderdetails.html?id=141902",
    vergabestelle: "Bundeswehr · Bundesamt für Infrastruktur (BAIUDBw)",
    title: "Sanierung Schießanlage Standort Munster",
    description:
      "Schalldämmung und Brandschutz-Ertüchtigung Schießstand-Komplex, 4.200 m².",
    vergabeNr: "BAIUDBW-2026-SAN-021",
    verfahrensart: "Beschränkte Ausschreibung",
    wertEur: 1_950_000,
    bundesland: "NDS",
    plzPraefix: "2",
    disciplines: ["hochbau_objektplanung", "bauphysik"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(29),
    publishedAt: isoIn(-1),
    isEu: false,
    excerpt: `Auftraggeber: BAIUDBw
Beschränkte Ausschreibung — VS-NfD eingestuft
Leistung: Sanierung Schießstand Munster
Sicherheits-Überprüfung Ü1 für eingesetztes Personal erforderlich.
Vertragsstrafe 0,3 %/Werktag, max. 5 %.`,
  },
  {
    id: "vmp-nrw-2026-402",
    platformId: "vmp-nrw",
    url: "https://www.vergabe.nrw.de/notice/402",
    vergabestelle: "Stadt Münster · Tiefbauamt",
    title: "Radschnellweg RS1 Abschnitt Münster-Hiltrup",
    description:
      "Bau Radschnellweg 4,2 km, Asphaltdecke, 3 Brückenbauwerke, Beleuchtung.",
    vergabeNr: "MS-TBA-2026-VK-019",
    verfahrensart: "Offenes Verfahren (EU)",
    wertEur: 6_900_000,
    bundesland: "NRW",
    plzPraefix: "4",
    disciplines: ["verkehrsanlagen", "ingenieurbauwerke"],
    clientFocus: "oeffentlich",
    angebotsfrist: isoIn(48),
    publishedAt: isoIn(-3),
    isEu: true,
    excerpt: `Auftraggeber: Stadt Münster — Tiefbauamt
EU-Offenes Verfahren — Radschnellweg RS1
Leistung: 4,2 km Radschnellweg, 3 Brücken, Beleuchtung
Tariftreue TVgG NRW.
Mindestumsatz 8 Mio., 3 vergleichbare Radwege-Referenzen.`,
  },
  {
    id: "dtvp-2026-004",
    platformId: "dtvp",
    url: "https://www.dtvp.de/Center/notice/CXP2K8FFRTL",
    vergabestelle: "Wohnungsgenossenschaft Hannover eG",
    title: "Innendämmung Denkmalbau List 14 WE",
    description:
      "Kapillaraktive Innendämmung in denkmalgeschütztem Wohnhaus, 14 WE, behutsamer Eingriff.",
    vergabeNr: "WG-H-2026-DM-008",
    verfahrensart: "Freihändige Vergabe",
    wertEur: 195_000,
    bundesland: "NDS",
    plzPraefix: "3",
    disciplines: ["hochbau_objektplanung", "bauphysik"],
    clientFocus: "privat",
    angebotsfrist: isoIn(11),
    publishedAt: isoIn(-2),
    isEu: false,
    excerpt: `Auftraggeber: Wohnungsgenossenschaft Hannover eG
Freihändige Vergabe — Denkmalschutz-Auflagen
Leistung: Kapillaraktive Innendämmung 14 WE
Genehmigung Untere Denkmalschutzbehörde liegt vor.`,
  },
];

/** Stabile ID-Liste — beim Refresh evtl. neue IDs einfügen, nicht umbenennen. */
export const TENDER_FEED_ITEM_IDS = TENDER_FEED_ITEMS.map((i) => i.id);
