/**
 * VOB/C · Allgemeine Technische Vertragsbedingungen für Bauleistungen (ATV)
 * Quelle: DIN-Normenreihe 18299 + 18300–18459 (Stand 2023)
 * Status: DIN-Norm · urheberrechtlich geschützt durch DIN Media (ehem. Beuth Verlag).
 *
 * WICHTIG: Diese Datei enthält redaktionelle Zusammenfassungen für Referenz-Zwecke
 * (Fair Use). Volltexte werden über die DIN-Media-Volumenlizenz (Pro-Tier) freigeschaltet.
 *
 * Aufbau:
 * - DIN 18299 — Allgemeine Regelungen für Bauarbeiten jeder Art (gilt für alle ATV)
 * - DIN 18300–18459 — Gewerke-spezifische ATV (insgesamt 66 Normen)
 *
 * Jede ATV gliedert sich nach festem Schema:
 *   0  Hinweise für das Aufstellen der Leistungsbeschreibung
 *   1  Geltungsbereich
 *   2  Stoffe, Bauteile
 *   3  Ausführung
 *   4  Nebenleistungen / Besondere Leistungen
 *   5  Abrechnung
 */

import type { NewLegalChunk } from "@/db/schema";

export const VOB_C: Omit<NewLegalChunk, "id" | "source">[] = [
  /* ============== DIN 18299 — ALLGEMEINE REGELUNGEN ============== */
  {
    slug: "din-18299",
    ref: "DIN 18299",
    title: "Allgemeine Regelungen für Bauarbeiten jeder Art",
    summary:
      "Übergeordnete ATV. Gilt für alle Gewerke ergänzend zu den jeweiligen ATVs. Regelt einheitliche Begriffe, Stoffhandling, Nebenleistungen und Abrechnungsgrundsätze.",
    orderIdx: 1,
    content:
      "Paraphrase Gesamtaufbau:\n\nAbschnitt 0 — Hinweise für die Leistungsbeschreibung: Beschreibungspflichtige Angaben (z. B. Art und Lage der Baustelle, Vorleistungen anderer Gewerke, Sicherheitsmaßnahmen, Verkehrsregelung).\n\nAbschnitt 1 — Geltungsbereich: DIN 18299 gilt für alle Bauarbeiten ergänzend zur jeweiligen Gewerke-ATV.\n\nAbschnitt 2 — Stoffe, Bauteile: Allgemeine Anforderungen an verwendete Materialien (Übereinstimmung mit Bauregelliste, CE-Kennzeichnung, Lagerung auf der Baustelle).\n\nAbschnitt 3 — Ausführung: Standardanforderungen wie Maßgenauigkeit (DIN 18202), Schutz benachbarter Bauteile, Reinigung des Arbeitsbereichs.\n\nAbschnitt 4 — Nebenleistungen / Besondere Leistungen: WICHTIG — Nebenleistungen sind im Vertragspreis enthalten und nicht gesondert vergütungsfähig. Dazu gehören u. a.:\n• Einrichten und Räumen der Baustelle (Werkzeug, Geräte)\n• Vorhalten von Schutzeinrichtungen\n• Beseitigen von Verunreinigungen, die durch eigene Arbeiten entstehen\n• Schutz der eigenen Leistung\nBesondere Leistungen sind gesondert zu vergüten und müssen im LV ausgeschrieben sein (z. B. Beweissicherungsverfahren, Sondergerüste, Baustrom-/Bauwasser-Lieferung).\n\nAbschnitt 5 — Abrechnung: Allgemeine Abrechnungsgrundsätze, sofern nichts in der Gewerke-ATV anders geregelt. Verweise auf Aufmaßregeln, Abzugsregelungen für Öffnungen.\n\n---\n\n**Abrechnungs-Grundsätze nach DIN 18299 (gelten übergreifend, sofern ATV nichts anderes bestimmt)**\n\nAufmaßmethoden:\n• Aufmaß aus Zeichnung — wenn die ausgeführten Maße den Plänen entsprechen, ohne tatsächliche Vermessung am Bauwerk\n• Örtliches Aufmaß — Vermessung am Bauwerk, gemeinsam mit AG\n• Bauteil-bezogenes Aufmaß (Stck.) — bei genormten Einzelteilen\n• Pauschal — wenn vertraglich vereinbart\n\nAbrechnungseinheiten und ihre Verwendung:\n• m  — laufende Bauteile (Bordsteine, Sockel, Anschlussfugen, Pfeiler < 1 m)\n• m² — Flächen (Wand, Decke, Boden, Putz, Anstrich, Estrich, Fliesen)\n• m³ — Volumenkörper (Erdaushub, Beton, Massiv-Holz, Verfüllung)\n• t   — Massenstoffe (Asphalt, Bewehrungsstahl, Stahlträger)\n• Stck. — Einzelbauteile (Tür, Fenster, Heizkörper, Steckdose, Bordstein-Sondersteine)\n• psch. — pauschal vergütete Teilleistungen (Baustelleneinrichtung, Inbetriebnahme)\n• St.-Lohn — Stundenlohnarbeiten nach § 15 VOB/B (vorab anzeigen!)\n\nÜbermessungs-Doktrin (allgemein, gilt sofern ATV nichts anderes regelt):\n• Kleine Öffnungen, Aussparungen, Vorsprünge werden ÜBERMESSEN (= voll vergütet, kein Abzug)\n• Begründung: gleicher oder höherer Aufwand für Schneiden, Anpassen, Detail-Ausbildung\n• Konkrete Grenzen sind ATV-spezifisch (z. B. Mauer 2,5 m², Putz 2,5 m², Fliesen 0,1 m², Dach 0,5 m², Estrich 0,1 m²)\n\nAbzüge (Standard, sofern nicht ATV-abweichend):\n• Bauteile aus anderen Stoffen werden abgezogen (z. B. Stahlbeton-Stütze in Mauerwerk-Wand)\n• Öffnungen über der ATV-spezifischen Übermessungsgrenze werden mit Voll-Maß abgezogen\n• Verfüllte Aussparungen, die einer anderen Position zuzurechnen sind\n\nNebenleistungen (im Einheitspreis enthalten — KEINE eigene Position!):\n• Standard-Baustelleneinrichtung im Wirkungsbereich des Gewerks\n• Eigene Geräte und Werkzeug\n• Maßgenauigkeits-Sicherung der eigenen Arbeit\n• Reinigung der Arbeitsstelle nach Fertigstellung\n• Aufmaß und Abrechnungsunterlagen (Aufmaßzettel, Massenermittlung)\n• Bauwasser/Baustrom in geringem Umfang aus AG-bereitstellung\n\nBesondere Leistungen (NUR vergütet, wenn im LV ausgeschrieben):\n• Sondergerüste über Standardgerüst hinaus\n• Schutzmaßnahmen bei laufendem Betrieb (Lärm, Staub, Sicht)\n• Nachweise über Standard hinaus (Probekörper, Eignungsprüfungen, Fremdüberwachung)\n• Beweissicherungsverfahren am Bestand\n• Lieferung Bauwasser/Baustrom durch den AN\n• Außerstunden-Arbeit (Nacht, Wochenende, Feiertag) auf AG-Verlangen\n• Witterungsschutz über Standard hinaus (z. B. Heizen im Winter zur Belegreife)\n\nWICHTIG für AN: Nebenleistungen NICHT separat ausschreiben/abrechnen — Risiko der doppelten Vergütung. Besondere Leistungen MÜSSEN im LV stehen, sonst keine Vergütung (BGH-Linie).",
  },

  /* ============== ATVs — DIN 18300–18459 (66 Gewerke) ============== */
  {
    slug: "din-18300",
    ref: "DIN 18300",
    title: "Erdarbeiten",
    summary:
      "Aushub, Abtrag, Auftrag, Boden­austausch, Verfüllung. Bodenklassen B1–B7 (homogene/feste Boden- und Felsklassifikation gemäß DIN 18300:2019).",
    orderIdx: 2,
    content:
      "Paraphrase:\n\nGeltungsbereich: Erdarbeiten aller Art — Mutterboden, Bodenaushub, Felsabbau, Hinterfüllen.\n\nStoffe: Vorgaben zu Verfüllungsmaterial (Eignung, Korngröße, Verdichtbarkeit).\n\nAusführung: Boden ist nach Klassen B1–B7 (homogen) bzw. F1–F2 (Fels) zu klassifizieren — diese ersetzen seit 2016 die alte 7-stufige Bodenklassifikation. Verdichtung nach Proctor (DIN 18127). Schutz vor Aufweichen bei Witterung.\n\nNebenleistungen: Massenaufnahme, Lösen und Laden bis 100 m Förderstrecke, Sicherung Böschungen ≤ 1,75 m Tiefe.\n\nBesondere Leistungen: Bodenuntersuchungen, Beseitigung kontaminierter Böden, Wasserhaltung, Spundwände, Verbau.\n\n---\n\n**Abrechnung im Detail (DIN 18300)**\n\nEinheit:\n• Aushub, Mutterbodenabtrag, Auffüllung: m³\n• Bodenklassifikation (Mehrkosten je Klasse): m³ je Klasse\n• Böschungssicherung, Profilierung: m² geneigter Fläche\n• Bodenaustausch: m³\n• Mutterbodenlieferung/-anlieferung: m³ oder t\n\nAufmaß:\n• Gewachsener Boden — Volumen im FESTEN Zustand vor Aushub (nicht nach Auflockerung im LKW)\n• Profilierungs-Solllinie aus Plan = Abrechnungsgrenze; Mehraushub durch Maschinen-Toleranz wird NICHT vergütet\n• Bei Aushub mit Böschung: Berechnung nach Zeichnungs-Soll inkl. notwendiger Böschung\n\nÜbermessen / Abzüge:\n• Einbauten ≤ 0,5 m³ werden ÜBERMESSEN (z. B. Findlinge im Aushub)\n• Vorhandene Hohlräume, ehem. Keller: werden vom Aushub abgezogen, eigene Position für Verfüllung\n• Bei Felsausbruch: Klüfte, die zum Mehraushub zwingen, werden im tatsächlichen Maß vergütet\n\nNebenleistungen (im EP enthalten):\n• Lösen, Laden, Transport bis 100 m Förderweg auf der Baustelle\n• Auflockerung, Aushub-Auflockerung\n• Profilieren der Böschungen\n• Schutz benachbarter Bauteile gegen Verschmutzung durch Aushub\n• Sicherung Böschungen ≤ 1,75 m Tiefe (sonst DIN 4124)\n\nBesondere Leistungen (gesondert abzurechnen):\n• Beseitigung von Findlingen > 0,5 m³ (Stck. oder m³)\n• Wasserhaltung — eigene Position nach DIN 18305\n• Verbau Baugrube — eigene Position nach DIN 18303\n• Entsorgung kontaminierten Aushubs (Z 1.1, Z 1.2, Z 2 nach LAGA — t mit Entsorgungsnachweis)\n• Förderwege > 100 m oder Lagerung auf Halde mit Wiedereinbau\n• Bodenuntersuchung, geotechnische Begleitung\n• Verdichtungskontrolle mit Plattendruckversuch / Proctor (Stck. Prüfung)\n\nWICHTIG: Auflockerungsfaktor (i. d. R. 1,2–1,4 je nach Boden) wird beim Transport nicht extra vergütet — Volumen im LKW spielt keine Rolle. Streitthema bei großen Massen!",
  },
  {
    slug: "din-18301",
    ref: "DIN 18301",
    title: "Bohrarbeiten",
    summary:
      "Erdbohrungen, Brunnenbohrungen, Pfahlbohrungen, Felsbohrungen. Klassifikation der Bohrgüte und Bohrverfahren (Schlagbohren, Drehbohren, Rotary).",
    orderIdx: 3,
    content:
      "Paraphrase: Geltung für Bohrarbeiten in Boden und Fels. Stoff- und Verfahrensanforderungen je nach Bohrtyp (Erkundungs-, Brunnen-, Pfahlbohrung). Nebenleistungen: Standorteinrichtung, Geräte-Vorhaltung im üblichen Umfang. Besondere Leistungen: Bohrkernentnahme nach besonderer Anforderung, Verrohrung zur Sicherung.",
  },
  {
    slug: "din-18303",
    ref: "DIN 18303",
    title: "Verbauarbeiten",
    summary:
      "Trägerbohlwand, Spundwand, Bohrpfahlwand, Schlitzwand. Sicherung von Baugruben über 1,75 m Tiefe gem. DIN 4124.",
    orderIdx: 4,
    content:
      "Paraphrase: Sicherung von Baugruben durch Verbauwände. Materialwahl je nach Aushubtiefe und Bodenverhältnissen. Vorgaben zu Anker, Steifen, Gurten. Nebenleistungen: Setzen und Ziehen einfacher Verbauelemente. Besondere Leistungen: Statik, dauerhafter Verbau, Lieferung Sonderelemente.",
  },
  {
    slug: "din-18304",
    ref: "DIN 18304",
    title: "Ramm-, Rüttel- und Pressarbeiten",
    summary:
      "Einbringen von Pfählen und Spundbohlen durch Rammen, Rütteln oder Eindrücken. Vorgaben für Erschütterungsmessungen bei Nachbarschutz.",
    orderIdx: 5,
    content:
      "Paraphrase: Verfahren zum Einbringen von Pfählen / Spundwänden. Geräteklassen, Energiezuführung, zulässige Schlagzahl. Erschütterungsmonitoring (DIN 4150) Pflicht bei sensibler Nachbarbebauung. Nebenleistungen: einfache Mess- und Protokollierung der Pfahllängen. Besondere Leistungen: Erschütterungsgutachten.",
  },
  {
    slug: "din-18305",
    ref: "DIN 18305",
    title: "Wasserhaltungsarbeiten",
    summary:
      "Offenes Pumpen, Brunnen, Vakuumhaltung, Spundwand-/Schlitzwand-Dichtsysteme. Bei Grundwassereingriff: wasserrechtliche Erlaubnis erforderlich.",
    orderIdx: 6,
    content:
      "Paraphrase: Trockenhaltung der Baugrube durch Pumpen oder Grundwasser-Absenkung. Stoffe: Filterkies, Vlies, Pumpentechnik. Ausführung: Bemessung Förderleistung, Standzeit. Nebenleistungen: Vorhalten Standardtechnik. Besondere Leistungen: Genehmigungsanträge, Wassergutachten, Betrieb über übliche Bauzeit hinaus.",
  },
  {
    slug: "din-18306",
    ref: "DIN 18306",
    title: "Entwässerungskanalarbeiten",
    summary:
      "Schmutz-, Regen-, Mischwasserkanäle. Rohrwerkstoffe (Steinzeug, Beton, PE-HD, GFK). Verlegung mit Sohlgefälle, Schachtbauwerken, Dichtheitsprüfung.",
    orderIdx: 7,
    content:
      "Paraphrase: Bau von Abwasser-/Regenwasserkanälen außerhalb von Gebäuden. Materialwahl nach Lasten und Aggressivität. Verlegen mit Bettung, Anbindung an Schächte. Dichtheitsprüfung nach DIN EN 1610. Nebenleistungen: Standardrohre, einfache Schachtanschlüsse. Besondere Leistungen: Schachtsonderformen, Auftriebssicherung im Grundwasser.\n\n---\n\n**Abrechnung im Detail (DIN 18306)**\n\nEinheit:\n• Rohrleitung verlegt: m (in der Achse, von Schacht-Mitte zu Schacht-Mitte)\n• Schächte: Stck., gestaffelt nach Tiefe und Durchmesser\n• Schachtabdeckungen, Aufsätze: Stck.\n• Anschluss an Bestand: Stck. je Anschlusspunkt\n• Bettung, Verfüllung Leitungsgraben: m³ (separater LV-Punkt)\n\nAufmaß:\n• Rohrlängen werden in Achsen gemessen — Schachtdurchmesser wird NICHT abgezogen (Leitung gilt durchgehend)\n• Tiefe wird vom Geländeniveau zur Rohr-Sohle gemessen\n• Schachttiefe als gestaffelte Position: bis 1,50 m / 1,50–3,00 m / 3,00–5,00 m / über 5,00 m\n\nÜbermessen / Abzüge:\n• Einzelne Bögen, T-Stücke, Reduzierungen: Stck.-Position oder im Rohr-EP enthalten (LV-abhängig)\n• Schachtkörper wird NICHT von Rohrlänge abgezogen\n\nNebenleistungen (im EP enthalten):\n• Verlegen, Verbinden, Dichtheitsprüfung in Standardumfang\n• Standard-Rohrkupplungen, Dichtringe\n• Anpassung an Bestand bei Standardanschluss\n• Bettungsmaterial in Standard-Schichtdicke wenn im Rohr-EP zugeschlagen\n\nBesondere Leistungen:\n• Sonderformteile (gewinkelte Anschlüsse, Reinigungsstücke außerhalb Standard)\n• Auftriebssicherung im Grundwasser (Betongewicht, Anker)\n• TV-Inspektion und Druckprüfung über Standard hinaus\n• Schachtsanierung im Bestand\n• Druckluft- oder Wasserdichtheitsprüfung mit Protokoll je Abschnitt\n• Hebeanlagen, Pumpwerke (separate Position als Anlage)\n\nWICHTIG: Dichtheitsprüfung nach DIN EN 1610 ist Nebenleistung und KEINE eigene Position — Pflicht des AN!",
  },
  {
    slug: "din-18307",
    ref: "DIN 18307",
    title: "Druckrohrleitungsarbeiten",
    summary:
      "Trinkwasser-, Gas-, Druckabwasserleitungen außerhalb von Gebäuden. Druckprüfung nach DVGW-Regelwerk W 400 / G 469.",
    orderIdx: 8,
    content:
      "Paraphrase: Verlegen von Druckrohrleitungen für Wasser, Gas, Abwasser unter Druck. Werkstoffe: Stahl, Guss, PE-HD, GFK. Verbindungstechnik je nach Werkstoff. Druckprüfungen nach DVGW. Nebenleistungen: Standardprüfung. Besondere Leistungen: Spülung, Desinfektion, Inbetriebnahme im Verbund.",
  },
  {
    slug: "din-18308",
    ref: "DIN 18308",
    title: "Drän- und Versickerungsarbeiten",
    summary:
      "Sickerleitungen, Sickerschächte, Rigolen, Mulden-Rigolen-Systeme. Nachweis der Versickerungsleistung nach DWA-A 138.",
    orderIdx: 9,
    content:
      "Paraphrase: Anlagen zur Regenwasser-Versickerung und Bauwerks­dränage. Materialwahl Vlies, Sickerrohr (geschlitzt), Splittfilter. Bemessung nach DWA-A 138. Nebenleistungen: einfacher Anschluss. Besondere Leistungen: Versickerungsleistungs-Nachweis, Genehmigungsverfahren.",
  },
  {
    slug: "din-18309",
    ref: "DIN 18309",
    title: "Einpressarbeiten",
    summary:
      "Verfüllen von Hohlräumen, Anker, Pfählen mit Zementmörtel oder Spezialinjektion. Druck-/Mengen-Protokolle.",
    orderIdx: 10,
    content:
      "Paraphrase: Verpressung von Suspensionen oder Mörtel zum Schließen von Hohlräumen oder zur Abdichtung. Materialwahl: Zementmörtel, Bentonit-Zement-Suspension, Acrylatgele. Mengen- und Druckprotokoll Pflicht. Nebenleistungen: einfache Verpressung. Besondere Leistungen: Spezialinjektionen, Eignungsprüfung, Erfolgskontrolle durch Bohrung.",
  },
  {
    slug: "din-18311",
    ref: "DIN 18311",
    title: "Nassbaggerarbeiten",
    summary:
      "Aushub unter Wasser durch Saug- oder Greiferbagger. Vorgaben für Hafen-, Fluss- und Seebau.",
    orderIdx: 11,
    content:
      "Paraphrase: Aushub von Boden unter dem Wasserspiegel. Geräteklassen (Saugbagger, Eimerkettenbagger, Greifer). Sediment- und Tiefenkontrolle. Besondere Leistungen: Sondervergütung bei Findlingen, Beweissicherung Gewässersohle.",
  },
  {
    slug: "din-18312",
    ref: "DIN 18312",
    title: "Untertagebauarbeiten",
    summary:
      "Tunnel-, Stollen-, Schachtbau. Spritzbeton-Sicherung, Tübbing, NATM. Sehr spezielle ATV mit hohem Sicherheits- und Geotechnik-Anteil.",
    orderIdx: 12,
    content:
      "Paraphrase: Untertagebau für Tunnel, Stollen, Schächte. Verfahren: Spritzbetonbauweise (NATM), Schildvortrieb, Bohren-Sprengen. Sehr spezifische Vorgaben zu Bewetterung, Beleuchtung, Rettung. Besondere Leistungen: praktisch alles über Standardvortrieb hinaus.",
  },
  {
    slug: "din-18313",
    ref: "DIN 18313",
    title: "Schlitzwandarbeiten mit stützender Flüssigkeit",
    summary:
      "Schlitzwände als Bauwerks- oder Baugrubenwand. Bentonitsuspension zur Stützung beim Aushub. Bewehrung, Betonage im Kontraktorverfahren.",
    orderIdx: 13,
    content:
      "Paraphrase: Errichten von Schlitzwänden — Aushub mit Greifer in Bentonit-suspensionsstabilisierter Schlitzbohrung, danach Einbringen Bewehrungskorb und Betonage von unten. Eigenschaften: hochbelastbar, dicht, geeignet für tiefe Baugruben in beengter Umgebung. Besondere Leistungen: Suspensions-Aufbereitung, Anschlusspraxis.",
  },
  {
    slug: "din-18314",
    ref: "DIN 18314",
    title: "Spritzbetonarbeiten",
    summary:
      "Spritzbeton im Trocken- oder Nassspritzverfahren. Sicherung Felshangs, Tunnel, Sanierung Beton.",
    orderIdx: 14,
    content:
      "Paraphrase: Spritzbeton-Anwendung. Verfahren: Trockenspritzen (höhere Rückprallrate), Nassspritzen (gleichmäßiger). Anforderungen an Auftragsdicke, Haftung, Bewehrung mit Mattenbewehrung oder Stahlfasern. Besondere Leistungen: Stahlfaserbeton, Anker-/Vernagelung.",
  },
  {
    slug: "din-18315",
    ref: "DIN 18315",
    title: "Verkehrswegebauarbeiten — Oberbauschichten ohne Bindemittel",
    summary:
      "Frostschutzschicht, Schottertragschicht, Kiestragschicht. Mineralstoffbau für Straßen, Wege, Plätze.",
    orderIdx: 15,
    content:
      "Paraphrase: Ungebundene Tragschichten (FSS, STS, KTS) im Verkehrsflächenbau. Stoffanforderungen nach TL SoB-StB. Verdichtungsgrad Ev2 ≥ 120 MN/m² (Frostschutzschicht). Besondere Leistungen: Eignungsprüfungen Korngemisch, Sondergeräte.\n\n---\n\n**Abrechnung im Detail (DIN 18315)**\n\nEinheit:\n• Tragschicht: m² mit Angabe der Schichtdicke (z. B. „FSS d=30 cm“)\n• Alternativ m³ wenn Schichtdicke variabel\n• Profilieren der Planums-Oberfläche: m²\n• Materiallieferung lose: t oder m³\n\nAufmaß:\n• m² nach gerichteter Außenkante des Verkehrsweges\n• Bei Bordsteinen: bis Bord-Innenkante\n• Schichtdicke nach Sollmaß aus Plan, Mehrdicken durch Profilierung werden nicht extra vergütet\n\nÜbermessen / Abzüge:\n• Schächte, Sinkkästen ≤ 0,5 m² werden ÜBERMESSEN\n• Größere Einbauten werden mit ihrem flächenmäßigen Umfang abgezogen\n\nNebenleistungen:\n• Einbau, Verdichten, Profilieren\n• Standard-Verdichtungskontrolle (Plattendruckversuch je angefangene 1.000 m²)\n• Anpassung an Schächte und Bordeinfassungen\n\nBesondere Leistungen:\n• Eignungsprüfung des Korngemischs (Stck. Prüfung)\n• Plattendruckversuch über Standardumfang hinaus\n• Materialanlieferung über besonders schwierigen Zugang\n• Sondergeräte für beengte Stellen\n• Ev2-Nachweis ≥ 180 MN/m² (Hochbeanspruchung) statt Standard 120 MN/m²",
  },
  {
    slug: "din-18316",
    ref: "DIN 18316",
    title: "Verkehrswegebauarbeiten — Oberbauschichten mit hydraulischen Bindemitteln",
    summary:
      "HGT (Hydraulisch gebundene Tragschicht), Betontragschicht, Bodenverfestigung mit Zement/Kalk. Höhere Tragfähigkeit als ungebundene Schichten.",
    orderIdx: 16,
    content:
      "Paraphrase: Tragschichten mit hydraulischen Bindemitteln (Zement, Kalk-Zement). Mischungsanteile, Verdichtung, Nachbehandlung gegen Austrocknung. Druckfestigkeitsnachweise. Besondere Leistungen: Eignungsprüfungen Bindemittelgehalt, Sägeschnitt-Fugen.",
  },
  {
    slug: "din-18317",
    ref: "DIN 18317",
    title: "Verkehrswegebauarbeiten — Oberbauschichten aus Asphalt",
    summary:
      "Asphalttrag-, -binder-, -deckschicht. Walzasphalt nach TL Asphalt-StB. Einbau im Splittmastix- oder Asphaltbeton-Verfahren.",
    orderIdx: 17,
    content:
      "Paraphrase: Asphaltarbeiten — Tragschicht (AC T), Binderschicht (AC B), Deckschicht (AC D, SMA). Korngrößen, Bindemittel (Bitumen 50/70, PmB), Verdichtungsgrad. Einbautemperaturen. Nebenleistungen: Standardeinbau. Besondere Leistungen: Sondernähte, Fugenversiegelung, lärmoptimierte Deckschichten (LOA), Gussasphalt.\n\n---\n\n**Abrechnung im Detail (DIN 18317)**\n\nEinheit:\n• Asphaltschicht: m² mit Schichtdicke (z. B. „AC 11 D S 4 cm“)\n• Alternativ t (Tonnage) bei Mengenkontrolle vom Mischwerk\n• Anschlussfugen: m\n• Fugenversiegelung: m\n• Reinigen / Anspritzen Untergrund: m²\n• Aufbruch alter Asphalt: m² (Schichtdicke je nach LV)\n\nAufmaß:\n• m² entlang Außenkante der eingebauten Schicht\n• Bei Lieferschein-Abrechnung: t mit Tara-Bescheinigung des Mischwerks\n• Schichtdickenkontrolle durch Bohrkern alle 1.000 m² oder je 1.000 t\n\nÜbermessen / Abzüge:\n• Schachtdeckel, Sinkkästen, Anschlussschächte ≤ 0,5 m² ÜBERMESSEN\n• Anpassen an Schachtdeckel ist Nebenleistung (Schneiden, Heißverguss randseitig)\n• Größere Einbauten werden flächenmäßig abgezogen\n\nNebenleistungen:\n• Einbau, Verdichten, Vorgegebene Einbautemperaturen einhalten\n• Anspritzen mit Bitumenemulsion (sofern nicht eigene LV-Position)\n• Anpassung an Bordsteine, Schächte\n• Heißanschluss zwischen den Schichten\n• Standard-Bohrkernentnahme zur Schichtdicken-Kontrolle\n\nBesondere Leistungen:\n• Sondernähte mit Vorbereitung (Schneiden, Anspritzen, Heißverguss)\n• Fugenversiegelung als eigene Position\n• Lärmoptimierte Asphaltdeckschicht (LOA, SMA LA)\n• Gussasphalt mit speziellen Einbautechniken\n• Witterungsschutz (Heizung Asphalt im Winter)\n• Eignungsprüfung Mischgutrezept\n• Verkehrsführung, Beschilderung bei Einbau (RSA-Konzept als eigene Position)\n\nWICHTIG: Bohrkernentnahme zur Schichtdickenmessung gehört zur Standardprüfung — nicht extra abrechnen.",
  },
  {
    slug: "din-18318",
    ref: "DIN 18318",
    title: "Verkehrswegebauarbeiten — Pflasterdecken, Plattenbeläge, Einfassungen",
    summary:
      "Betonpflaster, Natursteinpflaster, Plattenbeläge in ungebundener Bauweise. Bordsteine, Einfassungen.",
    orderIdx: 18,
    content:
      "Paraphrase: Pflasterungen aus Betonsteinen, Natursteinen, Klinker. Verlegung in Pflasterbett (Splitt/Sand) oder Mörtelbett. Fugenfüllung. Besondere Leistungen: Sondersteine, gebundene Bauweise (Mörtelfuge), Einbau in Bogenform.\n\n---\n\n**Abrechnung im Detail (DIN 18318)**\n\nEinheit:\n• Pflasterfläche, Plattenbelag: m²\n• Bordsteine, Tiefborde, Hochborde, Rinnen: m\n• Sondersteine (Bordstein-Eckstücke, Anlauframpen, Pflasterzeilen-Übergänge): Stck.\n• Fugen-Sandeinkehrung / -Mörtelfuge: m² (im Pflaster-EP üblicherweise enthalten)\n• Pflasterbett: m³ oder m²-Anteil im Pflaster-EP\n• Aufbruch / Abbruch Bestand: m² oder m³\n\nAufmaß:\n• Pflasterfläche ohne Abzug der Fugenflächen — Fugen sind im Pflaster\n• Bordsteine in laufenden Metern entlang der Außenkante\n• Bei Bogenführung (Einfahrten, Pflasterzeilen): Mehraufwand als Stck.-Position oder mit Bogen-Zuschlag im EP\n\nÜbermessen / Abzüge:\n• Schachtdeckel, Sinkkästen, kleine Einbauten ≤ 0,5 m² werden ÜBERMESSEN\n• Bauteile aus anderen Stoffen ≤ 0,5 m² ebenfalls\n• Größere Einbauten werden mit ihrer Aufstandsfläche abgezogen\n• Bordsteine: Sondersteine (Tiefborde, Anlauframpen) zählen NICHT in die laufenden Borde-Meter\n\nNebenleistungen:\n• Verlegen, Verfugen, Abrütteln\n• Standard-Anpassung an Schachtdeckel und Einbauten\n• Pflasterbett aus Splitt/Sand in Standard-Schichtdicke 3–5 cm\n• Höhen-Einrichtung mit Standard-Toleranz\n• Reinigung der fertigen Fläche\n\nBesondere Leistungen:\n• Sondersteine als Stck.-Position (Eckstücke, Schräganschlüsse, Pflasterzeilen)\n• Gebundene Bauweise (Mörtelbett + Mörtelfuge) statt Standard-Splittbettung\n• Imprägnieren / Versiegeln der Pflasterfläche\n• Bordsteine setzen mit Rückenstütze aus Beton (B25 Pflastersteinrückenstütze, eigene Position)\n• Höhen-Einrichtung mit Sondertoleranz < 5 mm\n• Mehraufwand bei Bogenpflaster, Bordstein-Bogen mit Steinklein-Verzug",
  },
  {
    slug: "din-18319",
    ref: "DIN 18319",
    title: "Rohrvortriebsarbeiten",
    summary:
      "Grabenloser Rohrvortrieb (Microtunneling, Rohrvortrieb), Pressrohre aus Stahl, Beton, Steinzeug.",
    orderIdx: 19,
    content:
      "Paraphrase: Verlegen von Rohren ohne offenen Graben — Vortriebsmaschine drückt Rohrstrang durch das Erdreich. Geeignet bei Unterquerung Straßen, Bahnlinien, Gewässern. Besondere Leistungen: Schmierung mit Bentonit, Vermessung, Zwischenpressstationen.",
  },
  {
    slug: "din-18320",
    ref: "DIN 18320",
    title: "Landschaftsbauarbeiten",
    summary:
      "Vegetationstechnische Arbeiten — Pflanzungen, Rasen, Wiesen, Bodensanierung. Garten- und Landschaftsbau (GaLaBau).",
    orderIdx: 20,
    content:
      "Paraphrase: Vegetationsarbeiten im GaLaBau. Bodenvorbereitung (Mutterboden, Anreicherung), Pflanzungen, Begrünungen, Rasensaaten, Pflegegänge in Etablierungsphase (i. d. R. 1 Jahr). Besondere Leistungen: Spezialpflanzen, Pflege über Etablierung hinaus, Wässerung in Trockenphase.",
  },
  {
    slug: "din-18321",
    ref: "DIN 18321",
    title: "Düsenstrahlarbeiten",
    summary:
      "Düsenstrahlverfahren (Soilcrete, Jet Grouting) zur Erdkörper-Verfestigung mit Hochdruck-Zementsuspension.",
    orderIdx: 21,
    content:
      "Paraphrase: Hochdruck-Injektion von Zementsuspension durch Düsen am Bohrgestänge zur Erzeugung von Boden-Zement-Säulen — zur Baugrundverfestigung, Unterfangung, Abdichtung. Besondere Leistungen: Eignungsprüfungen, Säulenprobenahme, Erfolgskontrolle.",
  },
  {
    slug: "din-18322",
    ref: "DIN 18322",
    title: "Kabelleitungstiefbauarbeiten",
    summary:
      "Tiefbauarbeiten für Erd-Kabel (Strom, Telekommunikation, Lichtwellenleiter). Kabelpflug, Kabelgraben, Mantelrohre, Kabelschächte.",
    orderIdx: 22,
    content:
      "Paraphrase: Kabel-Tiefbau — offener Graben oder grabenloses Verfahren (Kabelpflug, HDD-Bohrung). Verlegetiefe nach Versorger-Vorgaben (üblich 60–80 cm bei NS, 80–120 cm bei MS/HS). Materialien: Mantelrohre PE/PVC, Warnbänder, Kabelschutzziegel. Besondere Leistungen: HDD-Bohrungen, Sanierung Bestand.",
  },
  {
    slug: "din-18325",
    ref: "DIN 18325",
    title: "Gleisbauarbeiten",
    summary:
      "Bahnbau — Schienen, Schwellen, Gleisbett, Weichen. Standardspur, Schmalspur, Straßenbahn.",
    orderIdx: 23,
    content:
      "Paraphrase: Verlegen und Reparieren von Gleisanlagen. Schienen UIC 60, Holz-/Beton-Schwellen, Schotterbett, Stopf- und Richtarbeiten. Besondere Leistungen: feste Fahrbahn (Rheda-System), Weichenkonstruktionen, Schweißverbindungen (Thermitschweißung).",
  },
  {
    slug: "din-18330",
    ref: "DIN 18330",
    title: "Mauerarbeiten",
    summary:
      "Mauerwerk aus Vollstein, Hochlochstein, Porenbeton, Kalksandstein. Mörtelgruppen MG II–IV, NM/DM. Wandstärken nach Statik.",
    orderIdx: 24,
    content:
      "Paraphrase:\n\nGeltung: Maurerarbeiten Innen- und Außenwände aus mineralischen Mauersteinen.\n\nStoffe: Mauersteine nach DIN EN 771, Mörtel nach DIN EN 998-2 (Normalmörtel NM, Dünnbettmörtel DM, Leichtmörtel LM). Bewehrung Lagerfugen.\n\nAusführung: Verband (Läufer-, Block-, Kreuzverband), Fugenausbildung (vermörtelt, ausgespart), Maßgenauigkeit nach DIN 18202. Schutz gegen Bauwerksabdichtung.\n\nNebenleistungen: einfache Aussparungen ≤ 0,1 m², Reinigung Wand-Oberfläche.\n\nBesondere Leistungen: Fertigbauteile (Stürze als Sonderbestellung), Sichtmauerwerk (Hochwertige Optikfuge), nachträgliche Schlitze für Installationen.\n\n---\n\n**Abrechnung im Detail (DIN 18330)**\n\nEinheit:\n• Wand-/Deckenflächen: m² mit Wanddicke (z. B. „24 cm KS-Mauerwerk“)\n• Pfeiler < 1,00 m Breite: m laufend\n• Mauer-Ringbalken, Sturzbalken, Mauerkronen: m\n• Stürze, Fertigbauteile: Stck.\n• Mauerverband-Sonderausführung: m² Aufpreis\n\nAufmaß:\n• m² nach Außenmaßen Wand, ohne Putzdicke\n• Wandhöhe von OK Rohdecke bis UK Rohdecke der nächsten Etage\n• Bei verschiedenen Wandstärken: getrennte Positionen\n• Pfeiler: nur < 1,00 m Breite in Meter, sonst in m² zur Wand\n\nÜbermessen / Abzüge:\n• Öffnungen ≤ 2,5 m² werden ÜBERMESSEN (= voll vergütet, kein Abzug)\n  Begründung: Aufwand für Sturz, Schneiden, Anpassen bleibt\n• Öffnungen > 2,5 m² werden VOLL abgezogen (auch Sturzbereich)\n• Aussparungen ≤ 0,1 m² oder ≤ 0,1 m³ Tiefe werden ÜBERMESSEN\n• Stahlbeton-Stützen, -Stürze, -Unterzüge ≤ 0,1 m² werden ÜBERMESSEN, sonst abziehen\n• Schornsteine, Lüftungs-Leichtschächte werden mit Aufstandsfläche abgezogen\n\nNebenleistungen (im EP enthalten):\n• Aussparungen, Schlitze ≤ 0,1 m² je Stk. (auch nachträglich)\n• Standard-Maßgenauigkeit DIN 18202 Toleranzen-Klasse 2\n• Reinigung der Wand nach Fertigstellung\n• Verbände, Eckverzahnungen, Anschlüsse an Bestand\n• Ringanker, Ringbalken bis ATV-Standardabmessungen\n• Bewehrungseinlagen Lagerfuge in Standardausführung\n\nBesondere Leistungen:\n• Aussparungen > 0,1 m² (Stck.-Position oder m²)\n• Fertigbauteile (Stürze, Treppenstufen) — Stck.\n• Sichtmauerwerk: hochwertige Verfugung — Aufpreis je m² Sichtfläche\n• Sondermörtel (Trass, schnelle Erhärtung)\n• Wärmedämmender Sondermauerstein-Aufpreis\n• Brandschutz-Mauerwerk F90/F120 mit Spezialstein\n• Schalldämm-Sonderausführung Rw ≥ 53 dB (Trennwände MFH)\n• Nachträgliche Schlitze für Installationen (m je Schlitz)\n• Putzträger, Eckschutzschienen separat\n\nWICHTIG: Die 2,5-m²-Übermessungsregel ist eines der wichtigsten Abrechnungsthemen — Türen mit Standardmaß 0,885 × 2,01 m (≈ 1,8 m²) werden voll mitvergütet!",
  },
  {
    slug: "din-18331",
    ref: "DIN 18331",
    title: "Betonarbeiten",
    summary:
      "Beton- und Stahlbetonarbeiten. Festigkeitsklassen C12/15 bis C100/115. Expositionsklassen XC, XD, XF, XS, XA. Schalung, Bewehrung, Betonage, Nachbehandlung.",
    orderIdx: 25,
    content:
      "Paraphrase:\n\nGeltung: Beton- und Stahlbetonbau aller Art.\n\nStoffe: Beton nach DIN EN 206-1 / DIN 1045-2, Bewehrungsstahl B500A/B nach DIN 488. Expositionsklassen für Korrosionsschutz (XC1–XC4 Karbonatisierung, XF1–XF4 Frost, XA1–XA3 chemischer Angriff).\n\nAusführung: Schalung — saugende oder nichtsaugende Schalhaut, Sichtbetonklassen SB1–SB4 nach DBV-Merkblatt. Bewehrung mit Betondeckungsmaß cnom (i. d. R. 25–55 mm je Expositionsklasse). Betonage — Verdichtung mit Innen- oder Außenrüttler, Frischbetonschutz. Nachbehandlung (Feuchthalten 3–7 Tage gegen frühes Austrocknen).\n\nNebenleistungen: einfache Aussparungen, Standardschalung mit glatter Oberfläche.\n\nBesondere Leistungen: Sichtbeton SB3/SB4, Glasfaser- oder Stahlfaserbeton, Massenbeton mit Wärmemanagement, Hochfester Beton.\n\n---\n\n**Abrechnung im Detail (DIN 18331)**\n\nEinheit:\n• Beton-Bauteil (Wand, Decke, Stütze, Fundament): m³\n• Bewehrungsstahl: t (verlegt, einschl. Verschnitt bis Standardquote)\n• Schalung: m² Schalungsfläche (nur wenn LV-Position; sonst im Beton-EP enthalten)\n• Sichtbeton-Aufpreis je Klasse SB1–SB4: m² Sichtfläche\n• Aussparungen / Durchbrüche: Stck. wenn größer als Standard\n• Fertigteile, Halbfertigteile (Filigrandecke): m² oder Stck.\n• Bohrkern-Entnahme zur Festigkeitsprüfung: Stck.\n\nAufmaß:\n• Volumen aus Konstruktionsmaßen — Außenkanten\n• Bei Decken: Stärke × Fläche (Außenmaß)\n• Bewehrung nach kg pro Bauteil aus Bewehrungsplan; Verschnitt 5–10 % je nach Komplexität\n• Schalungsfläche nach Sicht-Schalfläche (nur wo Schalung tatsächlich angesetzt wird)\n\nÜbermessen / Abzüge:\n• Aussparungen ≤ 0,1 m² werden ÜBERMESSEN (m³)\n• Aussparungen ≤ 1,0 m² werden bei Schalung ÜBERMESSEN (m² Schalung)\n• Bauteile aus anderen Stoffen ≤ 0,5 m³ werden ÜBERMESSEN\n• Bewehrung wird nach kg verlegt — Schalungsanker, Abstandshalter sind Nebenleistung\n• Größere Aussparungen werden mit ihrem Volumen / ihrer Fläche abgezogen\n\nNebenleistungen (im EP enthalten):\n• Schalung in Standardklasse (SB1, glatte Sichtbetonfläche bis 2 m²-Vorgabe)\n• Bewehrungsschneiden, -biegen, -verlegen, Abstandshalter\n• Schalungsanker, Schalungsöl\n• Verdichtung mit Innen-/Außenrüttler\n• Standard-Nachbehandlung 3 Tage Feuchthalten oder Folienabdeckung\n• Bohrkern-Entnahme zur Prüfung in Standardumfang (1 Probe je 100 m³)\n• Standard-Aussparungen ≤ 0,1 m²\n\nBesondere Leistungen:\n• Sichtbeton SB2/SB3/SB4 — Aufpreis je m² Sichtfläche\n• Schalungs-Sonderausführungen (Verzug, Bogenwand, Sonderhaftung Schalöl)\n• Filigrandecken / Halbfertigteile als eigenes Bauelement (m² oder Stck.)\n• Aussparungen > 0,1 m² (Stck.-Position oder m³)\n• Stahlfaser-Beton Aufpreis je m³\n• Hochfester Beton C50/60 und höher Aufpreis\n• Wärme-Management Massenbeton (Kühlung Hochsommer, Heizung Winter)\n• Lange Nachbehandlung > 7 Tage\n• Eignungsprüfungen, Erstprüfung, Konformitätsnachweis über Standard hinaus\n• Anschluss-Verbindung an Altbeton (Aufrauen, Anker setzen, Verbundprimer)\n\nWICHTIG: Schalung ist im Standard-LV im Beton-EP enthalten. Wenn separat ausgeschrieben (z. B. bei Sichtbeton, schwierigen Geometrien), muss klar getrennt sein. Doppel-Vergütung ist häufiger Streit!",
  },
  {
    slug: "din-18332",
    ref: "DIN 18332",
    title: "Naturwerksteinarbeiten",
    summary:
      "Steinarbeiten aus Naturstein — Bodenbeläge, Fassaden, Treppen, Fensterbänke. Magmatite, Sedimentite, Metamorphite. Trocken- und Mörtelverlegung.",
    orderIdx: 26,
    content:
      "Paraphrase: Naturstein im Hoch-/Innenausbau. Materialarten Granit, Kalkstein, Marmor, Schiefer. Lagerung, Versetzen, Verfugen mit Spezialmörteln. Sicherung gegen Verfärbungen durch Wasser. Besondere Leistungen: hochwertige Politur, hinterlüftete Vorhangfassaden, Sondersteine.",
  },
  {
    slug: "din-18333",
    ref: "DIN 18333",
    title: "Betonwerksteinarbeiten",
    summary:
      "Werkstein-Bauteile aus Beton (Treppen, Fassadenplatten, Bordsteine). Vergleichbar Naturstein, aber industriell aus Zement, Zuschlag, Pigment.",
    orderIdx: 27,
    content:
      "Paraphrase: Werkstein-Bauteile aus Beton mit definierter Optik. Einbau, Verfugung, Befestigung wie Natursteinarbeiten. Besondere Leistungen: Sonderfarben, hochwertige Oberflächen (geschliffen, geflammt, sandgestrahlt).",
  },
  {
    slug: "din-18334",
    ref: "DIN 18334",
    title: "Zimmer- und Holzbauarbeiten",
    summary:
      "Tragender Holzbau — Dachstühle, Holzrahmenbau, Holzbalkendecken, Brettstapelbau, Massivholzplatten. Festigkeitsklassen nach DIN EN 14081 / DIN 4074.",
    orderIdx: 28,
    content:
      "Paraphrase:\n\nGeltung: Tragender Holzbau und Zimmererarbeiten.\n\nStoffe: Vollholz, Brettschichtholz (BSH), Brettsperrholz (BSP/CLT), Konstruktionsvollholz (KVH). Festigkeitsklassen C24, GL24h, GL28c, GL32. Holzschutz nach DIN 68800.\n\nAusführung: Verbindungen — Stahlblech, Schraubverbindungen, Zapfen, Versatz. Toleranzen nach DIN 18203-3. Brandschutz (REI 30/60/90 — Bemessung Abbrandrate).\n\nNebenleistungen: einfache Verschnitte, Befestigung mit Standardschrauben/Nägeln.\n\nBesondere Leistungen: Sichtholz (höherwertige Verarbeitung), Spezial-Verbindungen, Stahlschuhe, Brandschutzbekleidung.\n\n---\n\n**Abrechnung im Detail (DIN 18334)**\n\nEinheit:\n• Massivholz, BSH-Träger, KVH: m³ (Querschnittsfläche × Länge)\n• Brettsperrholz BSP/CLT: m² mit Stärkeangabe\n• Dachsparren, Pfetten als laufendes Bauteil: m\n• Wandflächen Holzrahmenbau: m² mit Aufbau-Bezeichnung\n• Holzverbindungen, Stahlschuhe, Stahlbleche: Stck.\n• Holzschutzmittel-Behandlung Imprägnierung: m³ oder m²\n• Abbund, Vorfertigung: m³ Holz + m² Wand-Element bei Vorfertigung\n\nAufmaß:\n• Holz-Volumen nach tatsächlicher Querschnittsfläche und Längenmaß\n• Verschnitt bis zu 10 % als Nebenleistung im EP enthalten\n• Bei BSH: Sondergrößen (Krümmung, hohe Querschnitte) als Aufpreis\n• Sparren-Länge ist die volle Bauteillänge, ohne Anschnitt-Abzug\n\nÜbermessen / Abzüge:\n• Aussparungen ≤ 0,1 m³ werden ÜBERMESSEN (Holzvolumen)\n• Bei Wandflächen Holzrahmenbau: Öffnungen ≤ 2,5 m² ÜBERMESSEN\n• Stahlteile, Schrauben werden nicht in Holzvolumen einbezogen\n• Holz-Abzug bei größeren Durchbrüchen mit Voll-Maß\n\nNebenleistungen:\n• Standard-Verschnitt bis 10 %\n• Befestigung mit Schrauben, Nägeln in Standard-Anzahl\n• Standard-Holzschutz nach DIN 68800 GK1 (überdeckt, kein Erdkontakt)\n• Standard-Toleranzen DIN 18203-3\n• Standard-Befestigung an Mauerwerk/Beton mit Dübeln\n\nBesondere Leistungen:\n• Sichtholz (höherwertige Verarbeitung) — Aufpreis je m² oder m³\n• Spezialverbindungen (Sichtkonsole, schmiedeeiserne Versätze, Stahlschuhe als Stck.)\n• Brandschutz-Bekleidung F30/F60/F90 (m² je Bauteil)\n• Holzschutzklasse GK2/GK3 (chemische Schutzmittel)\n• Vorgefertigte Wandelemente Holzrahmenbau (m²)\n• BSH/CLT in Sondergeometrie (gekrümmt, sehr hohe Querschnitte)\n• Schutz gegen Witterung während Baufortschritt (Plane, Folie)\n• Statiknachweis für Sonderbauteile\n• Diffusions-/Luftdichtheitsmessung (Blower-Door-Test)\n\nWICHTIG: Bei Holzrahmenbau ist die Frage „pro m² Wand“ vs. „pro m³ Holz“ oft strittig — LV muss eindeutig sein.",
  },
  {
    slug: "din-18335",
    ref: "DIN 18335",
    title: "Stahlbauarbeiten",
    summary:
      "Stahlkonstruktionen — Tragwerk, Treppen, Geländer, Fassaden­unterkonstruktionen. Schweißnachweise EXC1–EXC4 nach DIN EN 1090.",
    orderIdx: 29,
    content:
      "Paraphrase: Tragender Stahlbau. Stahlsorten S235, S275, S355, S460. Werkseigene Produktionskontrolle nach DIN EN 1090 (CE-Kennzeichnung). Ausführungsklassen EXC1 (einfache Bauteile) bis EXC4 (Spezialbauten). Korrosionsschutz nach DIN EN ISO 12944. Besondere Leistungen: Feuerverzinkung, Spezial-Beschichtung, Sichtschweißnähte, Statiknachweis Sonderkonstruktion.\n\n---\n\n**Abrechnung im Detail (DIN 18335)**\n\nEinheit:\n• Stahlbau-Konstruktion: t (Tonnage)\n• Träger, Stützen einzeln: Stck. mit Profilangabe\n• Stahltreppen, Stahltüren: Stck.\n• Korrosionsschutz, Beschichtung: m² Oberfläche\n• Feuerverzinkung: t (in der Regel im Zink-EP enthalten)\n• Brandschutzbeschichtung dämmschichtbildend: m² mit Schutzdauer (R30/R60/R90)\n\nAufmaß:\n• Stahlmasse nach Theorie aus statischer Berechnung (kg pro Profil-Längenmeter aus Tabelle)\n• Verbindungselemente (Schrauben, Schweißnaht-Material) bis 5 % als Nebenleistung enthalten\n• Bei Sondergliederung: Werks-Wiegescheine zur Tonnen-Bestätigung\n\nÜbermessen / Abzüge:\n• Bohrungen, Aussparungen werden NICHT abgezogen (Stahl bleibt Stahl)\n• Schraub-/Schweißverbindungen sind im Stahl-EP enthalten\n• Bei Sonderträgern (geschweißte I-Träger): zusätzliche Position für Schweißnaht\n\nNebenleistungen:\n• Werkstattfertigung, Vor-Montage\n• Standard-Korrosionsschutz nach Spezifikation EXC2\n• Schraubverbindungen Standard 10.9, 8.8\n• Standard-Schweißnähte EN ISO 5817 Bewertungsgruppe C\n• Transport zur Baustelle\n• Standard-Montage mit Mobilkran bis 30 t\n• Erststandsicherung beim Setzen\n\nBesondere Leistungen:\n• Korrosionsschutz höherwertig (C3/C4 Außenbereich, C5 Industrie)\n• Feuerverzinkung — Aufpreis je t\n• Sichtschweißnähte mit Bewertungsgruppe B\n• Brandschutz-Bekleidung (Beschichtung dämmschichtbildend, Bekleidung GKF, Mineralfaser)\n• Sonderhebezeug (Großkran > 100 t, Schwerlast-Hebebühne)\n• Statiknachweis Sonderbauteil\n• EXC3-/EXC4-Ausführung über Standard hinaus\n• Schweißeignungsprüfung im Werk (Stck. Probe)\n• Zerstörungsfreie Prüfung Schweißnaht (Ultraschall, Röntgen) als eigene Position\n• Sondertransport mit Genehmigung",
  },
  {
    slug: "din-18336",
    ref: "DIN 18336",
    title: "Abdichtungsarbeiten",
    summary:
      "Bauwerks­abdichtung gegen Boden­feuchte und drückendes Wasser nach DIN 18533. Bahnenabdichtungen, Flüssigkunststoffe, mineralische Dichtungsschlämmen.",
    orderIdx: 30,
    content:
      "Paraphrase:\n\nGeltung: Abdichtung erdberührter Bauteile gegen Wasser.\n\nStoffe: Bitumenbahnen, Polymerbitumenbahnen, KMB (kunststoffmodifizierte Bitumendickbeschichtung), Flüssigkunststoffe (FLK), mineralische Dichtungsschlämme.\n\nAusführung: Klassen W1.1-E (Bodenfeuchte) bis W3-E (drückendes Wasser bis 3 m Eintauchtiefe) nach DIN 18533. Untergrundvorbereitung, Voranstrich, Lagenaufbau, Aufkantungen, Detailausbildung an Durchdringungen.\n\nNebenleistungen: einfache Anschlüsse an Sockel.\n\nBesondere Leistungen: Sondergummi-/Aluminiumband-Abschluss, Schutzbahnen, FLK an Detailpunkten, Anschluss an WU-Beton („weiße Wanne“).\n\nWICHTIG: Abdichtungsarbeiten sind eines der häufigsten Streitthemen bei Mängelhaftung — Übergänge zu anderen Gewerken sorgfältig schützen.\n\n---\n\n**Abrechnung im Detail (DIN 18336)**\n\nEinheit:\n• Abdichtungsfläche: m² mit Lageaufbau-Bezeichnung\n• Voranstrich, Grundierung: m² (im Standard-EP der Abdichtung enthalten oder eigene Position)\n• Aufkantungen, Sockelanschluss: m laufend\n• Durchdringungen (Rohre, Anker): Stck.\n• Schutzbahn / Schutzlage: m²\n• Drainmatte, Noppenbahn: m²\n\nAufmaß:\n• m² entlang Außenkante der abgedichteten Fläche\n• Aufkantungen werden in laufenden Metern + Hochzug-Höhe in cm ausgeschrieben\n• Bei mehrlagigem Aufbau: pro Lage als eigene Position oder im m²-EP zusammengefasst\n\nÜbermessen / Abzüge:\n• Aussparungen, Durchdringungen ≤ 0,5 m² werden ÜBERMESSEN\n• Abdichtung wird durchgehend gemessen, auch wenn Durchdringung darin liegt\n• Größere Bauteile (Stützen, Schächte) > 0,5 m² werden mit Aufstandsfläche abgezogen\n• Aufkantung wird zusätzlich zur Bodenfläche abgerechnet (m + m²)\n\nNebenleistungen:\n• Untergrundvorbereitung Standard (Reinigung, Reparatur kleiner Stellen)\n• Voranstrich / Grundierung in Standard-Aufbringung\n• Standard-Anschluss an Boden, Wand, Aufkantung\n• Schutz vor Beschädigung durch nachfolgende Gewerke (Folie, Plane)\n• Standardprüfung Dichtheit per Sichtkontrolle\n\nBesondere Leistungen:\n• Hohlkehle, Kehlrahmen aus Mörtel: m laufend\n• Dauer-Klebeflansch, Sondergummi-/Aluminium-Band-Abschluss\n• Schutzschicht aus Estrich oder Plattenbelag (eigene Position)\n• Drainmatte, Noppenbahn (m²)\n• Druckwasser-Dichtprüfung mit Wasserstand 24 h\n• FLK an Detailpunkten als Stck.\n• Anschluss an WU-Beton mit Fugenband, Kompressionsband\n• Sondergrundierung bei feuchten oder ungeeigneten Untergründen\n• Schutzkappen, Mauerkappen aus Mörtel\n\nWICHTIG: Detailausbildung an Durchdringungen ist häufiger Schadensherd — sorgfältig dokumentieren mit Fotos!",
  },
  {
    slug: "din-18338",
    ref: "DIN 18338",
    title: "Dachdeckungs- und Dachabdichtungsarbeiten",
    summary:
      "Geneigte Dächer (Steildach) und Flachdächer. Eindeckung Dachziegel, Dachsteine, Schiefer, Metall. Flachdach mit Bahnen oder Flüssigkunststoff.",
    orderIdx: 31,
    content:
      "Paraphrase:\n\nGeltung: Steildach (Fachregeln des Dachdeckerhandwerks) und Flachdach (DIN 18531).\n\nStoffe: Tondachziegel, Betondachsteine, Schiefer, Faserzementplatten, Metalldächer (Zink, Kupfer, Aluminium). Flachdachbahnen Bitumen oder Kunststoff (PVC, EPDM, FPO).\n\nAusführung: Steildach — Lattung, Konterlattung, Unterspannbahn, Eindeckung mit Verfalzung; Mindestdachneigung je Eindeckart. Flachdach — Wärmedämmung (Hartschaum, Mineralwolle), Dampfsperre, Abdichtung in 1- oder 2-Lagen, Auflastkies oder befahrbare Plattenbeläge.\n\nNebenleistungen: einfache Anschlüsse, Standardabschluss-Profile.\n\nBesondere Leistungen: Dachfenster (Velux, Roto), Solar-Anlagen-Befestigung, Begrünung (extensiv/intensiv), Sonderbahnen für Bauten mit Dauerwasser.\n\n---\n\n**Abrechnung im Detail (DIN 18338)**\n\nEinheit:\n• Steildach-Eindeckung: m² in der DACHFLÄCHE (geneigt gemessen, nicht Grundfläche!)\n• Flachdach-Aufbau (alle Lagen zusammen): m² Aufbaufläche\n• Lattung, Konterlattung: im m²-EP enthalten oder m laufend\n• Unterspannbahn: m²\n• First-, Grat-, Ortgang-Ausbildung: m laufend\n• Kehlbleche: m laufend\n• Dachfenster: Stck. (oder m² je Fenster)\n• Wärmedämmung Flachdach: m² je Schichtdicke\n• Aufkantungen, Anschlüsse an Wände: m laufend mit Höhenangabe\n• Auflastkies, Plattenbelag: m² oder m³\n\nAufmaß:\n• Steildach: tatsächliche Schrägflächen-Abmessung (NICHT Grundriss)\n• Berechnung: Grundfläche × 1/cos(α) — bei 45° Dach also 1,41 × Grundfläche\n• Flachdach: m² entlang Außenkante Aufkantung\n• First, Grat, Ortgang: in laufenden Metern entlang der Kante\n\nÜbermessen / Abzüge:\n• Öffnungen ≤ 0,5 m² werden ÜBERMESSEN (Eindeckung läuft drüber, Anschluss als Detail)\n• Bei Steildach: Schornsteine, Dachfenster ≤ 0,5 m² ÜBERMESSEN\n• Größere Öffnungen (Dachterrasse, Atrium) werden mit voller Fläche abgezogen\n• Eindeckung um Aussparung wird wegen Mehraufwand teilweise im Stck. (Detailpunkt-Position) abgerechnet\n\nNebenleistungen:\n• Standard-Lattung, Konterlattung\n• Unterspannbahn / Unterdeckbahn in Standardausführung\n• Standard-Eindeckung mit Verfalzung\n• Standard-Befestigung (Sturmsicherung in Anzahl je Eindeckart)\n• First-Lüfter, Standard-Lüftungselemente in geringem Umfang\n• Reinigung der Dachfläche nach Fertigstellung\n• Standard-Dachrinne und Fallrohr-Anschluss (sonst Klempner DIN 18339)\n\nBesondere Leistungen:\n• Dachfenster, Lichtkuppel, Lichtband — Stck. mit Detailpunkt-Aufpreis\n• Befestigungspunkte für Solar/PV-Anlagen — Stck. (Anker, Halter)\n• Dachbegrünung (extensiv/intensiv) — m² mit Aufbau\n• Schneefangsysteme, Sturmklammern Sonderausführung\n• Sicherheitseinrichtungen für Dachzugang (Anschlagpunkte EN 795 Klasse A/B/C)\n• Sonderbahnen für Bauten mit Dauerwasser (Schwimmbäder, Dachterrassen mit Bepflanzung)\n• Wärmedämmung in Sonderdicke oder Sondermaterial (PIR, Vakuum)\n• Brandschutzdach (harte Bedachung mit Nachweis)\n• Dichtigkeitsprüfung Flachdach (Wasserstand, Hochfrequenz, Tracergas)\n• Aufmaß-Korrektur bei Bestandsdach mit unbekannter Grundlage\n\nWICHTIG: Bei Steildach Schräg-Aufmaß ≠ Grundriss! Abrechnungsstreit häufig — m² geneigt ist immer GRÖßER als m² im Grundriss.",
  },
  {
    slug: "din-18339",
    ref: "DIN 18339",
    title: "Klempnerarbeiten",
    summary:
      "Bauklempnerei — Dachanschlüsse, Dachrinnen, Fallrohre, Verblechungen, Gauben. Werkstoffe Titanzink, Kupfer, Aluminium, Edelstahl.",
    orderIdx: 32,
    content:
      "Paraphrase: Bauklempnerei für Dach- und Fassaden-Detailpunkte. Falztechnik, Lötverbindung, Kantungen. Mindestneigung Rinnen, Fallrohrabstand. Korrosionsverträglichkeit Materialpaarungen (z. B. kein Kupferwasser auf Zink). Besondere Leistungen: Sonderformen, Reparatur Bestand.\n\n---\n\n**Abrechnung im Detail (DIN 18339)**\n\nEinheit:\n• Dachrinne (Halbrund, Kasten, Saumrinne): m mit Profil und Material\n• Fallrohr: m mit Durchmesser-Angabe (DN 80, DN 100, DN 120)\n• Verblechungen, Dachanschlüsse, Wandanschlussbleche: m\n• Bekleidung Brüstungen, Mauerabdeckungen: m mit Auskragung\n• Sonderformteile (Endböden, Trichter, Rinnenkesseln, Bögen): Stck.\n• Verblechung Gauben, Schornsteine: m² oder Stck.\n\nAufmaß:\n• Rinnenlänge entlang der Traufkante; Trichter-/Endbögen als Stck. zusätzlich\n• Fallrohr ab Trichter bis Anschluss Sockel/Standrohr; Bögen und Übergänge als Stck.\n• Verblechung in laufenden Metern entlang Anschlusskante\n\nÜbermessen / Abzüge:\n• Bögen, Stöße werden NICHT von der Rinnenlänge abgezogen\n• Trichter, Standrohr, Wasserspeier werden als zusätzliche Stck.-Position abgerechnet\n• Reinigungsöffnungen, Reduzierungen Stck.-Position\n\nNebenleistungen:\n• Standard-Befestigungselemente (Rinnenhalter, Fallrohrschellen)\n• Standard-Anschluss an Bestand\n• Falztechnik in Standard-Ausführung\n• Lötverbindungen in Standard-Anzahl\n\nBesondere Leistungen:\n• Sonderformen (Wasserspeier, Schmuckbögen, historische Profile)\n• Beheizte Rinnen (Heizband mit eigener Position)\n• Edelstahl statt Standardmaterial (Aufpreis je m)\n• Kasten- oder Saumrinnen mit Sonderquerschnitt\n• Sondergerüst über Standardgerüst hinaus\n• Reparatur Bestand mit Aufnahme alter Profile\n• Verbleibende Schutzfolie und Verschnittentsorgung",
  },
  {
    slug: "din-18340",
    ref: "DIN 18340",
    title: "Trockenbauarbeiten",
    summary:
      "Nichttragende Wände und Decken aus Gipskarton- oder Gipsfaserplatten. Metallständer-Konstruktionen, Vorsatzschalen, abgehängte Decken.",
    orderIdx: 33,
    content:
      "Paraphrase:\n\nGeltung: Trockenbau in Innenräumen.\n\nStoffe: Gipskartonplatten (GKB, GKF feuerschutz, GKBI feuchteschutz, GKFI), Gipsfaserplatten, Metallständer CW/UW. Mineralwolle als Schalldämmung.\n\nAusführung: Beplankung 1- oder 2-lagig, Stoßfugen versetzt, Verspachtelung Q1 (gefüllt) bis Q4 (Glättung für Lackierung). Brand- und Schallschutzkennwerte je Wandsystem (REI 30/60/90, Rw 40–60 dB).\n\nNebenleistungen: einfache Aussparungen für Steckdosen, Standard-Eckschutz.\n\nBesondere Leistungen: Q3/Q4-Spachtelung, Bleirohrabschirmung, Sonderdämmung.\n\n---\n\n**Abrechnung im Detail (DIN 18340)**\n\nEinheit:\n• Wandfläche, Vorsatzschale: m² mit Aufbau-Bezeichnung (z. B. „CW 75/2 × 12,5 GKB“)\n• Abgehängte Decke: m² mit Abhang-Höhe\n• Schachtwand, Installationsschacht: m²\n• Türzarge in TB-Wand: Stck.\n• Aussparung für Türen, Klappen: Stck.\n• Q3/Q4-Spachtelung: m² Aufpreis zur Standard-Q2\n• Eck- und Anschlussschutz: m laufend wenn separat ausgeschrieben\n\nAufmaß:\n• m² nach Außenkanten, gemessen ohne Plattenstärke\n• Wandhöhe von OK Boden bis UK Decke\n• Stützen, Pfeiler, Vorsprünge in m² mit eigenständiger Position\n• Bei Schräggeometrie wird die Schrägfläche tatsächlich gemessen\n\nÜbermessen / Abzüge:\n• Öffnungen ≤ 2,5 m² werden ÜBERMESSEN (gleicher Aufwand für Sturzanschluss)\n• Aussparungen, Steckdosen, Schalter ≤ 0,1 m² ÜBERMESSEN\n• Größere Öffnungen (Türen mit Sturzbereich, Glaselemente) werden voll abgezogen\n• Türzargen, Klappen werden als Stck. zusätzlich abgerechnet\n\nNebenleistungen:\n• Metallständer-Konstruktion in Standardausführung\n• Standard-Beplankung 1- oder 2-lagig (je nach LV)\n• Standard-Verspachtelung Q2 (Stoß- und Schraubenfüllung)\n• Mineralwolle in Standard-Schichtdicke (im Wandsystem)\n• Standard-Aussparungen für Steckdosen, Schalter (≤ 0,1 m² pro Stk.)\n• Eckschutzschienen Standard\n• Reinigung der Wand-Oberfläche\n\nBesondere Leistungen:\n• Q3-Spachtelung (Aufpreis je m² Sichtfläche)\n• Q4-Spachtelung (Aufpreis je m² für Streiflicht-Lack)\n• Bleirohr-Abschirmung (Strahlenschutz, Röntgenraum)\n• Sonderdämmung (Phenolharz, Vakuum)\n• Brandschutz F90/F120 mit Sonderaufbau\n• Schallschutzwand Rw ≥ 60 dB Sonderaufbau\n• Vorsatzschale mit größerem Hohlraum-Schwerefilling (Sand, Mineralwolle hoher Dichte)\n• Sonderdurchbrüche (Glasbausteine, Vitrinen)\n• Spannungsspitzen-Brandschutzbahn an Trennflächen\n\nWICHTIG: Q-Stufen sind häufig Streitthema. Q1 = grob gefüllt (Industrie), Q2 = Standard für Tapete/normale Lackierung, Q3 = höherwertig, Q4 = höchste Glätte für Streiflicht/Hochglanz. NUR vergütungsfähig, wenn im LV angefordert.",
  },
  {
    slug: "din-18345",
    ref: "DIN 18345",
    title: "Wärmedämm-Verbundsysteme",
    summary:
      "WDVS — Außendämmung mit EPS, Mineralwolle, Phenolharzschaum + Putz/Anstrich. Brandschutz-Anforderungen (Brandschutz-Riegel bei EPS).",
    orderIdx: 34,
    content:
      "Paraphrase:\n\nGeltung: Außendämmung an Massiv- oder Holzständerwänden mit Putzbeschichtung.\n\nStoffe: Dämmplatten EPS (Polystyrol), Mineralwolle (MW), PUR/PIR, Phenolharz. Klebemörtel, Dübel, Armierungsmörtel mit Glasfasergewebe, Oberputz mineralisch oder organisch.\n\nAusführung: Dämmplatte verkleben + dübeln, Eckwinkel, Sockelprofile, Armierungslage, Grundputz, Oberputz. Bei EPS: Brandschutzriegel aus MW alle 2 Geschosse oder kontinuierlich (gem. MBO + Landesvorschriften).\n\nNebenleistungen: einfacher Sockel-Abschluss.\n\nBesondere Leistungen: hinterlüftete Konstruktion, mineralische Schwerputze, Dekorprofile, Brandschutzriegel über Standard hinaus.\n\n---\n\n**Abrechnung im Detail (DIN 18345)**\n\nEinheit:\n• WDVS-Gesamtsystem komplett: m² mit Aufbau (z. B. „WDVS EPS 16 cm WLG 035 mit Mineralputz“)\n• Sockelbereich gesondert (Perimeter): m² oder m laufend\n• Anschlussprofile (Eckschutz, Tropfkante, Sockelprofil): m laufend\n• Brandschutzriegel: m laufend pro Geschoss\n• Fensterleibung, Fenstereinfassung: m laufend\n• Dübeln: Stck. wenn separat\n\nAufmaß:\n• m² nach Außenkante WDVS\n• Sockelhöhe und Wandhöhe getrennt ausgeschrieben\n• Fensterleibung in laufenden Metern entlang der Öffnungskante (innen umlaufend)\n\nÜbermessen / Abzüge:\n• Öffnungen ≤ 2,5 m² werden ÜBERMESSEN (Aufwand Anschluss bleibt)\n• Größere Öffnungen werden voll abgezogen, dann Fensterleibung als laufender Meter zusätzlich\n• Aussparungen ≤ 0,1 m² (Klingelschilder, Lüftungsgitter) ÜBERMESSEN\n\nNebenleistungen:\n• Standard-Klebemörtel, -Dübel, -Armierungsmörtel, -Gewebe, -Oberputz\n• Standard-Eckschutzwinkel, Standard-Sockelprofil\n• Reinigung Untergrund, Standard-Untergrundvorbereitung\n• Standard-Anschlüsse an Bestand mit Anschlussprofil\n• Standard-Befestigung (Dübelplan nach Hersteller-Vorgabe)\n\nBesondere Leistungen:\n• Brandschutzriegel über Standard hinaus (zusätzliche Riegel)\n• Mineralische Schwerputze (höhere Schichtdicke, höheres Gewicht)\n• Dekorprofile (Faschen, Gesimse, Sohlbänke)\n• Sondersockel mit Edelstahl- oder Aluminium-Sockelprofil\n• Hinterlüftete Konstruktion (= eigentlich DIN 18351, nicht DIN 18345)\n• WDVS-Aufpreis bei Spezialdämmstoffen (PIR, Phenolharz, Vakuum)\n• Eignungsprüfung Untergrund (Putzfestigkeit, Saugfähigkeit)\n• Schutz von Bestand (Plane, Folie über Standard hinaus)\n• Tiefe Fensterleibung > 30 cm\n• Sondergerüst über Standardgerüst hinaus\n\nWICHTIG: Sockel-Anschluss und Anschlüsse an Fenster/Türen sind die Detailpunkte mit höchstem Schadensrisiko. Im LV separat ausschreiben + dokumentieren.",
  },
  {
    slug: "din-18349",
    ref: "DIN 18349",
    title: "Betonerhaltungsarbeiten",
    summary:
      "Sanierung Betonkonstruktionen — Reprofilierung, Korrosionsschutz Bewehrung, Rissinjektion. Verfahren nach Instandsetzungs-Richtlinie DAfStb.",
    orderIdx: 35,
    content:
      "Paraphrase: Sanierung schadhafter Beton-Bauteile. Diagnose Karbonatisierungstiefe, Chloridbelastung, Bewehrungskorrosion. Maßnahmen: Untergrundvorbereitung (HD-Wasserstrahl), Korrosionsschutz, Reprofilierung mit PCC-Mörtel, Schutzbeschichtung. Besondere Leistungen: Kathodischer Korrosionsschutz, Realkalisierung, Spezialmörtel für Wasserbau.",
  },
  {
    slug: "din-18350",
    ref: "DIN 18350",
    title: "Putz- und Stuckarbeiten",
    summary:
      "Innen- und Außenputz aus Kalk-, Kalkzement-, Gips-, Lehm- oder Kunstharzputz. Putzqualitäten Q1–Q4 für Spachtelarbeiten.",
    orderIdx: 36,
    content:
      "Paraphrase:\n\nGeltung: Putz an Wänden und Decken.\n\nStoffe: Mörtelgruppen P I (Kalk), P II (Kalk-Zement), P III (Zement), P IV (Gips), P V (Anhydrit), Kunstharzputz. Putzdicken Innen 10–15 mm, Außen 15–20 mm.\n\nAusführung: Untergrundvorbereitung, Vorspritz, Grundputz, Oberputz. Putzqualität: Q1 (gefüllt, sichtbar), Q2 (Standard, glatt für Tapete), Q3 (höherwertig), Q4 (höchste Glätte für streiflichtempfindliche Lackierung).\n\nNebenleistungen: Standard-Eckprofile, Aussparungen für Steckdosen.\n\nBesondere Leistungen: Q3/Q4-Spachtel, Stuckprofile, Lehm- oder Kalkputz mit historischer Optik, Akustikputz.\n\n---\n\n**Abrechnung im Detail (DIN 18350)**\n\nEinheit:\n• Putzfläche: m² mit Mörtelgruppe (z. B. „Innenputz P IV 10 mm Q2“)\n• Außen- und Innenputz getrennt\n• Q3/Q4-Aufpreis: m²\n• Eckprofile, Putzanschluss-Profile: m laufend (oder im Putz-EP)\n• Stuckprofile, Faschen: m laufend\n• Sondergrundierungen: m²\n• Putzträger / Putzgewebe: m²\n\nAufmaß:\n• m² nach Außenkante des fertigen Putzes\n• Wandhöhe von OK Boden bis UK Decke\n• Bei abgeschrägten Wänden: tatsächliche Schrägfläche\n• Pfeiler, Vorsprünge in m² zur Wand zugerechnet\n\nÜbermessen / Abzüge:\n• Öffnungen ≤ 2,5 m² werden ÜBERMESSEN (Sturzanschluss-Aufwand)\n• Aussparungen ≤ 0,1 m² (Steckdosen, Schalter) ÜBERMESSEN\n• Fensterleibungen werden als zusätzliche Position in m laufend abgerechnet (innen umlaufend × Tiefe)\n• Größere Öffnungen werden voll abgezogen, Leibung dann separat\n\nNebenleistungen:\n• Standard-Untergrundvorbereitung (Reinigung, Saugfähigkeit prüfen)\n• Vorspritz (Standard-Anwendung)\n• Standard-Schutz benachbarter Bauteile (Folie)\n• Standard-Eckprofile in Wand-Innenecken\n• Reinigung der fertigen Oberfläche\n• Standard-Q2-Glättung (Filzen / Glätten)\n\nBesondere Leistungen:\n• Q3-Spachtelung (Aufpreis je m²)\n• Q4-Spachtelung für Hochglanz-Lackierung\n• Stuckprofile, Faschen, Sohlbänke (m laufend mit Profil)\n• Lehm-, Kalk-, Schilfrohrputz historische Optik\n• Akustikputz (m² mit Schalldämmwert-Nachweis)\n• Putzgewebe einbetten (im EPS-Anschluss, Putzträger über große Flächen)\n• Sondergrundierung bei nicht saugendem Untergrund\n• Brandschutzputz F30/F60/F90\n• Strahlenschutzputz mit Bleizusatz\n• Sondergerüst über Standard hinaus (Hochräume, Treppenhäuser)\n\nWICHTIG: Q-Stufen wie bei Trockenbau — Q2 ist Standard, höher nur bei expliziter LV-Vorgabe.",
  },
  {
    slug: "din-18351",
    ref: "DIN 18351",
    title: "Vorgehängte hinterlüftete Fassaden",
    summary:
      "VHF mit Unterkonstruktion (Aluminium, Holz, Stahl) und Bekleidung aus Faserzement, Metall, Holz, Keramik. Hinterlüftungsspalt 20 mm, Wärmedämmung dahinter.",
    orderIdx: 37,
    content:
      "Paraphrase: Vorgehängte hinterlüftete Fassade — wärmebrücken­arme Außenwand mit zweischaligem Aufbau. Unterkonstruktion (UK) aus Aluminium, Stahl, Holz; Bekleidung sehr divers (Faserzement, HPL, Trespa, Keramik, Metallkassetten, Schiefer, Holz). Vorteile: hohe Lebensdauer, gute Bauphysik, leichte Erneuerung Bekleidung. Besondere Leistungen: Sonderformate, Befestigungstechnik mit verdeckter Schraubung.\n\n---\n\n**Abrechnung im Detail (DIN 18351)**\n\nEinheit:\n• Vorgehängte hinterlüftete Fassade komplett: m² mit Aufbau-Bezeichnung\n• Unterkonstruktion (UK) gesondert ausgeschrieben: m²\n• Wärmedämmung gesondert: m² mit Dämmstärke\n• Bekleidung gesondert: m²\n• Sonderformate, Eckpaneele, Zuschnitte: Stck.\n• Anschlüsse, Sockelblech, Attika: m laufend\n• Befestigungstechnik (verdeckt vs. sichtbar): Aufpreis m²\n\nAufmaß:\n• m² nach Außenkante VHF\n• Schrägflächen tatsächlich gemessen\n• Fensterleibungen als laufende Meter mit Sondereinkleidung als Stck.\n\nÜbermessen / Abzüge:\n• Öffnungen ≤ 2,5 m² werden ÜBERMESSEN\n• Größere Öffnungen voll abgezogen, Leibung als laufender Meter\n• Aussparungen für Lüftungsgitter ≤ 0,1 m² ÜBERMESSEN\n\nNebenleistungen:\n• Standard-Unterkonstruktion (Aluminium-Trag-/Halteprofile)\n• Standard-Wärmedämmung im Hohlraum (Mineralwolle 035–040)\n• Standard-Bekleidung mit Standard-Format und Standardbefestigung\n• Standardabschluss-Profile\n• Diffusionsoffenes Vlies (Unterspannbahn)\n\nBesondere Leistungen:\n• Sonderformate, Großformate, Schräg-Zuschnitte\n• Bekleidung mit Sondermaterial (Naturschiefer, Edelstahl, Bronze)\n• Verdeckte Befestigungstechnik (eingehängt, geklebt, mit Hinterschnitt-Anker)\n• Sondereckpaneele Stck.\n• Brandschutz-Sonderaufbau (Brandschutzriegel zwischen Geschossen)\n• Statiknachweis für Sonderkonstruktion\n• Sondergerüst Höhe oder beengter Standort\n• Wartungs-Klappen, Revisions-Öffnungen\n• Hinterlüftungsspalt-Sondergrößen > Standard 20 mm",
  },
  {
    slug: "din-18352",
    ref: "DIN 18352",
    title: "Fliesen- und Plattenarbeiten",
    summary:
      "Keramische Fliesen, Naturstein- und Betonwerkstein-Platten als Boden- und Wandbelag. Verlegung im Dünn-, Mittel- oder Dickbettverfahren.",
    orderIdx: 38,
    content:
      "Paraphrase: Fliesenarbeiten an Wand und Boden. Stoffe: keramische Fliesen (Steingut, Steinzeug, Feinsteinzeug), Mosaik. Klebstoffe nach DIN EN 12004 (C1, C2 mit Verformbarkeit S1/S2), Fugenmörtel CG nach DIN EN 13888. Untergrundprüfung Pflicht (Feuchte, Restalkalität, Festigkeit). Im Nassbereich Verbundabdichtung als Pflicht. Besondere Leistungen: Verbundabdichtung, Sonderformate, Großformat ≥ 60 cm Kante.\n\n---\n\n**Abrechnung im Detail (DIN 18352)**\n\nEinheit:\n• Wand- und Bodenfliesen: m² mit Format und Material\n• Sockelfliesen, Putzleisten: m laufend\n• Bewegungsfugen, Dehnungsfugen: m laufend\n• Verbundabdichtung im Nassbereich: m² zusätzlich\n• Eck- und Kantenprofile (Schienen, Quadrate): m laufend\n• Sonderformate, Mosaik: m² Aufpreis oder eigene Position\n• Anschluss-Silikonfuge: m laufend (im Standard-EP enthalten)\n\nAufmaß:\n• m² ohne Abzug der Fugen (Fugen sind im Bedarfsfall mitgemessen)\n• Wandhöhe und -fläche bis fertige Fugen-Außenkante\n• Schräganschnitte werden voll gemessen\n• Eckprofile als laufender Meter zusätzlich zur Fläche\n\nÜbermessen / Abzüge:\n• Aussparungen ≤ 0,1 m² werden ÜBERMESSEN\n• Bei Wand: Öffnungen ≤ 2,5 m² ÜBERMESSEN\n• Bei Boden: Bodenabläufe, Heizkörperaussparungen ≤ 0,5 m² ÜBERMESSEN\n• Größere Aussparungen (Türöffnungen Wand, Duschwannen Boden) werden voll abgezogen\n• Standard-Sockelhöhe (z. B. 8 cm) ist im Bodenfliesen-EP NICHT enthalten — eigene Position als m\n\nNebenleistungen:\n• Standard-Klebstoff (C1 oder C2 nach LV)\n• Standard-Fugenmörtel\n• Untergrundprüfung (CM-Messung beim Estrich)\n• Standard-Anpassung an Steckdosen, Heizkörperhalter\n• Eckschneiden, Anpassen Standardformate\n• Reinigung und Endschutz\n• Standard-Silikon-Anschlussfuge an Wand-Boden\n\nBesondere Leistungen:\n• Verbundabdichtung im Nassbereich (m² zusätzlich)\n• Sonderformate ≥ 60 cm Kante (Aufpreis je m²)\n• Mosaik-Verlegung (Aufpreis)\n• Diagonal-Verlegung (Aufpreis ca. 10–15 %)\n• Bordüren, Mosaik-Schmuckbänder als Stck. oder m\n• Bewegungsfugen / Dehnungsfugen (m mit Profil)\n• Profile aus Edelstahl, Aluminium, Messing\n• Ausbruch und Ersatz von Einzelfliesen im Bestand\n• Schräge Zuschnitte um Bodenabläufe (Ablauf in Sondergeometrie)\n• Vorbereitung Untergrund über Standard hinaus (Spachtelmasse, Grundierung)\n• Schutzschicht für Sondernutzung (Bauchemie-Schutz)\n\nWICHTIG: Verbundabdichtung im Nassbereich ist KEINE Nebenleistung — eigene Position! Streit häufig.",
  },
  {
    slug: "din-18353",
    ref: "DIN 18353",
    title: "Estricharbeiten",
    summary:
      "Zement-, Calciumsulfat-, Gussasphalt- oder Magnesia-Estrich. Schwimmend, im Verbund oder auf Trennschicht. Heizestrich für Fußbodenheizung.",
    orderIdx: 39,
    content:
      "Paraphrase:\n\nGeltung: Estriche im Innenbereich.\n\nStoffe: Zementestrich CT (universell), Calciumsulfat-Fließestrich CAF (innen, trocken), Gussasphalt AS, Magnesia ME, Kunstharzestrich SR.\n\nAusführung: Verbund-, Trenn-, Dämm- oder Heizestrich. Mindestdicken nach DIN 18560 (z. B. CT-F4 schwimmend ≥ 45 mm). Belegreife: CT 28 Tage, CAF nach Restfeuchte CM-Messung ≤ 0,5 % (beheizt) bzw. ≤ 1,0 % (unbeheizt).\n\nNebenleistungen: einfacher Bewegungsschnitt-Plan.\n\nBesondere Leistungen: Bewegungsfugen-Sondertyp, Industrieestrich mit Hartstoff-Einstreuung, geschliffener Sichtestrich, Schnellestrich.\n\nWICHTIG: Streitthema „Belegreife“ — AN ist verpflichtet, CM-Messung durchzuführen und Ergebnis dem Folgegewerk schriftlich mitzuteilen.\n\n---\n\n**Abrechnung im Detail (DIN 18353)**\n\nEinheit:\n• Estrich: m² mit Estrich-Bezeichnung und Schichtdicke (z. B. „CT-F4 schwimmend 50 mm“)\n• Trennlage / Dämmlage: m² (im Estrich-EP enthalten oder separat)\n• Randdämmstreifen: m laufend\n• Bewegungsfugen: m laufend\n• Heizestrich-Aufpreis: m²\n• Aufkantungen, Sockel: m laufend\n• Hartstoff-Einstreuung (Industrieestrich): m² Aufpreis\n• CM-Messung: Stck. Prüfung\n\nAufmaß:\n• m² entlang Außenkante des fertigen Estrichs\n• Wandanschluss bis Innenkante Wand (ohne Putzdicke)\n• Bei verschiedenen Schichtdicken: getrennte Positionen\n\nÜbermessen / Abzüge:\n• Aussparungen ≤ 0,1 m² werden ÜBERMESSEN (Bodenabläufe, Heizungsverteiler)\n• Bauteile aus anderen Stoffen ≤ 0,1 m² ÜBERMESSEN\n• Größere Aussparungen werden voll abgezogen\n• Sockel an Wand werden NICHT vom Boden abgezogen — Sockel ist eigene Position\n\nNebenleistungen:\n• Standard-Untergrundvorbereitung (Reinigung, einfache Spachtelung)\n• Standard-Trennlage (PE-Folie) bei Trennestrich\n• Standard-Dämmlage bei schwimmendem Estrich (Mineralwolle, EPS — wenn im EP enthalten)\n• Randdämmstreifen Standard\n• Standard-Bewegungsschnitt-Plan (alle 4–6 m, an Türübergängen)\n• Reinigung der fertigen Oberfläche\n• CM-Messung in Standardumfang (1 Probe je 200 m² oder je Abschnitt)\n\nBesondere Leistungen:\n• Heizestrich-Aufpreis (nicht im Standard-EP)\n• Bewegungsfugen mit Sonderprofil (Schiene, Edelstahl)\n• Industrie-Estrich mit Hartstoff-Einstreuung (Korund, Quarz)\n• Geschliffener Sicht-Estrich (Aufpreis je m² mit Schliff-Stufe)\n• Imprägnierung, Versiegelung, Beschichtung\n• Schnellestrich (Belegreife in 1–7 Tagen statt 28)\n• Sonderdicken über Standard (≥ 80 mm)\n• Sonder-Untergrundvorbereitung (Schleifen, Strahlen, Grundierung Tiefgrund)\n• Aufmess-/Höhennivellement über Standard\n• Geforderte Sondertoleranz < 2 mm/4 m (Standard ist 4 mm/4 m)\n\nWICHTIG: Belegreife und CM-Messung — AN haftet bei nicht erfolgter Messung mit. Beweissicherung Pflicht!",
  },
  {
    slug: "din-18354",
    ref: "DIN 18354",
    title: "Asphaltbelagsarbeiten",
    summary:
      "Asphaltestrich und Industrieasphaltbeläge im Innenbereich. Selten — vor allem in Industriehallen mit hohen Belastungen.",
    orderIdx: 40,
    content:
      "Paraphrase: Asphaltbeläge im Hochbau (Industrieboden, Schulhof-Innenbereich). Hohe Belastbarkeit, weiche Oberfläche. Einbau heiß. Besondere Leistungen: rutschhemmende Einstreuung, säurefeste Sondersorten.",
  },
  {
    slug: "din-18355",
    ref: "DIN 18355",
    title: "Tischlerarbeiten",
    summary:
      "Innentüren, Türzargen, Möbel, Wandverkleidungen aus Holz, Holzwerkstoffen oder Kombinationen. Korpus, Beschlag, Oberflächenbehandlung.",
    orderIdx: 41,
    content:
      "Paraphrase:\n\nGeltung: Tischlerarbeiten im Innenausbau.\n\nStoffe: Vollholz, Furnier, Spanplatten, MDF, Massivholzplatten. Beschläge nach DIN 18101 (Türen), DIN EN 1670 (Korrosionsklasse).\n\nAusführung: Maßgenauigkeit ≤ 1,5 mm, Oberflächen geölt, gewachst, lackiert. Türzargen-Einbau mit Justierung Falz / Anschlag.\n\nNebenleistungen: Standardbeschläge.\n\nBesondere Leistungen: Brandschutz-Türen (T30/T60/T90), Schallschutztüren, Dichtschwellen, Aufzugstüren.\n\n---\n\n**Abrechnung im Detail (DIN 18355)**\n\nEinheit:\n• Innentüren komplett (Türblatt + Zarge + Beschlag): Stck.\n• Türblätter ohne Zarge: Stck.\n• Türzargen: Stck. mit Wandstärke und Falzart\n• Wandverkleidungen, Paneele: m² mit Aufbau\n• Einbaumöbel, Schränke: Stck. oder m laufend mit Höhe\n• Holzfenster, -fensterbänke: Stck.\n• Glasleisten, Profilleisten: m laufend\n• Sonderbeschläge (Schloss, Drücker): Stck. (oder im Tür-EP enthalten)\n\nAufmaß:\n• Türen je Stück mit Maß (Falzmaß, lichtes Durchgangsmaß)\n• Wandverkleidung in m² nach Außenkante\n• Einbaumöbel Front-m² oder als Korpus-Stück\n\nÜbermessen / Abzüge:\n• Bei Wandverkleidung Aussparungen ≤ 0,1 m² ÜBERMESSEN\n• Türen werden Stck. abgerechnet — Mauerwerksaussparung wird vom Maurer-EP abgezogen\n\nNebenleistungen:\n• Standard-Beschläge (Bänder, Schloss, Drücker, Schließzylinder normaler Bauart)\n• Zarge in Standard-Wandstärke\n• Standard-Justierung der Zarge\n• Standard-Anschlag Falz oder stumpf\n• Reinigung und Endschutz\n• Standardlackierung wenn im EP zugesagt\n\nBesondere Leistungen:\n• Brandschutztür T30/T60/T90 (Stck. mit Brandschutz-Aufpreis)\n• Schallschutztür Rw ≥ 32, ≥ 37, ≥ 42 dB\n• Dichtschwelle (absenkbare Bodendichtung) als Aufpreis\n• Aufzugstüren\n• Sonderbeschläge (Panik, Brandschutz, elektromechanische Verriegelung)\n• Türen mit Verglasung (Aufpreis je m² Glasfläche)\n• Holzart-Aufpreis (Eiche, Nuss, exotische Furniere)\n• Sonder-Oberfläche (Hochglanz, Strukturlack)\n• Maßanfertigung Sondermaße",
  },
  {
    slug: "din-18357",
    ref: "DIN 18357",
    title: "Beschlagarbeiten",
    summary:
      "Tür- und Fenster-Beschläge — Drücker, Schlösser, Schließzylinder, Bänder. Schließsysteme.",
    orderIdx: 42,
    content:
      "Paraphrase: Montage von Beschlägen — Schlösser, Bänder, Drücker, Schließzylinder. Anforderungen DIN EN 1303 (Zylinder), DIN 18250 (Schlösser), DIN EN 1935 (Bänder). Besondere Leistungen: Zentral-Schließanlage, elektronische Schließsysteme, Panik-Beschläge.",
  },
  {
    slug: "din-18358",
    ref: "DIN 18358",
    title: "Rolladenarbeiten",
    summary:
      "Rollläden, Raffstores, Markisen mit manueller, Gurt- oder Motor-Bedienung. Gehäusearten Kasten, Vorbau, Aufsatz.",
    orderIdx: 43,
    content:
      "Paraphrase: Sonnen-/Sichtschutz an Fenstern und Türen. Aluminium- oder Kunststoff-Profile. Antrieb manuell, Gurt oder Motor (Funk, Smart Home). Besondere Leistungen: Sturmsicherung, Insektenschutz integriert.",
  },
  {
    slug: "din-18360",
    ref: "DIN 18360",
    title: "Metallbauarbeiten — Schlosserarbeiten",
    summary:
      "Geländer, Treppen, Tore, Vergitterungen aus Stahl, Edelstahl, Aluminium. Geringe Tragfunktion (Verkehrslasten Treppe / Geländer).",
    orderIdx: 44,
    content:
      "Paraphrase: Schlosserarbeiten — sekundäre Stahl-Bauteile. Geländer-Höhen ≥ 1,00 m bei Absturzhöhe ≥ 1 m. Treppen mit Geländerhöhe und Knaufabschlüssen. Korrosionsschutz Beschichtung oder Verzinkung. Besondere Leistungen: Edelstahl-Sondergeländer, Glas-Geländer mit Punkthaltern.",
  },
  {
    slug: "din-18361",
    ref: "DIN 18361",
    title: "Verglasungsarbeiten",
    summary:
      "Festverglasung Fenster, Türen, Glasdächer, Innen-Glaswände. Float-, ESG-, VSG-Glas. Wärmedämmverglasung Ug-Werte ≤ 1,1 W/m²K.",
    orderIdx: 45,
    content:
      "Paraphrase: Verglasung von Fenstern, Türen, Glasflächen. Glasarten Float, ESG (Einscheibensicherheitsglas), VSG (Verbundsicherheitsglas), Wärmeschutz-Isolierglas. Anforderungen Dichtigkeit, Stoßlasten, Absturzsicherung. Besondere Leistungen: Brandschutzglas, Schallschutzglas Rw ≥ 45 dB, Sonnenschutzglas mit g-Wert ≤ 0,3.\n\n---\n\n**Abrechnung im Detail (DIN 18361)**\n\nEinheit:\n• Verglasung: m² mit Glas-Bezeichnung (z. B. „2-fach Wärmeschutz Ug 1,0“)\n• Sondergläser: m² mit Spezifikation\n• Dichtungen, Klotzungen, Verglasungsbänder: im EP enthalten\n• Glasleisten: m\n• Punkthalter, Klemmhalter: Stck.\n• Brandschutzglas, Schallschutzglas: m² mit Aufpreis\n\nAufmaß:\n• m² nach Tatsachen-Glasmaß (sichtbare Glasfläche)\n• Bei Sonderformen (Bogen, Trapez): tatsächliche Fläche\n• Halbschnitte werden voll vergütet (Aufpreis je m²)\n\nÜbermessen / Abzüge:\n• Innenliegende Sprossen (Wiener Sprosse) sind im Standardpreis\n• Echte Sprossen (Glasteiler) werden als Stck.-Position\n• Aussparungen in Glasflächen werden als Stck. mit Bohrung abgerechnet\n\nNebenleistungen:\n• Standard-Verglasungssystem\n• Klotzung, Dichtungen, Bänder\n• Standard-Reinigung\n• Standard-Versetzen mit normalem Hebezeug\n\nBesondere Leistungen:\n• Brandschutzglas G30/F30/F60 (Aufpreis je m²)\n• Schallschutzglas Rw ≥ 45 dB\n• Sonnenschutzglas (Aufpreis nach g-Wert)\n• ESG, VSG, Brandschutzglas in Sondergrößen\n• Punkthalter, Klemmhalter (Stck.)\n• Versetzen mit Spezialhebezeug oder Hebebühne\n• Bohrungen, Aussparungen im Glas (Stck.)\n• Bedrucktes oder geätztes Glas",
  },
  {
    slug: "din-18363",
    ref: "DIN 18363",
    title: "Maler- und Lackierarbeiten — Beschichtungen",
    summary:
      "Anstriche und Beschichtungen Wand, Decke, Holz, Metall. Dispersionsfarben, Silikatfarben, Lasuren, Lacke. Ausführungsklassen.",
    orderIdx: 46,
    content:
      "Paraphrase:\n\nGeltung: Beschichtungen im Innen-/Außenbereich.\n\nStoffe: Dispersionsfarbe (acrylat, latex), Silikat (mineralisch), Silikon-Harz, Kalkfarbe; für Holz Lasur oder deckender Lack; für Metall Korrosionsschutz mit Grund + Decklack.\n\nAusführung: Untergrundvorbereitung (Reinigung, Spachtelung, Grundierung). Anzahl Anstriche je nach Deckkraft (Standard 1 Grund + 2 Deckanstriche).\n\nNebenleistungen: Standard-Untergrundvorbereitung, Abdeckarbeiten.\n\nBesondere Leistungen: Spezialfarben (Antibakteriell, fotokatalytisch), historische Techniken (Lasur, Schablone), Schimmelsanierung.\n\n---\n\n**Abrechnung im Detail (DIN 18363)**\n\nEinheit:\n• Anstrich Wand/Decke: m² mit Farbtyp und Anzahl Anstriche (z. B. „Dispersion 2 ×“)\n• Holz-Anstrich: m² oder m laufend (Geländer, Türzargen)\n• Lackierung Metall: m² oder Stck.\n• Sondergrundierung: m²\n• Sonderbeschichtung (Schutzlack, antibakteriell): m² Aufpreis\n• Spachtelung Q3/Q4 zur Anstrich-Vorbereitung: m²\n\nAufmaß:\n• m² nach Außenkante der gestrichenen Fläche\n• Bei abgehängten Decken: nur die sichtbare Fläche\n• Heizkörper werden Stck.-Position mit Größenangabe\n\nÜbermessen / Abzüge:\n• Öffnungen ≤ 2,5 m² werden ÜBERMESSEN (Aufwand für Anschlüsse, Türumrandung)\n• Aussparungen ≤ 0,1 m² (Steckdosen, Schalter) ÜBERMESSEN — Anstrich läuft über Steckdosen-Rahmen hinweg\n• Sockel < 30 cm Höhe wird im Wand-Anstrich mitgerechnet\n• Größere Öffnungen werden voll abgezogen, Leibungen als laufende Meter zusätzlich\n\nNebenleistungen:\n• Standard-Untergrundvorbereitung (Reinigung, einfache Ausbesserung Risse)\n• Standard-Abdeckung benachbarter Bauteile (Folie, Klebeband)\n• Standardgrundierung\n• 2 Decklagen Standard-Dispersionsfarbe\n• Reinigung und Endschutz\n• Standard-Eckschutz, einfache Ausbesserung Stoßstellen\n\nBesondere Leistungen:\n• Sondergrundierung bei Problem-Untergründen (Nikotin-Sperrgrund, Tiefgrund)\n• Mehr als 2 Anstriche / Sonderdeckkraft\n• Spezialfarben (antibakteriell, fotokatalytisch, magnetisch, Tafellack)\n• Historische Techniken (Lasur, Schablone, Wischtechnik, Marmorierung)\n• Q3/Q4-Spachtelung zur Anstrichvorbereitung\n• Schimmelsanierung mit Anti-Schimmel-Anstrich\n• Korrosionsschutz Stahl (Grund + Decklack als eigene Position)\n• Lackierung Holzfenster außen (Aufpreis Wetterschutz, Reinigung Vorbereitung)\n• Sondergerüst über Standardgerüst hinaus\n• Lasieren statt Decklackierung Holz (Aufpreis durch mehr Lagen + Schleifgang)\n\nWICHTIG: Anstrich-Anzahl ist häufiger Streit — LV muss klar benennen, ob 1 Grundierung + 1 Deckanstrich oder 1 Grundierung + 2 Deckanstriche („alte“ Faustregel deckend = 2 Decklagen).",
  },
  {
    slug: "din-18364",
    ref: "DIN 18364",
    title: "Korrosionsschutzarbeiten an Stahl- und Aluminiumbauten",
    summary:
      "Korrosionsschutz nach DIN EN ISO 12944 — Schutzdauer L/M/H/VH und Korrosivitätskategorien C1–C5/CX. Beschichtungssysteme mit Grund-, Zwischen-, Decklack.",
    orderIdx: 47,
    content:
      "Paraphrase: Korrosionsschutz Stahlkonstruktionen. Vorbereitung Strahlentrostung Sa 2½ (DIN EN ISO 8501-1). Beschichtungssystem: Grund (Zinkstaub), Zwischen, Deck. Schichtdickenmessung. Besondere Leistungen: Feuerverzinkung, Duplex-Beschichtung, Sondersysteme im Hafen-/Offshore-Bereich.",
  },
  {
    slug: "din-18365",
    ref: "DIN 18365",
    title: "Bodenbelagarbeiten",
    summary:
      "Textile Beläge, elastische Beläge (PVC, Linoleum, Kautschuk), Laminat, Parkett. Vorbereitung Estrich CM-Messung, Spachtelung, Grundierung.",
    orderIdx: 48,
    content:
      "Paraphrase:\n\nGeltung: Bodenbelagarbeiten Innen.\n\nStoffe: textile Beläge (Teppich, Nadelfilz), elastische Beläge (PVC, CV-Belag, Linoleum, Kautschuk, Korkment), Laminat, Parkett (geölt/lackiert/versiegelt).\n\nAusführung: Untergrundprüfung (CM-Messung, Festigkeit, Glätte). Spachtelung mit Kunststoff-Spachtelmasse, Grundierung, Vollkleben oder Verlegen schwimmend.\n\nNebenleistungen: einfache Sockelleisten.\n\nBesondere Leistungen: Hohlkehlen-Sockel, Sondernähte (Schweißen Linoleum), Stäbchen-Parkett mit Mustern.\n\n---\n\n**Abrechnung im Detail (DIN 18365)**\n\nEinheit:\n• Bodenbelag: m² mit Belag-Bezeichnung\n• Sockelleisten Standard: m laufend\n• Hohlkehl-Sockel: m laufend mit Höhe\n• Spachtelung Untergrund: m² mit Spachteldicke\n• Grundierung: m²\n• Sondernähte (Schweißen, Sägeschnitt): m laufend\n• Übergangsprofile (Tür, Materialwechsel): m oder Stck.\n• Treppenstufen: Stck. mit Belag-Aufbau\n\nAufmaß:\n• m² nach Außenkante Belag\n• Bis Wandkante (ohne Sockelhöhe)\n• Türöffnungen werden bis zur Türöffnung (Mitte) gemessen\n\nÜbermessen / Abzüge:\n• Aussparungen ≤ 0,1 m² werden ÜBERMESSEN (Säulen, Heizkörperaussparungen)\n• Größere Aussparungen werden voll abgezogen\n• Sockelhöhe ist NICHT im m²-Boden enthalten — Sockel als eigene Position m laufend\n\nNebenleistungen:\n• Standard-Untergrundprüfung (CM, Festigkeit, Glätte)\n• Standard-Spachtelung in geringer Dicke (≤ 2 mm)\n• Standard-Grundierung\n• Verlegen mit Standard-Klebstoff oder schwimmend\n• Standard-Anpassung an Türen, Heizkörper, Säulen\n• Standard-Sockelleiste\n• Reinigung und Endschutz\n\nBesondere Leistungen:\n• Hohlkehlen-Sockel (Aufkantung der Bahn nach oben, m laufend)\n• Sondernähte (Linoleum-Schweißung, Heißverschweißen PVC) als m laufend\n• Stäbchen-Parkett mit Mustern (Aufpreis je m²)\n• Sondertoleranzen Untergrund (Schleifen, Spachtelung > 2 mm)\n• Sonderbeläge (statisch leitfähig, Kautschuk industriell)\n• Treppenbeläge mit Antrittskante (Stck. mit Profil)\n• Treppen-Hohlkehle\n• Imprägnieren, Wachsen Parkett (Aufpreis)\n• Sonderverlegung (Diagonalverband, Fischgrät)\n• Aufmess- und Verschnittpläne über Standard hinaus",
  },
  {
    slug: "din-18366",
    ref: "DIN 18366",
    title: "Tapezierarbeiten",
    summary:
      "Tapezieren mit Papier-, Vlies-, Vinyl-, Glasfaser- oder Textiltapeten. Untergrundvorbereitung, Spachteln, Grundieren.",
    orderIdx: 49,
    content:
      "Paraphrase: Tapezierarbeiten an Innenwänden und Decken. Untergrund Q2-Putz, Glättung mit Renoviervlies bei rauem Untergrund. Kleisterarten (Methylcellulose, Dispersionskleber). Tapetenarten Raufaser, Vliestapete, Vinyl, Strukturtapete. Besondere Leistungen: Designtapeten Großmotiv, Glasfaservlies als Putzgrund.\n\n---\n\n**Abrechnung im Detail (DIN 18366)**\n\nEinheit:\n• Tapeziertes Wand-/Deckenstück: m² mit Tapeten-Typ (z. B. „Raufaser tapezieren“)\n• Renoviervlies vorbereitend: m² zusätzlich\n• Spachtelung der Wand vor Tapezieren: m² (eigene Position oder Maler DIN 18363)\n\nAufmaß:\n• m² nach Außenkante der tapezierten Fläche\n• Bei Rapport-Tapeten: Verschnitt im EP enthalten (üblicherweise 10–15 % je nach Rapport)\n\nÜbermessen / Abzüge:\n• Öffnungen ≤ 2,5 m² werden ÜBERMESSEN (Sturz-/Leibungsanschluss)\n• Aussparungen für Steckdosen ≤ 0,1 m² ÜBERMESSEN\n• Größere Öffnungen voll abgezogen\n\nNebenleistungen:\n• Standard-Klebstoff (Methylcellulose oder Dispersion je nach Tapete)\n• Standard-Anpassung an Steckdosen, Schalter, Heizkörper\n• Reinigung und Endschutz\n• Standard-Verschnitt bei einfacher Tapete (ohne Rapport)\n\nBesondere Leistungen:\n• Renoviervlies als eigene Position\n• Glasfaservlies als Putzgrund (höhere Festigkeit, Aufpreis)\n• Designtapete mit Großmotiv (Aufpreis durch hohen Verschnitt und Mustermatch)\n• Großrolle / Bahn-Tapete (z. B. Vlies-Designs > 1,06 m Breite)\n• Sondergrundierung\n• Tapete entfernen Bestand (m² mit Auf- oder Abkratzen)\n• Schimmel-Sanierung Untergrund\n• Fototapete / Vinyltapete in Sondermaß als Stck.",
  },
  {
    slug: "din-18367",
    ref: "DIN 18367",
    title: "Holzpflasterarbeiten",
    summary:
      "Industrieboden aus Hirnholzpflaster (Buche, Eiche). Hohe Verschleißfestigkeit, gute Stoßdämpfung. Selten, Spezialgewerk.",
    orderIdx: 50,
    content:
      "Paraphrase: Verlegung von Hirnholz-Klötzen als Industrieboden. Werkstoffe Buche/Eiche imprägniert. Verlegen in Bitumen oder Kunstharzkleber. Geeignet für Werkhallen mit hoher mechanischer Belastung.",
  },
  {
    slug: "din-18379",
    ref: "DIN 18379",
    title: "Raumlufttechnische Anlagen",
    summary:
      "Lüftungs- und Klimaanlagen — Zuluft, Abluft, Wärmerückgewinnung, Kühlung. Filter, Schalldämpfer, Brandschutzklappen. Reinheits- und Effizienz-Anforderungen.",
    orderIdx: 51,
    content:
      "Paraphrase:\n\nGeltung: RLT-Anlagen — Lüftung, Klimatisierung, Wärmerückgewinnung.\n\nStoffe: Geräte mit AHU-Kennzeichnung, Kanäle aus verzinktem Stahlblech oder Kunststoff, Filter ePM10/ePM2,5/ISO/HEPA, Brandschutzklappen K90/K30.\n\nAusführung: Druckverlustberechnung, Volumenstrommessung, hydraulischer Abgleich, Schallpegel-Berechnung.\n\nNebenleistungen: einfache Inbetriebnahme.\n\nBesondere Leistungen: Sicherheitslüftung Tiefgarage, Reinraum-Klassen ISO 5–8, Wärmerückgewinnung Kreuzstrom-/Rotor-System.\n\n---\n\n**Abrechnung im Detail (DIN 18379)**\n\nEinheit:\n• Lüftungsgerät (RLT-Zentralgerät): Stck. mit Volumenstrom-Bezeichnung\n• Kanäle aus verzinktem Stahlblech: m² oder kg (nach Hersteller-Standard)\n• Runde Lüftungsrohre: m mit DN\n• Kanaldämmung: m² mit Schichtdicke\n• Brandschutzklappen K90/K30: Stck. mit DN\n• Volumenstromregler, Schalldämpfer: Stck.\n• Filter: Stck. mit Filterklasse\n• Auslässe (Quellauslass, Drall, Lüftungsgitter): Stck.\n• Inbetriebnahme inkl. Volumenstrommessung: psch. oder Stck. je Auslass\n\nAufmaß:\n• Kanäle nach Mantelfläche m² (Stahlblech-Standard)\n• Alternativ kg-Abrechnung nach Werkstoff-Tabelle\n• Auslässe und Klappen je Stck. mit DN-Angabe\n• Inbetriebnahme als Pauschale oder Stck.-Position\n\nÜbermessen / Abzüge:\n• Bei Kanal-m²: keine Abzüge für Bögen, Reduzierungen (Standardformteile sind im EP)\n• Sonderformteile (Sammler, Aufweitungen) als Stck.\n\nNebenleistungen:\n• Standardmontage Geräte und Kanäle\n• Standard-Befestigung (Profile, Schienen)\n• Anschluss Geräte an vorhandene Versorgung (Strom, Wasser kalt/warm)\n• Standard-Inbetriebnahme inkl. Funktionstest\n• Standard-Volumenstrommessung mit Protokoll\n• Reinigung der Kanäle nach Montage\n\nBesondere Leistungen:\n• Hochleistungs-WRG (Rotor, Kreuz-Gegenstrom mit > 80 % Wirkungsgrad)\n• Reinraum-Ausstattung (HEPA-Filter, FFU-Geräte)\n• Sicherheitslüftung Tiefgarage mit CO-/NOx-Sensoren\n• Schallgedämpfte Sonderausführung\n• Brandschutzklappen mit Motorantrieb statt Schmelzlot\n• Hygiene-Dokumentation nach VDI 6022 (Mikrobiologische Beprobung)\n• TGA-Dokumentation, BIM-Modell\n• Schulung Betreiber\n• Wartungsvertrag\n• Funktionsprüfung mit Drittsachverständigem\n\nWICHTIG: Hydraulischer Abgleich + Volumenstrommessung sind Nebenleistung. Wenn nicht durchgeführt, AN haftet für Funktionsstörungen.",
  },
  {
    slug: "din-18380",
    ref: "DIN 18380",
    title: "Heizanlagen und zentrale Wassererwärmungsanlagen",
    summary:
      "Heizung mit Gas, Öl, Pellet, Wärmepumpe, Solarthermie. Verteilung Heizkreis, Pumpen, Heizflächen. Zentrale Trinkwarmwasserbereitung.",
    orderIdx: 52,
    content:
      "Paraphrase: Heizungs- und Warmwasserbereitungsanlagen. Wärmeerzeuger Brennwert (Gas/Öl), Wärmepumpe (Luft/Wasser, Sole/Wasser), Pellet, Solar. Hydraulischer Abgleich VOB/C-pflichtig nach DIN 18380. Heizflächen Heizkörper / Flächenheizung. Besondere Leistungen: hydraulischer Abgleich „Verfahren B“ mit Berechnung statt Schätzung, Inbetriebnahme-Protokoll, Wartungsvertrag.\n\n---\n\n**Abrechnung im Detail (DIN 18380)**\n\nEinheit:\n• Wärmeerzeuger (Brennwertkessel, Wärmepumpe, Pelletkessel): Stck. mit Leistung kW\n• Speicher (Pufferspeicher, Trinkwarmwasserspeicher): Stck. mit Volumen\n• Heizkörper: Stck. mit Type, Bauhöhe, Länge\n• Flächenheizung Fußboden/Wand: m² mit Aufbau und Heizkreis-Anzahl\n• Heizungsverteiler, Heizkreisverteiler: Stck. mit Heizkreis-Anzahl\n• Rohrleitungen: m mit DN\n• Rohrdämmung: m mit Dämmstärke\n• Pumpen, Mischer, Ventile: Stck.\n• Hydraulischer Abgleich: psch. oder Stck. (Bonus-Position bei Förderung BAFA/KfW)\n• Inbetriebnahme inkl. Funktionstest: psch.\n\nAufmaß:\n• Geräte und Heizkörper Stck. mit genauer Bezeichnung\n• Rohrleitungen in m laufend, getrennt nach DN\n• Flächenheizung in m² nach Außenkante des Heizfeldes\n• Verteiler, Pumpen Stck.\n\nÜbermessen / Abzüge:\n• Bei Rohrleitungen werden Bögen, Reduzierungen, T-Stücke nicht abgezogen\n• Sonderformteile (Sammler, Verteiler) als Stck. zusätzlich\n• Bei Fußbodenheizung: Aussparungen ≤ 0,5 m² ÜBERMESSEN\n\nNebenleistungen:\n• Standardmontage Geräte\n• Anschluss an bestehende Versorgung (Strom, Gas, Schornstein, Trinkwasser, Abwasser)\n• Standard-Inbetriebnahme\n• Standard-Funktionstest\n• Standard-Hydraulischer Abgleich Verfahren A (Schätzung)\n• Reinigung Anlage nach Montage\n• Standard-Anlagenkennzeichnung (Schilder, Hinweise)\n\nBesondere Leistungen:\n• Hydraulischer Abgleich Verfahren B mit Heizlast-Berechnung je Raum (BAFA-Pflicht ab 2023)\n• Smart-Home-Anbindung (KNX, Modbus, Wifi)\n• Wärmemengenzähler je Wohnung (Heizkostenverordnung-Pflicht)\n• Solarthermie als eigenes Anlagenpaket\n• Pufferspeicher mit hygienischer Trinkwasser-Frischwasserstation\n• Mischanlage / Kaskade mehrerer Wärmeerzeuger\n• Schalldämmung der Anlage über Standard hinaus\n• Brennstofflagerung (Pellets, Öl-Tanks)\n• Schornstein-Anpassung / -Sanierung\n• Wartungsvertrag (lfd. Mtl./Jhr.)\n• BAFA-/KfW-Förderdokumentation\n\nWICHTIG: Hydraulischer Abgleich Verfahren B ist seit GEG 2023 für Heizungs-Sanierungen Pflicht — eigene Position, da deutlich aufwändiger als Verfahren A.",
  },
  {
    slug: "din-18381",
    ref: "DIN 18381",
    title: "Gas-, Wasser- und Entwässerungsanlagen",
    summary:
      "Sanitär-Installation in Gebäuden — Trinkwasser, Schmutzwasser, Regenwasser, Gas. Materialien Kupfer, Edelstahl, Mehrschichtverbund, PE.",
    orderIdx: 53,
    content:
      "Paraphrase:\n\nGeltung: Sanitär-Installation Innen.\n\nStoffe: Trinkwasser-Rohre Kupfer, Edelstahl, MSV (PEX-Al-PEX), DVGW-zertifiziert. Abwasser HT- oder SML-Rohr. Gas-Hausanschluss Stahlrohr verzinkt oder PE.\n\nAusführung: Installation mit Mindest-Befestigungsabständen, Wärmedehnung, Schallschutz nach DIN 4109. Trinkwasserhygiene nach VDI 6023 / DIN 1988-200 — Stagnationsvermeidung, Spülplan.\n\nNebenleistungen: Standardarmaturen.\n\nBesondere Leistungen: Druckspülung, mikrobiologische Beprobung, Hebeanlagen, Sondergeruchverschluss.\n\nWICHTIG: Trinkwasserverordnung verpflichtet zu Legionellen-Untersuchung jährlich bei zentraler Großanlage > 400 l Speicher oder > 3 l Inhalt im Strang.\n\n---\n\n**Abrechnung im Detail (DIN 18381)**\n\nEinheit:\n• Sanitärobjekt komplett (WC, Waschtisch, Dusche, Wanne) inkl. Anschlussarmatur: Stck.\n• Armatur einzeln: Stck. mit Type\n• Trinkwasserrohr: m mit DN und Werkstoff\n• Abwasserrohr: m mit DN\n• Gasleitung: m mit DN\n• Rohrdämmung: m mit Dämmstärke (GEG-konform)\n• Schächte, Aussparungen: psch. oder Stck.\n• Druckprüfung Trinkwasser, Dichtheitsprüfung Gas: psch. (Pflichtprüfung, im EP enthalten)\n• Spülung Trinkwasser nach Inbetriebnahme: psch.\n\nAufmaß:\n• Sanitärobjekte je Stk.\n• Rohrleitungen m laufend, getrennt nach Type und DN\n• Rohrleitung im Schacht/Boden separat von freihängender Verlegung\n\nÜbermessen / Abzüge:\n• Sonderformteile (Bögen, Reduzierungen) sind im m-EP enthalten, sofern Standardausführung\n• Aussparungen, Wandschlitze ≤ 0,1 m² werden ÜBERMESSEN (Maurer-Abrechnung)\n• T-Stücke, Verteiler sind Stck.-Position\n\nNebenleistungen:\n• Standardmontage Objekte\n• Standard-Anschluss an Versorgung\n• Standard-Druckprüfung (Trinkwasser 15 bar, Gas 1 bar)\n• Spülung der Anlage\n• Inbetriebnahme inkl. Probelauf\n• Standard-Befestigungselemente\n• Reinigung der Objekte nach Montage\n\nBesondere Leistungen:\n• Druckspülung mit Druckluft-Wasser-Gemisch (über Standard-Spülung hinaus)\n• Mikrobiologische Beprobung (Legionellen-Test, eigenes Protokoll)\n• Hebeanlage für Abwasser unter Rückstauebene\n• Sondergeruchverschluss (Membran-Geruchverschluss)\n• Hochwertige Designarmaturen (Aufpreis Stck.)\n• Trinkwasser-Filterstation\n• Druckminderer / Schmutzfänger als eigene Position\n• Wandeinbauspülung statt Standardspüler\n• Behindertengerechte Sanitärausstattung (DIN 18040)\n• Wartungsvertrag\n\nWICHTIG: Trinkwasser-Spülung nach VDI 6023 / DIN 1988-200 ist Pflicht-Nebenleistung — vor Übergabe dokumentieren!",
  },
  {
    slug: "din-18382",
    ref: "DIN 18382",
    title: "Nieder- und Mittelspannungsanlagen — Elektroinstallation",
    summary:
      "Elektro-Installation Niederspannung (NS, ≤ 1000 V AC) und Mittelspannung (MS, 1–36 kV). Verteiler, Leitungen, Steckdosen, Beleuchtung.",
    orderIdx: 54,
    content:
      "Paraphrase:\n\nGeltung: Elektroinstallation Hochbau.\n\nStoffe: Kabel und Leitungen NYM, NYY, FE-180/E30/E90 (Funktionserhalt), Verteiler nach DIN EN 61439, Schutzgeräte (LS-Schalter, FI-Schalter mit IΔn 30 mA für Wohnräume).\n\nAusführung: Installation nach VDE 0100-410 (Schutz gegen Stromschlag), 0100-540 (Erdung, Potenzialausgleich), 0100-718 (Versammlungsstätten, MLAR Brandschutz). Prüfung Erstinbetriebnahme nach VDE 0100-600 mit Messprotokoll Pflicht.\n\nNebenleistungen: Standardprüfung Erstinbetriebnahme.\n\nBesondere Leistungen: Sicherheitsbeleuchtung, USV-Anlagen, KNX/EIB-Bus-System, Mittelspannungs-Schaltanlage.\n\n---\n\n**Abrechnung im Detail (DIN 18382)**\n\nEinheit:\n• Verteilerschrank, Unterverteilung: Stck. mit Konfiguration (Anzahl Reihen, Schutzgeräte)\n• Stromkreise / Endstromkreise: Stck. mit Bezeichnung\n• Schalter, Steckdosen, Taster: Stck.\n• Leuchten: Stck. mit Type und Leistung\n• Kabel und Leitungen: m laufend mit Querschnitt und Type (z. B. „NYM-J 3 × 1,5“)\n• Kabeltrassen, Kabelrinnen: m mit Breite\n• Brandschotts, Brandabschottungen: Stck.\n• Erdungsanlage: m + Stck. (Erder, Anschlüsse)\n• Inbetriebnahme inkl. VDE-0100-600-Messung: psch. mit Messprotokoll\n• Sicherheitsbeleuchtung: Stck. mit Schutzdauer\n\nAufmaß:\n• Geräte und Endstromkreise je Stk.\n• Kabel m laufend, im Verlegebereich\n• Verteiler je Stk. mit Konfiguration\n\nÜbermessen / Abzüge:\n• Aussparungen für Steckdosen, Schalter werden vom Maler/Trockenbau ÜBERMESSEN (Standard ≤ 0,1 m²)\n• Verbinder, Klemmen, Befestigung sind in m-EP enthalten\n\nNebenleistungen:\n• Standard-Verlegung (Putz, UP, Hohlraum)\n• Standard-Klemmen, -Verbinder, -Schraubendüben\n• Schaltplan-Erstellung\n• Standard-Inbetriebnahme nach VDE 0100-600 mit Messprotokoll\n• Reinigung der Schalter / Steckdosen / Verteiler\n• Standardkennzeichnung Verteiler (Schilder)\n• Standard-Brandabschottung Kabel-Durchgänge\n\nBesondere Leistungen:\n• Sicherheitsbeleuchtung (Akku-Leuchten oder Zentralbatterie)\n• USV-Anlage (Stck. mit Leistung kVA und Überbrückungsdauer)\n• KNX/EIB-Bus-System (Aufpreis je Endstromkreis)\n• DALI-Lichtsteuerung\n• Mittelspannungs-Schaltanlage (eigene Anlage)\n• Funktionserhalt FE 30/60/90 Sondertrasse\n• Smart-Meter-Anbindung\n• PV-Anlage komplett (Module + Wechselrichter + Anschluss)\n• Lade-Infrastruktur Elektromobilität (AC-Wallbox, DC-Schnellladesäule)\n• EMV-Filter\n• Blitzschutz nach DIN 18384 (eigene ATV)\n\nWICHTIG: VDE-0100-600-Erstprüfung mit Messprotokoll ist zwingend — kein Bauteilbetrieb ohne Protokoll!",
  },
  {
    slug: "din-18384",
    ref: "DIN 18384",
    title: "Blitzschutz- und Erdungsanlagen",
    summary:
      "Äußerer Blitzschutz (Fangleitung, Ableiter, Erder) und innerer Blitzschutz (Überspannungsschutz). Schutzklassen I–IV nach DIN EN 62305.",
    orderIdx: 55,
    content:
      "Paraphrase: Blitzschutz nach DIN EN 62305. Schutzklasse je nach Risikoanalyse — z. B. Wohnhaus oft Klasse III, Krankenhaus II, Sondergebäude I. Äußere Anlage Fangstange/Maschenleitung Cu/Al, Ableiter, Tiefenerder oder Fundamenterder. Überspannungsschutz Typ 1+2+3 in Verteiler. Besondere Leistungen: Fundamenterder bei Bestand nachrüsten.",
  },
  {
    slug: "din-18385",
    ref: "DIN 18385",
    title: "Förderanlagen, Aufzugsanlagen, Fahrtreppen, Fahrsteige",
    summary:
      "Aufzugs- und Förderanlagen — Personenaufzüge nach DIN EN 81-20/-50, Lastenaufzüge, Fahrtreppen DIN EN 115. CE-Kennzeichnung Maschinen-RL.",
    orderIdx: 56,
    content:
      "Paraphrase: Aufzugsanlagen + Förderanlagen. Personenaufzüge (Seil/hydraulisch) nach DIN EN 81-20/-50, Brandfall-Aufzüge nach DIN EN 81-72/-73. Lastenaufzüge. Fahrtreppen / Fahrsteige nach DIN EN 115. Konformitätsbewertung Maschinen-RL 2006/42/EG. Besondere Leistungen: barrierefreie Aufzüge, Feuerwehraufzug, Sondernutzung Krankenhaus.",
  },
  {
    slug: "din-18386",
    ref: "DIN 18386",
    title: "Gebäudeautomation",
    summary:
      "Mess-, Steuer-, Regel- und Automationstechnik nach DIN EN ISO 16484 / DIN EN 15232. BACnet/KNX/Modbus-Protokolle. Energie-Effizienzklassen A–D.",
    orderIdx: 57,
    content:
      "Paraphrase: Gebäudeautomation (GA) — automatisierte Steuerung HLK, Beleuchtung, Sonnenschutz, Sicherheit. Klassen A–D der Energieeffizienz nach DIN EN 15232 (A = hoch energieeffizient). Protokolle BACnet, KNX, Modbus, EnOcean. Besondere Leistungen: Inbetriebnahme mit Kommunikationstest, Schulung Betreiber, Anbindung Energiemanagement.",
  },
  {
    slug: "din-18421",
    ref: "DIN 18421",
    title: "Dämmarbeiten an technischen Anlagen",
    summary:
      "Wärme-, Kälte-, Schalldämmung von Rohrleitungen, Behältern, Kanälen. EnEV/GEG-Pflicht zur Dämmung warm-/kaltgehender Rohre.",
    orderIdx: 58,
    content:
      "Paraphrase: Dämmarbeiten an Heizungs-, Klima-, Kälte- und Lüftungs-Leitungen. Mindest-Dämmstärken nach GEG. Stoffe: Mineralwolle, Polyurethanschaum, Schaumglas, Kautschukschaum (für Kälteleitungen). Schutzmäntel Aluminium, Edelstahl, PVC. Besondere Leistungen: dampfdiffusions­dichte Kältedämmung, Brandschutz-Sonderaufbau.\n\n---\n\n**Abrechnung im Detail (DIN 18421)**\n\nEinheit:\n• Rohrdämmung: m mit Rohr-DN und Dämmstärke (z. B. „DN 50, 50 mm Mineralwolle“)\n• Behälterdämmung: m² oder Stck. mit Behälter-Geometrie\n• Kanaldämmung: m² mit Schichtdicke\n• Schutzmantel (Alu, Edelstahl, PVC): m oder m² zusätzlich zur Dämmstärke\n• Brandschutz-Sonderschott: Stck.\n\nAufmaß:\n• Rohrdämmung in m laufend, getrennt nach DN und Dämmstärke\n• Behälter nach Mantelfläche m²\n• Kanal-Dämmung nach Mantelfläche m²\n• Bögen, T-Stücke werden in der Standardlänge mitvergütet\n\nÜbermessen / Abzüge:\n• Sonderformteile (Bögen mit > 3 d Krümmungsradius) als Stck. zusätzlich\n• Bei Behältern: Anschlüsse, Stützen, Standfüße werden NICHT abgezogen\n• Aussparungen für Armaturen, Ventile als Stck. mit „Armaturendämmkappen“\n\nNebenleistungen:\n• Standard-Dämmung mit Standard-Stärke gemäß GEG\n• Standard-Befestigung (Bandagen, Klemmen, Klammern)\n• Standardstöße und -nähte\n• Reinigung der gedämmten Oberflächen\n• Standard-Anschluss an Bestand\n\nBesondere Leistungen:\n• Kältedämmung mit dampfdiffusionsdichter Ausführung (Aufpreis je m)\n• Brandschutz-Sonderaufbau (Brandschott-Manschetten an Wand-/Deckendurchgängen — Stck.)\n• Schutzmantel Edelstahl statt Standard-Alu\n• Sonderfarben oder Bedruckung der Mäntel\n• Beheizung durch Begleitheizband (Stck. + m Heizband)\n• Inspektionsklappen, Demontage-Möglichkeit für Servicepersonal\n• Schalldämmung mit Spezialaufbau\n• Akustische Entkopplung von Trennwänden",
  },
  {
    slug: "din-18440",
    ref: "DIN 18440",
    title: "Konservierungs- und Restaurierungsarbeiten an Putz, Stuck und Naturstein",
    summary:
      "Denkmalpflege — Konservierung und Restaurierung historischer Putzflächen, Stuck-Elemente, Natursteinfassaden. Reversibilitätsgebot.",
    orderIdx: 59,
    content:
      "Paraphrase: Restaurierungsmaßnahmen an Bestand mit denkmalwerter Substanz. Reversibilitätsgrundsatz, Originalsubstanz so weit wie möglich erhalten. Materialien historisch verträglich (Kalk-, Lehmputz, Natursteinersatz aus identischer Quelle). Besondere Leistungen: praktisch alles in der Restaurierung — Standard ist immer eingriffsminimale Sicherung.",
  },
  {
    slug: "din-18451",
    ref: "DIN 18451",
    title: "Gerüstarbeiten",
    summary:
      "Arbeits- und Schutzgerüste nach DIN EN 12810/12811. Lastklassen LK1–LK6. Aufbau- und Verwendungsanleitung des Herstellers maßgeblich.",
    orderIdx: 60,
    content:
      "Paraphrase:\n\nGeltung: Gerüstbau.\n\nStoffe: Modulgerüste (z. B. Layher Allround), Rahmengerüste, Schutzgerüste. Belastungs­klassen LK1 (≤ 0,75 kN/m²) bis LK6 (≤ 6,0 kN/m²).\n\nAusführung: Aufstellung nach BetrSichV + DGUV Information 201-011. Prüfung vor erster Inbetriebnahme + arbeitstäglich. Gerüstkennzeichnung mit Lastklasse, Aufbaudatum, Prüfer.\n\nNebenleistungen: Standardgerüst Lastklasse 3, Standzeit bis 8 Wochen.\n\nBesondere Leistungen: Sondergerüste (Hängegerüst, Konsolengerüst), Wetterschutz mit Plane, Standzeitverlängerung, Anbindung an Bestand.\n\nWICHTIG: Bauherr/AG haftet bei mangelhaftem Gerüst und Personenschaden mit — Beweissicherungsfoto bei Übergabe Pflicht.\n\n---\n\n**Abrechnung im Detail (DIN 18451)**\n\nEinheit:\n• Gerüst-Aufstellung und Standzeit: m² (Gerüstfläche × Standzeit)\n• Vorhalten je Woche: m² × Woche (häufigste Position)\n• Auf-/Abbau gesondert: m² oder psch.\n• Schutzplane / Netze: m² zusätzlich\n• Treppenturm: Stck. mit Höhe\n• Konsolengerüst, Hängegerüst: m oder Stck.\n• Anschlagpunkte für Sicherungen: Stck.\n\nAufmaß:\n• Gerüstfläche = Außenkante Bauwerk × Höhe (Gerüst-Außenkante)\n• Standzeit ab Aufbau abnahmefähig bis Abbaubeginn (in Wochen, Tagen oder Monaten)\n• Sondergerüste mit gesonderten Positionen\n\nÜbermessen / Abzüge:\n• Öffnungen ≤ 4 m² werden ÜBERMESSEN (kein Abzug für Fenster, Türen)\n• Größere Öffnungen werden mit ihrem Maß abgezogen\n• Vorsprünge, Erker werden voll mitgerechnet\n\nNebenleistungen:\n• Aufstellung und Abbau im Standardfall\n• Standard-Belegung Bohlen, Roste\n• Standard-Konsolen-Verankerung am Bauwerk (Dübel)\n• Standard-Sicherheits-Geländer und Bordbretter\n• Tägliche Sichtprüfung\n• Gerüstkennzeichnung\n• Eigene Werkzeuge\n• Standard-Eckverstärkung\n\nBesondere Leistungen:\n• Standzeitverlängerung über vereinbarten Zeitraum (m² × Woche zusätzlich)\n• Wetterschutz mit Plane oder Netz\n• Hängegerüst, Konsolengerüst (Sondergerüst, Sondermontage)\n• Treppentürme separat (Stck.)\n• Spezielle Belastungsklassen LK4–LK6\n• Statiknachweis Sondergerüst\n• Anschlagpunkte für PSA gegen Absturz (Stck.)\n• Schutzdach, Schutztunnel, Witterungsabschirmung\n• Beleuchtung Gerüst (für Nachtarbeit)\n• Gerüstsperre / Verkehrsumleitung\n• Beweissicherungsfoto bei Übergabe (kann je nach LV Pflicht oder Sonderleistung sein)",
  },
  {
    slug: "din-18459",
    ref: "DIN 18459",
    title: "Abbruch- und Rückbauarbeiten",
    summary:
      "Selektiver Rückbau gem. KrWG/Gewerbeabfall­verordnung. Schadstoffsanierung Asbest TRGS 519, KMF, PCB. Trennung am Anfall­ort.",
    orderIdx: 61,
    content:
      "Paraphrase:\n\nGeltung: Abbruch und Rückbau ganzer Bauwerke oder Bauteile.\n\nStoffe: Abfallarten nach AVV (Abfallverzeichnis-Verordnung) — getrennt zu erfassen, dokumentieren, ordnungsgemäß zu entsorgen.\n\nAusführung: Bei selektivem Rückbau: Vorab-Schadstofferkundung (Asbest, PAK, KMF, PCB, Holzschutzmittel). Pflichten nach TRGS 519 (Asbest), TRGS 521 (KMF). Statisches Konzept (Standsicherheit Reststruktur), Staubunterdrückung mit Wasser, Lärmschutz nach BImSchG / TA Lärm.\n\nNebenleistungen: Standard-Sortierung Bauschutt vor Ort.\n\nBesondere Leistungen: Asbest-Sanierung, Sprengung, Sondervermessungen, Bestandserfassung Bewehrung.\n\nWICHTIG: Sechs Hauptfraktionen sind nach GewAbfV zu trennen — mineralische Abfälle, Holz, Metall, Kunststoffe, Dämmstoffe, Glas. Verstoß führt zu Bußgeld bis 100.000 €.\n\n---\n\n**Abrechnung im Detail (DIN 18459)**\n\nEinheit:\n• Abbruch ganzes Bauwerk: m³ umbauter Raum (BRI nach DIN 277)\n• Abbruch Bauteil (Wand, Decke): m² oder m³\n• Demontage Einbauten (Türen, Fenster, Sanitärobjekte): Stck.\n• Stoffliche Sortierung Vor-Ort: m³ oder t\n• Container-Stellung und Abtransport: t je Fraktion\n• Entsorgung mit Nachweis: t mit Abfallschlüssel-Nummer (AVV)\n• Asbest-Sanierung: m² mit TRGS-519-Schutzklasse\n• Schadstoffuntersuchung: psch. oder Stck.\n\nAufmaß:\n• BRI (Brutto-Rauminhalt) nach Außenkante × Höhe nach DIN 277\n• Bauteil-Abbruch: m³ Volumen oder m² Wand-/Deckenfläche\n• Mengenermittlung Entsorgung über Wiegescheine vom Entsorger\n\nÜbermessen / Abzüge:\n• Öffnungen, Aussparungen werden NICHT abgezogen (Abbruch ist immer Gesamtmaß)\n• Bei Bauteil-Abbruch ≤ 0,1 m² ÜBERMESSEN\n• Demontage-Stück (Türen, Fenster) wird zusätzlich zur Wand-Abbruch-Position\n\nNebenleistungen:\n• Standardabbruch (mechanisch mit Bagger)\n• Standardsortierung Vor-Ort in 6 Fraktionen (GewAbfV)\n• Standard-Lärmschutz und Staubunterdrückung\n• Erstellung des Abbruchplans nach DIN 18007\n• Reinigung der Baustelle\n• Standard-Sicherung Reststruktur\n\nBesondere Leistungen:\n• Schadstofferkundung Vor-Ort (Asbest, PAK, KMF, PCB, Holzschutz) — psch. oder Stck. Gutachten\n• Asbest-Sanierung TRGS 519 (Schwarzbereich, Schleuse, persönliche Schutzausrüstung)\n• KMF-Entfernung TRGS 521\n• Selektiver Rückbau hochwertig (Türen, Fenster, Holz für Wiederverwendung)\n• Sprengung als Sondertechnik\n• Spezialvermessungen, 3D-Bestand-Erfassung\n• Sondertransport Schwergut\n• Statisches Konzept Sondersicherung\n• Sondergerüste, Sicherungs­arbeiten am Bestand\n• Außerstunden-Arbeit (Nacht, Wochenende) wegen Lärmschutz\n• Verkehrsführung, Beschilderung im öffentlichen Raum\n• Reinigung umgebender Verkehrsflächen\n\nWICHTIG: Asbest-Sanierung ist KEIN Standard — eigene LV-Position mit TRGS-519-Schutzklasse Pflicht. Nicht-Anzeige beim Gewerbeaufsichtsamt = Straftat!",
  },
];
