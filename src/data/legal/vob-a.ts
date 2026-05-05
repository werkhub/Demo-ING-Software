/**
 * VOB/A · Allgemeine Bestimmungen für die Vergabe von Bauleistungen
 * Quelle: DIN 1960:2019-09 (mit Anpassungen 2024 zu Abschnitt 2 EU)
 * Status: DIN-Norm · urheberrechtlich geschützt durch DIN Media (ehem. Beuth Verlag).
 *
 * WICHTIG: Diese Datei enthält redaktionelle Zusammenfassungen + Paraphrasen
 * für Referenz-Zwecke (Fair Use). Volltexte werden in der Pro-Lizenzversion
 * über die DIN-Media-Volumenlizenz freigeschaltet.
 *
 * Abschnitt 1 (§§ 1–22): nationale Bauauftrag-Vergabe unterhalb EU-Schwelle
 * Abschnitt 2 (§§ 1 EU – 22 EU): EU-Verfahren oberhalb Schwellenwert (GWB/VgV)
 * Abschnitt 3 (§§ 1 VS – 22 VS): Sektoren (Wasser, Energie, Verkehr — SektVO)
 */

import type { NewLegalChunk } from "@/db/schema";

export const VOB_A: Omit<NewLegalChunk, "id" | "source">[] = [
  /* ============== ABSCHNITT 1 — NATIONAL ============== */
  {
    slug: "1",
    ref: "§ 1",
    title: "Bauleistungen",
    summary:
      "Definition: Bauleistungen sind Arbeiten jeder Art zur Herstellung, Instandhaltung, Änderung oder Beseitigung von Bauwerken — abgrenzend zu Lieferungen (UVgO/VgV) und freiberuflichen Leistungen (HOAI).",
    orderIdx: 101,
    content:
      "Paraphrase:\n\nBauleistungen umfassen die Errichtung, Erweiterung, Umbau, Instandsetzung, Modernisierung und Beseitigung von Bauwerken sowie die hierfür erforderlichen Stoffe und Bauteile, soweit sie mit dem Bauwerk fest verbunden werden.\n\nAbgrenzung: Reine Materiallieferungen ohne Einbau fallen unter UVgO/VgV. Planungs- und Beratungsleistungen sind freiberufliche Leistungen nach HOAI/VgV.",
  },
  {
    slug: "2",
    ref: "§ 2",
    title: "Grundsätze der Vergabe",
    summary:
      "Wettbewerb, Transparenz, Wirtschaftlichkeit, Verhältnismäßigkeit, Gleichbehandlung. Mittelständische Interessen sind durch Losbildung zu fördern (Abs. 2).",
    orderIdx: 102,
    content:
      "Paraphrase:\n\nAbs. 1 — Vergabegrundsätze: Bauleistungen sind unter Beachtung der Grundsätze des Wettbewerbs, der Transparenz, der Wirtschaftlichkeit, der Verhältnismäßigkeit und der Gleichbehandlung zu vergeben.\n\nAbs. 2 — Mittelstandsförderung: Mittelständische Interessen sind vornehmlich durch Aufteilung in Fach- und Teillose zu berücksichtigen. Mehrere Lose können zusammen vergeben werden, wenn dies aus wirtschaftlichen oder technischen Gründen erforderlich ist.\n\nAbs. 3 — Auftragsbeschränkung: Aufträge sind so zu erteilen, dass an dem Auftrag interessierte Unternehmen Zugang haben. Diskriminierende Anforderungen sind unzulässig.",
  },
  {
    slug: "3",
    ref: "§ 3",
    title: "Arten der Vergabe",
    summary:
      "Drei Vergabearten: Öffentliche Ausschreibung (Regelfall), Beschränkte Ausschreibung (mit/ohne Teilnahmewettbewerb), Freihändige Vergabe (nur bei besonderen Voraussetzungen, Wertgrenzen).",
    orderIdx: 103,
    content:
      "Paraphrase:\n\nAbs. 1 — Vergabearten:\n• Öffentliche Ausschreibung: unbeschränkte Anzahl von Unternehmen wird zur Angebotsabgabe öffentlich aufgefordert.\n• Beschränkte Ausschreibung mit Teilnahmewettbewerb: nach öffentlicher Aufforderung zur Bewerbung wird eine begrenzte Zahl ausgewählter Unternehmen zur Angebotsabgabe aufgefordert.\n• Beschränkte Ausschreibung ohne Teilnahmewettbewerb: ausgewählte Unternehmen werden direkt zur Angebotsabgabe aufgefordert.\n• Freihändige Vergabe: ohne förmliches Verfahren, mit oder ohne Verhandlungen.\n\nAbs. 2 — Vorrang Öffentliche Ausschreibung: Sie ist Regelfall, andere Vergabearten nur bei Vorliegen ausdrücklicher Voraussetzungen.\n\nAbs. 5 — Wertgrenzen: Bundes-/Länder-Wertgrenzen für Beschränkte Ausschreibung und Freihändige Vergabe (z. B. Bund: bis 100.000 € beschränkt, bis 10.000 € freihändig — Stand 2024).",
  },
  {
    slug: "3a",
    ref: "§ 3a",
    title: "Zulässigkeitsvoraussetzungen",
    summary:
      "Beschränkte Ausschreibung und Freihändige Vergabe sind nur zulässig bei: Geheimhaltung, geringem Wert, besonderer Eile, fehlender Eignung breiter Anbieter, kleineren Folgeaufträgen, Notmaßnahmen.",
    orderIdx: 104,
    content:
      "Paraphrase wichtigster Voraussetzungen für beschränkte/freihändige Verfahren:\n\nBeschränkte Ausschreibung zulässig bei:\n• Geringer Marktrelevanz / wenige Anbieter\n• Bauleistungen besonderer Art\n• Vorheriger erfolgloser Öffentlicher Ausschreibung\n• Bundes-/Länder-Wertgrenze unterschritten\n\nFreihändige Vergabe zulässig bei:\n• Besondere Dringlichkeit (z. B. Naturkatastrophe)\n• Geheimhaltungsbedürfnis\n• Vergabe an einzigen Anbieter aus technischen oder rechtlichen Gründen\n• Geringer Auftragswert (Bagatellgrenze)\n• Folgeauftrag im engen Zusammenhang\n\nDokumentationspflicht: Wahl der Vergabeart muss im Vergabevermerk begründet werden.",
  },
  {
    slug: "4",
    ref: "§ 4",
    title: "Vertragsarten",
    summary:
      "Einheitspreisvertrag (Regelfall), Pauschalvertrag, Stundenlohnvertrag (nur bei kleinerem Umfang), Selbstkostenerstattungsvertrag (Ausnahme).",
    orderIdx: 105,
    content:
      "Paraphrase:\n\nAbs. 1 — Vertragsarten:\n• Einheitspreisvertrag: Vergütung nach tatsächlich erbrachten Mengen × vereinbarte Einheitspreise. Regelfall.\n• Pauschalvertrag: Festpreis für eine im Vertrag genau beschriebene Leistung. Nur bei eindeutiger und erschöpfender Leistungsbeschreibung.\n• Stundenlohnvertrag: nur für Bauleistungen geringeren Umfangs, vorwiegend Lohnaufwand.\n• Selbstkostenerstattungsvertrag: nur ausnahmsweise (z. B. Forschungs-/Versuchsbau), genaue Kostenvereinbarung erforderlich.\n\nAbs. 2 — Wahlkriterien: Vertragsart richtet sich nach Eignung der Leistungsbeschreibung und Risikoverteilung.",
  },
  {
    slug: "5",
    ref: "§ 5",
    title: "Leistungsbeschreibung — Allgemeine Anforderungen",
    summary:
      "Eindeutig und erschöpfend zu beschreiben; alle preisbeeinflussenden Umstände sind anzugeben. Risikoverteilung: ungewöhnliche Wagnisse darf der AG nicht abwälzen.",
    orderIdx: 106,
    content:
      "Paraphrase:\n\nAbs. 1 — Eindeutigkeit: Die Leistung ist eindeutig und so erschöpfend zu beschreiben, dass alle Bewerber sie im gleichen Sinne verstehen müssen und ihre Preise sicher und ohne umfangreiche Vorarbeiten berechnen können.\n\nAbs. 2 — Wagnis: Dem AN darf kein ungewöhnliches Wagnis aufgebürdet werden für Umstände und Ereignisse, auf die er keinen Einfluss hat und deren Einwirkung auf die Preise und Fristen er nicht im voraus schätzen kann (z. B. unbekannte Baugrundverhältnisse).\n\nAbs. 3 — Bezugnahmen: Bei Verweisen auf technische Spezifikationen sind die Worte „oder gleichwertig“ beizufügen, wenn nicht durch sachliche Gründe gerechtfertigt.\n\nWichtige Folge: AG-seitige Verletzung dieser Pflicht führt regelmäßig zu Nachträgen oder Anpassungsansprüchen nach § 2 VOB/B.",
  },
  {
    slug: "6",
    ref: "§ 6",
    title: "Leistungsbeschreibung mit Leistungsverzeichnis",
    summary:
      "Strukturierte Aufgliederung in Positionen mit Mengenansatz und Einheit. Standardisiertes LV-Format (GAEB DA XML / D81–D89). Bedarfspositionen, Wahlpositionen, Eventualpositionen klar zu kennzeichnen.",
    orderIdx: 107,
    content:
      "Paraphrase:\n\nAbs. 1 — Aufbau: Die Leistung ist in Teilleistungen mit Ordnungszahlen (OZ) zu gliedern. Jede Position enthält:\n• Kurz- und ggf. Langtext\n• Mengenansatz\n• Einheit (m, m², m³, t, Stck.)\n• Einheitspreis (vom Bieter einzutragen)\n\nAbs. 2 — Sondertypen:\n• Bedarfspositionen — werden nur abgerufen bei Bedarf\n• Wahlpositionen — alternative Ausführungsvarianten\n• Eventualpositionen — Eintritt unsicherer Ereignisse\n\nAbs. 3 — Standardisierung: GAEB-Datenaustausch nach DA XML 3.x (D81 Angebotsaufforderung, D83 Angebot, D84 Auftragserteilung, D86 Nachträge, D87 Schlussrechnung) ist Marktstandard und in vielen Behörden verpflichtend.",
  },
  {
    slug: "7",
    ref: "§ 7",
    title: "Leistungsbeschreibung mit Leistungsprogramm",
    summary:
      "Funktionale Ausschreibung — AG beschreibt Bauwerksziel, AN entwickelt Lösung. Geeignet bei Generalunternehmer-Vergabe und großen Projekten.",
    orderIdx: 108,
    content:
      "Paraphrase:\n\nAbs. 1 — Funktionale Beschreibung: Statt detailliertem LV beschreibt der AG die zu erreichende Funktion / das Ergebnis (z. B. „Lagerhalle 5.000 m², Anbindung Logistikzentrum, Mindesttraglast 30 kN/m²“). Der AN entwickelt eigene Lösungsvorschläge mit kompletter Planung und LV.\n\nAbs. 2 — Anwendungsfälle: Geeignet bei GU-/TU-Vergaben, Public-Private-Partnership (PPP/ÖPP), Schlüsselfertig-Bau und bei innovativen Verfahren.\n\nAbs. 3 — Risikoverteilung: AN trägt Planungsrisiko und Vollständigkeitsrisiko. Höherer Pauschalvertrag-Charakter — Nachträge schwieriger durchsetzbar.\n\nAbs. 4 — Wertung: Bewertungskriterien müssen vorab definiert sein (Zuschlagsmatrix mit Gewichtung).",
  },
  {
    slug: "8",
    ref: "§ 8",
    title: "Vergabeunterlagen",
    summary:
      "Aufforderung, Bewerbungsbedingungen, Vertragsunterlagen, Leistungsbeschreibung. Eindeutige, vollständige, in deutscher Sprache zu fassen. Unentgeltliche Bereitstellung über e-Vergabeplattform.",
    orderIdx: 109,
    content:
      "Paraphrase:\n\nAbs. 1 — Bestandteile:\n• Aufforderung zur Angebotsabgabe / zum Teilnahmeantrag\n• Bewerbungsbedingungen (Termine, Formvorschriften, Eignungsanforderungen)\n• Vertragsbedingungen (VOB/B, Besondere Vertragsbedingungen, Zusätzliche Vertragsbedingungen)\n• Leistungsbeschreibung (LV oder Leistungsprogramm)\n• Erklärungen + Eigenerklärungen\n\nAbs. 2 — Sprache: deutsch.\n\nAbs. 3 — Bereitstellung: Vergabeunterlagen sind unentgeltlich elektronisch über die e-Vergabeplattform (z. B. eVergabe-Online, DTVP, subreport-ELViS) zur Verfügung zu stellen.\n\nAbs. 4 — Bietererklärungen: Eigenerklärungen zur Eignung (Tariftreue, Steuern/SV, Insolvenz) sind im Vergabeverfahren ausreichend; Nachweise nur vom Zuschlagskandidaten.",
  },
  {
    slug: "9",
    ref: "§ 9",
    title: "Vertragsbedingungen",
    summary:
      "VOB/B als Grundlage. Besondere und zusätzliche Vertragsbedingungen — Vorrangregel: BVB > ZVB > VOB/B (sofern wirksam vereinbart).",
    orderIdx: 110,
    content:
      "Paraphrase:\n\nAbs. 1 — Hierarchie der Vertragsbedingungen:\n1. Leistungsbeschreibung (vorrangig)\n2. Besondere Vertragsbedingungen (BVB) — projektspezifisch\n3. Zusätzliche Vertragsbedingungen (ZVB) — auftraggeber-spezifisch\n4. Allgemeine Vertragsbedingungen — VOB/B\n5. ATV — VOB/C\n\nAbs. 2 — AGB-Inhaltskontrolle: Auch BVB/ZVB unterliegen der Inhaltskontrolle nach §§ 305 ff. BGB. BGH-typische Unwirksamkeit:\n• Vertragsstrafe > 5 % der Auftragssumme\n• Mängelansprüche-Verjährung > 5 Jahre für Bauwerke\n• Übertragung des Baugrundrisikos auf AN\n• Ausschluss der Bedenkenanzeige\n\nAbs. 3 — Wirksamkeitsfrist: Klauseln dürfen den AN nicht entgegen Treu und Glauben unangemessen benachteiligen.",
  },
  {
    slug: "10",
    ref: "§ 10",
    title: "Fristen",
    summary:
      "Angemessene Angebots- und Bewerbungsfristen. Mindestfristen: Öffentliche Ausschreibung 10 Werktage; Beschränkte Ausschreibung 10 Werktage; angemessene Verlängerung bei umfangreichen Verfahren.",
    orderIdx: 111,
    content:
      "Paraphrase:\n\nAbs. 1 — Mindestfristen national:\n• Öffentliche Ausschreibung: mind. 10 Werktage Angebotsfrist (i. d. R. 3 Wochen)\n• Beschränkte Ausschreibung: mind. 10 Werktage\n• Bewerbungsfrist beim Teilnahmewettbewerb: mind. 10 Werktage\n• Bindefrist (Zuschlagsfrist): max. 30 Kalendertage, Verlängerung mit Bieter-Zustimmung\n\nAbs. 2 — Verlängerung: Bei umfangreichen oder komplexen Leistungen sind Fristen so zu bemessen, dass eine ordnungsgemäße Angebotskalkulation möglich ist.\n\nAbs. 3 — Friständerung: Wesentliche Änderungen der Vergabeunterlagen während der Angebotsphase erfordern angemessene Fristverlängerung (Faustregel: ⅓ der ursprünglichen Frist).",
  },
  {
    slug: "11",
    ref: "§ 11",
    title: "Grundsätze der Informationsübermittlung",
    summary:
      "E-Vergabe: Kommunikation grundsätzlich elektronisch über zentrale Vergabeplattform. Schriftform und elektronische Signatur (qualifiziert oder fortgeschritten) zulässig.",
    orderIdx: 112,
    content:
      "Paraphrase:\n\nAbs. 1 — Grundsatz E-Vergabe: Kommunikation und Informationsaustausch erfolgen grundsätzlich elektronisch (Bekanntmachung, Vergabeunterlagen, Angebote, Bieterfragen, Mitteilungen).\n\nAbs. 2 — Anforderungen an Plattformen: Müssen Authentizität, Integrität, Vertraulichkeit und Nachvollziehbarkeit gewährleisten (eIDAS-konform).\n\nAbs. 3 — Signatur: Angebote benötigen elektronische Signatur (qualifiziert oder fortgeschritten gem. eIDAS) oder Textform mit Eigenerklärung — je nach Vergabeart und Plattform-Konfiguration.\n\nAbs. 4 — Ausnahmen: Schriftform per Post nur ausnahmsweise zulässig, z. B. wenn Spezialsoftware fehlt oder bei Sicherheitsbedenken.",
  },
  {
    slug: "12",
    ref: "§ 12",
    title: "Bekanntmachung",
    summary:
      "Öffentliche Ausschreibung: Bekanntmachung in geeigneter Form (E-Vergabe-Plattform, www.bund.de für Bundesaufträge, ggf. amtliche Veröffentlichungsblätter). Mindestangaben gesetzlich definiert.",
    orderIdx: 113,
    content:
      "Paraphrase:\n\nAbs. 1 — Pflichtangaben Bekanntmachung:\n• Name und Anschrift des AG\n• Vergabeverfahren\n• Ausführungsort\n• Art und Umfang der Leistung\n• Aufteilung in Lose (ja/nein, Zahl)\n• Ausführungsfrist\n• Anschrift, an die Angebote zu richten sind\n• Angebotsfrist und Bindefrist\n• Höhe etwaiger Vervielfältigungskosten / Sicherheitsleistungen\n• Wesentliche Zahlungsbedingungen\n• Eignungsanforderungen\n• Zuschlagskriterien\n\nAbs. 2 — Plattformen: Bund: www.evergabe-online.de + www.bund.de; Länder: jeweilige Landesplattformen; private AG: freie Wahl unter Beachtung Wettbewerb.",
  },
  {
    slug: "13",
    ref: "§ 13",
    title: "Form und Inhalt der Angebote",
    summary:
      "Schriftform/elektronische Form. Nebenangebote nur bei Zulassung. Angebote müssen alle geforderten Erklärungen und Preise enthalten — Lücken oder Änderungen führen zu Ausschluss (§ 16).",
    orderIdx: 114,
    content:
      "Paraphrase:\n\nAbs. 1 — Form: Angebote sind in der vorgesehenen Form (elektronisch oder Schriftform) und unter Beachtung der vom AG gestellten Anforderungen abzugeben.\n\nAbs. 2 — Vollständigkeit: Alle vom AG geforderten Erklärungen und Preisangaben sind vollständig und unverändert anzugeben.\n\nAbs. 3 — Nebenangebote: Sind nur zulässig, wenn der AG sie ausdrücklich zugelassen hat. Sie müssen die Mindestanforderungen erfüllen und gleichwertig zur Hauptausschreibung sein.\n\nAbs. 4 — Bietergemeinschaften: Müssen sich gesamtschuldnerisch verpflichten und einen bevollmächtigten Vertreter benennen.\n\nAbs. 5 — Versagung der Wertung: Fehlende Preise, Änderungen am LV, Mehrdeutigkeit oder verspäteter Eingang führen zwingend zum Ausschluss.",
  },
  {
    slug: "14",
    ref: "§ 14",
    title: "Öffnung der Angebote",
    summary:
      "Submissionstermin: Öffnung in Anwesenheit von Bietern, Verlesung Bieter, Bietersummen und Anzahl Nebenangebote. Niederschrift im Submissionsprotokoll. Bei e-Vergabe: digitale Öffnung dokumentiert.",
    orderIdx: 115,
    content:
      "Paraphrase:\n\nAbs. 1 — Submissionstermin: Angebote werden im Submissionstermin geöffnet. Verlesen werden:\n• Name und Anschrift jedes Bieters\n• Endbetrag des Angebots\n• Nebenangebote (Anzahl)\n• Anwesende Bieter\n\nAbs. 2 — Anwesenheitsrecht: Bieter haben das Recht, beim Submissionstermin anwesend zu sein.\n\nAbs. 3 — Submissionsprotokoll: Niederschrift mit allen Bietersummen, Unregelmäßigkeiten und Ausschlüssen. Auf Anforderung den Bietern zugänglich.\n\nAbs. 4 — E-Vergabe: Bei elektronischen Verfahren erfolgt die Öffnung automatisiert nach Ende der Angebotsfrist; die Submissionsergebnisse sind im Vergabevermerk zu dokumentieren.\n\nAbs. 5 — Vertraulichkeit: Vor dem Termin dürfen Angebote nicht eingesehen werden.",
  },
  {
    slug: "15",
    ref: "§ 15",
    title: "Aufklärung des Angebotsinhalts",
    summary:
      "AG darf Bieter zu Aufklärungsgesprächen einladen — nur über bereits abgegebene Erklärungen, keine Verhandlung über Preise (Verhandlungsverbot).",
    orderIdx: 116,
    content:
      "Paraphrase:\n\nAbs. 1 — Aufklärung: Der AG darf vom Bieter Aufklärung über das Angebot verlangen, insbesondere über:\n• Eignung\n• Wirtschaftlichkeit der Preise\n• Auffallend niedrige Angebote\n• Ungewöhnliche Bestandteile\n\nAbs. 2 — Verhandlungsverbot: In Öffentlicher und Beschränkter Ausschreibung sind Verhandlungen, insbesondere über Änderung der Angebote oder Preise, nicht zulässig — anders bei Freihändiger Vergabe / Verhandlungsverfahren.\n\nAbs. 3 — Auffallend niedriger Preis: Bei Verdacht auf Unauskömmlichkeit muss der AG vor Ausschluss schriftlich aufklären und dem Bieter Gelegenheit geben, die Preisbildung zu erläutern (Schwelle: BGH-Faustregel ca. 10–20 % unter Mittelwert oder unter Auskömmlichkeitsgrenze).",
  },
  {
    slug: "16",
    ref: "§ 16",
    title: "Prüfung und Wertung der Angebote",
    summary:
      "Vier-Stufen-Wertung: 1) Ausschluss aus formalen Gründen, 2) Eignung der Bieter, 3) Auskömmlichkeit / Angemessenheit der Preise, 4) wirtschaftlichstes Angebot. Dokumentation im Vergabevermerk.",
    orderIdx: 117,
    content:
      "Paraphrase wichtigster Stufen:\n\nStufe 1 — Formale Prüfung (§ 16 Nr. 1):\n• Verspätet eingegangen → ausgeschlossen\n• Wesentliche unzulässige Änderungen am LV → ausgeschlossen\n• Fehlende Preise → ausgeschlossen\n• Verstoß gegen Wettbewerb (Preisabsprachen) → ausgeschlossen\n\nStufe 2 — Eignungsprüfung (§ 16a):\n• Fachkunde, Leistungsfähigkeit, Zuverlässigkeit\n• Tariftreue, Steuern, Sozialversicherung\n• Keine Insolvenz, keine schwerwiegende Verfehlung\n\nStufe 3 — Preisprüfung (§ 16b):\n• Auskömmlichkeit\n• Bei Unauskömmlichkeit: Aufklärung nach § 15\n• Ggf. Ausschluss bei nicht aufgeklärtem Verdacht\n\nStufe 4 — Wirtschaftlichstes Angebot (§ 16d):\n• Niedrigster Preis ODER Verhältnis Preis-Leistung anhand vorab veröffentlichter Zuschlagskriterien\n• Dokumentation der Bewertung im Vergabevermerk zwingend",
  },
  {
    slug: "17",
    ref: "§ 17",
    title: "Aufhebung der Ausschreibung",
    summary:
      "Aufhebung nur bei sachlich berechtigtem Grund: kein wertbares Angebot, Änderung der Grundlagen, schwerwiegende Verfahrensfehler. Sonst: Schadensersatz an Bieter (Vertrauensschaden).",
    orderIdx: 118,
    content:
      "Paraphrase:\n\nAbs. 1 — Zulässige Aufhebungsgründe:\n• Kein wertbares Angebot eingegangen\n• Wesentliche Änderung der Vergabeunterlagen erforderlich\n• Andere schwerwiegende Gründe (z. B. Wegfall der Finanzierung, höhere Gewalt)\n\nAbs. 2 — Information: Aufhebung ist allen Bietern unverzüglich schriftlich mitzuteilen unter Angabe der Gründe.\n\nAbs. 3 — Schadensersatz: Bei Aufhebung ohne sachlichen Grund (Willkür oder offensichtlich rechtswidriges Verfahren) haftet der AG für Vertrauensschaden — typischerweise Kalkulationskosten des Bieters (BGH VII ZR 30/04). Entgangener Gewinn nur bei nachweisbar sicherem Zuschlag.\n\nAbs. 4 — Folgen für Bietergemeinschaft: Aufhebung beendet Gemeinschaftszweck; Aufwendungsersatz unter Beteiligten gemäß GbR-Regeln.",
  },
  {
    slug: "18",
    ref: "§ 18",
    title: "Zuschlag",
    summary:
      "Zuschlag = Annahme des Angebots, Vertrag kommt zustande. Schriftliche Erklärung. Vorabinformationspflicht (§ 19) bei nicht berücksichtigten Bietern.",
    orderIdx: 119,
    content:
      "Paraphrase:\n\nAbs. 1 — Form des Zuschlags: Schriftlich oder elektronisch in Textform. Mit Zugang der Zuschlagserklärung beim Bieter kommt der Bauvertrag zustande (§ 145 BGB).\n\nAbs. 2 — Bindungsfrist: Zuschlag muss innerhalb der Bindungsfrist erfolgen, sonst erlischt das Angebot. Verlängerungen nur mit Zustimmung des Bieters.\n\nAbs. 3 — Vorabinformation: Bei öffentlichen Aufträgen ist den nicht berücksichtigten Bietern unverzüglich Mitteilung zu machen — nach Abschnitt 1 als Soll-Regelung, nach Abschnitt 2 (EU) zwingend mit 10-Tages-Wartefrist (§ 134 GWB).\n\nAbs. 4 — Vertragsbestandteile: Zuschlag erfolgt auf Grundlage der Vergabeunterlagen + Angebot — diese werden Vertragsbestandteil in der Hierarchie nach § 9.",
  },
  {
    slug: "19",
    ref: "§ 19",
    title: "Nicht berücksichtigte Bewerbungen und Angebote",
    summary:
      "Auf Antrag Information an unterlegene Bieter über Gründe der Nichtberücksichtigung. Rückgabe von Angebotsunterlagen. Vertraulichkeit der Angebote anderer.",
    orderIdx: 120,
    content:
      "Paraphrase:\n\nAbs. 1 — Mitteilungspflicht: Bietern, deren Angebot nicht berücksichtigt wurde, ist auf Antrag unverzüglich mitzuteilen:\n• Gründe der Nichtberücksichtigung\n• Name und Anschrift des erfolgreichen Bieters\n• ggf. Merkmale und Vorteile des erfolgreichen Angebots\n\nAbs. 2 — Frist: Innerhalb von 15 Kalendertagen nach Antrag.\n\nAbs. 3 — Schutz schützenswerter Interessen: Information darf keine Geschäfts- oder Betriebsgeheimnisse offenbaren oder den Wettbewerb verzerren.\n\nAbs. 4 — Rückgabe: Auf Verlangen sind Angebotsunterlagen zurückzugeben.",
  },
  {
    slug: "20",
    ref: "§ 20",
    title: "Dokumentation, Vergabevermerk",
    summary:
      "Verpflichtende Dokumentation des gesamten Vergabeverfahrens: Verfahrensschritte, Entscheidungen, Begründungen. Aufbewahrungsfrist 5 Jahre.",
    orderIdx: 121,
    content:
      "Paraphrase:\n\nAbs. 1 — Inhalt Vergabevermerk:\n• Name und Anschrift des AG\n• Gegenstand und Wert der Auftrags\n• Wahl der Vergabeart mit Begründung\n• Eingegangene Angebote (Liste, Bietersummen)\n• Wertung der Angebote (Stufe 1–4)\n• Begründung des Zuschlags / der Aufhebung\n• Beteiligte Personen / Sachverständige\n\nAbs. 2 — Aufbewahrung: Vergabeakten sind mindestens 5 Jahre aufzubewahren — bei EU-Verfahren 10 Jahre.\n\nAbs. 3 — Form: Schriftlich oder elektronisch. Vollständigkeit und Nachprüfbarkeit sind sicherzustellen.\n\nAbs. 4 — Bedeutung: Der Vergabevermerk ist die zentrale Beweisgrundlage in vergaberechtlichen Streitverfahren (Nachprüfungs- bzw. Rügenverfahren).",
  },
  {
    slug: "21",
    ref: "§ 21",
    title: "Nachprüfung in den Verdingungsunterlagen",
    summary:
      "Bieter haben das Recht, fehlerhafte oder unvollständige Vergabeunterlagen vor Angebotsabgabe zu rügen. Im Unterschwellenbereich keine formale Nachprüfungsinstanz — Anspruch auf Schadensersatz nach § 280 BGB.",
    orderIdx: 122,
    content:
      "Paraphrase:\n\nAbs. 1 — Rügeobliegenheit: Bieter sollen erkannte Mängel der Vergabeunterlagen unverzüglich gegenüber dem AG rügen, um Korrektur zu ermöglichen.\n\nAbs. 2 — Folge unterlassener Rüge: Verlust der Möglichkeit, sich später auf Mangel zu berufen (insb. bei Schadensersatzansprüchen).\n\nAbs. 3 — Schutz im Unterschwellenbereich: Im nationalen Bereich gibt es keine förmliche Vergabekammer / Nachprüfungsverfahren — Bieter sind auf Schadensersatzklage vor Zivilgericht angewiesen (BGH-Linie: Verletzung vorvertraglicher Pflichten, § 280 i. V. m. § 311 Abs. 2 BGB).\n\nAbs. 4 — Korrekturpflicht des AG: Bei begründeter Rüge muss der AG die Unterlagen anpassen und ggf. die Frist verlängern.",
  },
  {
    slug: "22",
    ref: "§ 22",
    title: "Bauausführung",
    summary:
      "Verweis auf VOB/B als Vertragsgrundlage. Hinweis auf Anpassungsmöglichkeiten bei Mehr-/Mindermengen, Stundenlohn, Nachträgen.",
    orderIdx: 123,
    content:
      "Paraphrase:\n\nAbs. 1 — Vertragsgrundlage: Mit Erteilung des Zuschlags wird die VOB/B Vertragsgrundlage für die Ausführung. § 22 VOB/A überleitet damit den vergaberechtlichen Bereich (VOB/A) in den vertragsrechtlichen Bereich (VOB/B).\n\nAbs. 2 — Anpassungen: Während der Bauausführung können sich ergeben:\n• Geänderte Leistungen → § 2 Abs. 5 VOB/B\n• Zusätzliche Leistungen → § 2 Abs. 6 VOB/B\n• Mengenabweichungen → § 2 Abs. 3 VOB/B\n• Behinderungen → § 6 VOB/B\n\nAbs. 3 — Verweis auf VOB/C: Für die technische Ausführung gelten die ATVs der VOB/C (DIN 18299 + DIN 18300–18459) je nach Gewerk.",
  },

  /* ============== ABSCHNITT 2 — EU-VERFAHREN ============== */
  {
    slug: "1-eu",
    ref: "§ 1 EU",
    title: "Anwendungsbereich",
    summary:
      "EU-Verfahren bei öffentlichen Aufträgen oberhalb des EU-Schwellenwerts (Bauleistungen 5.538.000 € netto, Stand 2024). Rechtsgrundlage: GWB + VgV + VOB/A Abschnitt 2.",
    orderIdx: 201,
    content:
      "Paraphrase:\n\nAbs. 1 — Anwendung: Abschnitt 2 gilt für Vergabe von Bauleistungen im EU-Schwellenbereich.\n\nAbs. 2 — Schwellenwerte (Stand 2024):\n• Bauleistungen: 5.538.000 € netto\n• Konzessionen: 5.538.000 € netto\n• Loswert-Splittung möglich (Bagatelllosregel: bis 1 Mio. €, max. 20 % der Gesamtsumme — § 3 Abs. 9 VgV)\n\nAbs. 3 — Rechtsgrundlagen:\n• GWB §§ 97 ff. (Vergaberechts-Grundsätze, Nachprüfungsverfahren)\n• VgV (Vergabeverordnung)\n• VOB/A Abschnitt 2\n• EU-Vergaberichtlinien 2014/24/EU + 2014/25/EU\n\nAbs. 4 — EU-Veröffentlichung: Bekanntmachung über TED (Tenders Electronic Daily, ted.europa.eu).",
  },
  {
    slug: "3-eu",
    ref: "§ 3 EU",
    title: "Verfahrensarten EU",
    summary:
      "Offenes Verfahren, Nicht offenes Verfahren, Verhandlungsverfahren mit/ohne Teilnahmewettbewerb, Wettbewerblicher Dialog, Innovationspartnerschaft.",
    orderIdx: 202,
    content:
      "Paraphrase:\n\nAbs. 1 — Verfahrensarten:\n• Offenes Verfahren — analog Öffentliche Ausschreibung, EU-weit; jeder darf ein Angebot abgeben.\n• Nicht offenes Verfahren — analog Beschränkte Ausschreibung mit Teilnahmewettbewerb.\n• Verhandlungsverfahren mit/ohne TW — bei komplexen oder nicht standardmäßigen Aufträgen.\n• Wettbewerblicher Dialog — bei besonders komplexen Aufträgen mit fehlender klarer Lösung.\n• Innovationspartnerschaft — Forschung/Entwicklung mit anschließender Beschaffung.\n\nAbs. 2 — Verfahrenswahl: Offenes Verfahren ist Grundsatz; alternative Verfahren bedürfen Begründung im Vergabevermerk und Erfüllung der Voraussetzungen nach § 14 VgV.",
  },
  {
    slug: "10-eu",
    ref: "§ 10 EU",
    title: "Mindestfristen EU",
    summary:
      "Offenes Verfahren: 35 Tage Angebotsfrist. Nicht offenes Verfahren: 30 Tage Bewerbung + 30 Tage Angebot. Beschleunigtes Verfahren möglich (15 / 10 Tage). Verhandlungsverfahren: 30 / 30 Tage.",
    orderIdx: 203,
    content:
      "Paraphrase wichtigster Mindestfristen (§ 38 VgV i. V. m. § 10 EU VOB/A):\n\nOffenes Verfahren:\n• Angebotsfrist: 35 Tage ab Bekanntmachung\n• Verkürzung auf 30 Tage bei elektronischer Angebotsabgabe\n• Beschleunigt (Dringlichkeit): 15 Tage\n\nNicht offenes Verfahren:\n• Bewerbungsfrist: 30 Tage\n• Angebotsfrist: 30 Tage (verkürzt 25 Tage bei eAusschreibung)\n• Beschleunigt: 15 / 10 Tage\n\nVerhandlungsverfahren mit TW:\n• Bewerbungsfrist: 30 Tage\n• Angebotsfrist: 30 Tage\n• Beschleunigt möglich\n\nWettbewerblicher Dialog: 30 Tage Bewerbung + dialogabhängig.\n\nVorabinfo nach § 134 GWB: zwingend 10 Kalendertage Wartefrist (15 bei nicht elektronisch) zwischen Vorabinformation und Zuschlag.",
  },
  {
    slug: "12-eu",
    ref: "§ 12 EU",
    title: "Bekanntmachung EU",
    summary:
      "EU-weite Bekanntmachung über TED-Plattform (Tenders Electronic Daily, ted.europa.eu) zwingend, zusätzlich nationale Plattform. Standardformulare nach Durchführungsverordnung 2019/1780.",
    orderIdx: 204,
    content:
      "Paraphrase:\n\nAbs. 1 — TED-Pflicht: EU-weite Bekanntmachungen erfolgen zwingend über das Amtsblatt der EU (TED — Tenders Electronic Daily, ted.europa.eu).\n\nAbs. 2 — Form: eForms-Standardformulare nach EU-DurchführungsVO 2019/1780 (verpflichtend seit 25.10.2023). Maschinenlesbares XML-Format.\n\nAbs. 3 — Nationale Veröffentlichung: Zusätzlich auf nationaler eVergabe-Plattform (z. B. evergabe-online.de für Bund, Landesplattformen). Nicht vor TED-Veröffentlichung.\n\nAbs. 4 — Inhalt: Identisch mit § 12 (national) plus EU-spezifische Felder (CPV-Codes, NUTS-Code für Ausführungsort, Schwellenwert-Klassifikation).",
  },
  {
    slug: "16-eu",
    ref: "§ 16 EU",
    title: "Eignung und Wertung EU",
    summary:
      "Eignungsprüfung mit Einheitlicher Europäischer Eigenerklärung (EEE / ESPD). Zuschlag nach „wirtschaftlichstem Angebot“ — niedrigster Preis nur ausnahmsweise zulässig (§ 127 GWB).",
    orderIdx: 205,
    content:
      "Paraphrase:\n\nAbs. 1 — Eignungsanforderungen:\n• Berufliche Qualifikation\n• Wirtschaftliche und finanzielle Leistungsfähigkeit\n• Technische und berufliche Leistungsfähigkeit\n\nAbs. 2 — EEE / ESPD: Eignungsnachweis erfolgt grundsätzlich über die Einheitliche Europäische Eigenerklärung (Standardformular ESPD-EEE, online unter ec.europa.eu/tools/espd). Volle Nachweise nur vom Zuschlagskandidaten.\n\nAbs. 3 — Zuschlagskriterien (§ 127 GWB):\n• Wirtschaftlichstes Angebot ist Pflicht\n• Niedrigster Preis nur ausnahmsweise (z. B. standardisierte Bauleistungen)\n• Qualitative, umweltbezogene oder soziale Aspekte zulässig (Tariftreue, Lebenszykluskosten, Innovationsgehalt)\n• Gewichtung muss vorab in der Bekanntmachung veröffentlicht sein\n\nAbs. 4 — Ausschluss-Tatbestände (§§ 123, 124 GWB):\n• Zwingend: Geldwäsche, Korruption, Steuerhinterziehung, Terrorismusfinanzierung, Menschenhandel\n• Fakultativ: Insolvenz, schwere Verfehlung, Wettbewerbsverstoß, Selbstreinigung möglich (§ 125 GWB)",
  },
  {
    slug: "20-eu",
    ref: "§ 20 EU",
    title: "Dokumentation EU + Nachprüfungsverfahren",
    summary:
      "Vergabevermerk umfassend, 10 Jahre Aufbewahrung. Nachprüfung durch Vergabekammer (§§ 155 ff. GWB). Sofortige Beschwerde an OLG-Vergabesenat. Vorabinfo + 10/15-Tage-Wartefrist zwingend.",
    orderIdx: 206,
    content:
      "Paraphrase:\n\nAbs. 1 — Vergabevermerk EU: Inhalt analog § 20 (national), zusätzlich:\n• Begründung Verfahrensart\n• Auswahl der Bewerber im TW\n• Verhandlungsverlauf und -ergebnisse\n• Begründung Aufhebung\n\nAbs. 2 — Aufbewahrung: 10 Jahre.\n\nAbs. 3 — Vorabinformation (§ 134 GWB):\n• Schriftliche/elektronische Mitteilung an alle nicht erfolgreichen Bieter mit Begründung\n• Mit Vorabinfo läuft Wartefrist 10 Tage (elektronisch) bzw. 15 Tage (postalisch) — frühester Zuschlag erst danach\n\nAbs. 4 — Nachprüfungsverfahren:\n• Erste Instanz: Vergabekammer des Bundes / der Länder (Bundeskartellamt — VK Bund, oder Landes-VK)\n• Zweite Instanz: Vergabesenat beim OLG (sofortige Beschwerde)\n• Antrag auf Nachprüfung mit aufschiebender Wirkung — Zuschlag während Verfahren grundsätzlich gesperrt\n• Rügeobliegenheit § 160 Abs. 3 GWB: Bieter muss erkannte Vergabeverstöße innerhalb 10 Kalendertagen rügen\n\nAbs. 5 — Schadensersatz: Bei rechtswidriger Nichtberücksichtigung Schadensersatz nach § 181 GWB (Vertrauensschaden, ggf. entgangener Gewinn).",
  },

  /* ============== ABSCHNITT 3 — SEKTOREN ============== */
  {
    slug: "1-vs",
    ref: "§ 1 VS",
    title: "Anwendungsbereich Sektoren",
    summary:
      "Sektorenauftraggeber im Bereich Wasser, Energie (Strom, Gas, Wärme), Verkehr (öffentlicher Personenverkehr, Häfen, Flughäfen). Schwellenwert 5.538.000 €. Rechtsgrundlage: SektVO.",
    orderIdx: 301,
    content:
      "Paraphrase:\n\nAbs. 1 — Sektoren-Tätigkeiten: Vergabe von Bauleistungen durch Sektorenauftraggeber, die folgende Tätigkeiten ausüben:\n• Trinkwasserversorgung (Bereitstellung, Beförderung, Abgabe)\n• Energieversorgung (Strom, Gas, Wärme — feste Netze)\n• Verkehrsleistungen (öffentlicher Personenverkehr per Bahn, Bus, Tram, U-Bahn)\n• Häfen und Flughäfen (Betrieb, Bereitstellung)\n\nAbs. 2 — Schwellenwert: 5.538.000 € netto (Stand 2024) für Bauleistungen.\n\nAbs. 3 — Rechtsgrundlagen:\n• GWB §§ 97 ff. + § 100 (Sektoren)\n• SektVO (Sektorenverordnung)\n• VOB/A Abschnitt 3\n• EU-Richtlinie 2014/25/EU\n\nAbs. 4 — Privilegierung: Sektorenauftraggeber haben mehr Verfahrensspielraum als klassische öffentliche AG (z. B. Verhandlungsverfahren grundsätzlich frei wählbar).",
  },
  {
    slug: "3-vs",
    ref: "§ 3 VS",
    title: "Verfahrensarten Sektoren",
    summary:
      "Offenes Verfahren, Nicht offenes Verfahren, Verhandlungsverfahren mit Teilnahmewettbewerb sind grundsätzlich gleichberechtigt. Verhandlungsverfahren ohne TW nur bei besonderen Voraussetzungen.",
    orderIdx: 302,
    content:
      "Paraphrase:\n\nAbs. 1 — Wahlfreiheit: Sektorenauftraggeber können zwischen Offenem Verfahren, Nicht offenem Verfahren und Verhandlungsverfahren mit Teilnahmewettbewerb frei wählen — anders als klassische AG (Privilegierung).\n\nAbs. 2 — Verhandlungsverfahren ohne TW: Nur bei Vorliegen besonderer Voraussetzungen (z. B. Geheimhaltung, Dringlichkeit, einziger Anbieter).\n\nAbs. 3 — Wettbewerblicher Dialog / Innovationspartnerschaft: Ebenfalls zulässig wie im klassischen EU-Bereich.\n\nAbs. 4 — Eignungsprüfung: Mit ESPD oder eigener Qualifizierungsregelung des Sektorenauftraggebers (anerkannte Bieterlisten).",
  },
  {
    slug: "16-vs",
    ref: "§ 16 VS",
    title: "Wertung Sektoren",
    summary:
      "Wirtschaftlichstes Angebot. Mehr Spielraum bei Zuschlagskriterien (Lebenszykluskosten, Versorgungssicherheit). Eignungsprüfung über vorhandene Qualifizierungssysteme zulässig.",
    orderIdx: 303,
    content:
      "Paraphrase:\n\nAbs. 1 — Wertung: Wirtschaftlichstes Angebot. Sektorenauftraggeber haben besonderen Spielraum bei der Definition der Zuschlagskriterien:\n• Lebenszykluskosten (Investitions- + Betriebs- + Entsorgungskosten)\n• Versorgungssicherheit / Verfügbarkeit\n• Innovationsgehalt\n• Umwelt- und Sozialbelange\n\nAbs. 2 — Qualifizierungssysteme (§ 48 SektVO): Sektorenauftraggeber können Bieter über vorhandene Listen / Systeme prüfen — anerkannte Qualifizierung ersetzt Einzelfallprüfung.\n\nAbs. 3 — Ausschluss: Tatbestände nach §§ 123, 124 GWB analog. Selbstreinigung möglich.",
  },
  {
    slug: "20-vs",
    ref: "§ 20 VS",
    title: "Dokumentation und Nachprüfung Sektoren",
    summary:
      "Vergabevermerk + 10 Jahre Aufbewahrung. Nachprüfungsverfahren analog Abschnitt 2 — Vergabekammer und OLG-Vergabesenat. § 134 GWB Vorabinfo zwingend.",
    orderIdx: 304,
    content:
      "Paraphrase:\n\nAbs. 1 — Dokumentation: Inhalt und Umfang analog § 20 EU. Aufbewahrung 10 Jahre.\n\nAbs. 2 — Vorabinformation: § 134 GWB gilt entsprechend — 10/15 Tage Wartefrist vor Zuschlag.\n\nAbs. 3 — Nachprüfungsverfahren: Vergabekammer / OLG-Vergabesenat, identisches Verfahren wie Abschnitt 2. Sektoren-Spezifika der materiellen Prüfung beachten (Privilegierung der Verfahrenswahl).\n\nAbs. 4 — Bekanntmachung TED: Pflicht analog Abschnitt 2 für alle EU-Schwellenwert überschreitenden Aufträge.",
  },
];
