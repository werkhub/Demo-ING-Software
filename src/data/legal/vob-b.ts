/**
 * VOB/B · Allgemeine Vertragsbedingungen für die Ausführung von Bauleistungen
 * Quelle: DIN 1961:2019-09 (Stand 2019, mit Anpassungen)
 * Status: DIN-Norm · urheberrechtlich geschützt durch DIN Media (ehem. Beuth Verlag).
 *
 * WICHTIG: Diese Datei enthält redaktionelle Zusammenfassungen + Paraphrasen
 * für Referenz-Zwecke (Fair Use). Volltexte werden in der Pro-Lizenzversion
 * über die DIN-Media-Volumenlizenz freigeschaltet.
 */

import type { NewLegalChunk } from "@/db/schema";

export const VOB_B: Omit<NewLegalChunk, "id" | "source">[] = [
  {
    slug: "1",
    ref: "§ 1",
    title: "Art und Umfang der Leistung",
    summary:
      "Leistungsumfang ergibt sich aus Vertrag inkl. Leistungsverzeichnis, Plänen, ATV. Hierarchie bei Widersprüchen: § 1 Abs. 2 — Leistungsbeschreibung > VOB/C > VOB/B.",
    orderIdx: 1,
    content:
      "Paraphrasierte Zusammenfassung:\n\nAbs. 1: Die auszuführende Leistung wird durch den Vertrag, die Vertragsbestandteile (Leistungsbeschreibung, Pläne) sowie die ATV der VOB/C bestimmt.\n\nAbs. 2: Bei Widersprüchen zwischen den Vertragsbestandteilen gilt eine Reihenfolge — die im Vertrag konkret vereinbarten Bestimmungen haben Vorrang vor den ATV der VOB/C, diese vor den Allgemeinen Vertragsbedingungen der VOB/B.\n\nAbs. 3 + 4: Anordnungsrechte des AG bei Änderungen oder zusätzlichen Leistungen — Grundlage für Nachträge nach § 2.",
  },
  {
    slug: "2",
    ref: "§ 2",
    title: "Vergütung",
    summary:
      "Vergütungsregeln für Einheitspreis-, Pauschal- und Stundenlohnverträge. Wichtigste Absätze: Abs. 5 (geänderte Leistung) und Abs. 6 (zusätzliche Leistung) — Grundlage für Nachträge.",
    orderIdx: 2,
    content:
      "Paraphrasierte Zusammenfassung der wichtigsten Absätze:\n\nAbs. 3 — Mengenabweichung: Bei mehr als 10 % Abweichung vom vertraglich vereinbarten Mengenansatz kann jede Vertragspartei eine Anpassung des Einheitspreises verlangen.\n\nAbs. 5 — Geänderte Leistung: Wird durch Anordnung des AG eine bisher vertraglich vereinbarte Leistung geändert, ist ein neuer Preis unter Berücksichtigung der Mehr- oder Minderkosten zu vereinbaren — auf Basis der Urkalkulation.\n\nAbs. 6 — Zusätzliche Leistung: Eine Leistung, die im Vertrag nicht vorgesehen ist, hat der AN nur auf besondere Anordnung des AG auszuführen. Anspruch auf besondere Vergütung muss dem AG VOR Ausführung angekündigt werden.\n\nAbs. 7 — Pauschalsumme: Auch bei vereinbarter Pauschalvergütung Anpassung möglich, soweit ein Festhalten am Vertrag aufgrund wesentlicher Leistungsänderung unzumutbar ist.",
  },
  {
    slug: "3",
    ref: "§ 3",
    title: "Ausführungsunterlagen",
    summary:
      "Bereitstellung von Plänen, Berechnungen und Anweisungen durch den AG. Eigentum an Unterlagen.",
    orderIdx: 3,
    content:
      "Paraphrase: Der AG hat dem AN unentgeltlich die zur Ausführung notwendigen Unterlagen rechtzeitig zu übergeben. Werden Pläne nicht rechtzeitig übergeben, kann dies eine Behinderung im Sinne von § 6 darstellen. Eigentum an den AG-Unterlagen verbleibt beim AG.",
  },
  {
    slug: "4",
    ref: "§ 4",
    title: "Ausführung",
    summary:
      "Anordnungsrechte des AG, Pflicht zur Bedenkenanzeige (Abs. 3) bei problematischen Anweisungen oder Vorleistungen, Mitwirkungspflichten anderer Unternehmer.",
    orderIdx: 4,
    content:
      "Paraphrase wichtigster Absätze:\n\nAbs. 1 — Anordnungsrechte: AG kann Anordnungen zur Ausführung erteilen. Wird die Ausführung dadurch wesentlich erschwert oder verändert, gilt § 2 Abs. 5 oder 6.\n\nAbs. 3 — Bedenkenanzeige: Hat der AN Bedenken gegen die vorgesehene Art der Ausführung (auch wegen der Sicherung gegen Unfallgefahren), gegen die Güte der vom AG gelieferten Stoffe oder Bauteile oder gegen die Leistungen anderer Unternehmer, so hat er sie dem AG unverzüglich — möglichst schon vor Beginn der Ausführung — schriftlich mitzuteilen.\n\nWichtig: Versäumnis der Bedenkenanzeige führt zur Mit-Haftung für spätere Mängel, die aus der Ausführung trotz erkennbarer Probleme resultieren.",
  },
  {
    slug: "5",
    ref: "§ 5",
    title: "Ausführungsfristen",
    summary:
      "Beginn, Vertragsfristen, Verzug. Bei AN-Verzug: Schadensersatzanspruch des AG zusätzlich zu Vertragsstrafe (§ 11).",
    orderIdx: 5,
    content:
      "Paraphrase: Vertragsfristen sind verbindlich. Bei AN-Verzug haftet AN für Schaden, den der Verzug dem AG entstehen lässt. Verzug beginnt grundsätzlich mit Mahnung nach Fälligkeit, sofern nicht ein bestimmter Endtermin vereinbart ist (kalendermäßig bestimmt — dann automatisch).",
  },
  {
    slug: "6",
    ref: "§ 6",
    title: "Behinderung und Unterbrechung der Ausführung",
    summary:
      "Pflicht zur unverzüglichen Behinderungsanzeige (Abs. 1). Bauzeitverlängerung (Abs. 2). Schadensersatzanspruch des AN bei AG-Pflichtverletzung (Abs. 6). Kündigungsrecht nach 3 Monaten Stillstand (Abs. 7).",
    orderIdx: 6,
    content:
      "Paraphrase wichtigster Absätze:\n\nAbs. 1 — Behinderungsanzeige: Glaubt sich der AN in der ordnungsgemäßen Ausführung der Leistung behindert, so hat er es dem AG unverzüglich schriftlich anzuzeigen. Unterlässt er die Anzeige, hat er nur dann Anspruch auf Berücksichtigung der hindernden Umstände, wenn dem AG offenkundig die Tatsache und ihre hindernde Wirkung bekannt waren.\n\nAbs. 2 — Anerkannte Hindernisse: Behinderungstatsachen aus AG-Risikosphäre, Streik, höhere Gewalt, unabwendbares Ereignis, Witterung außerhalb des Üblichen.\n\nAbs. 4 — Bauzeitverlängerung: Die Ausführungsfristen werden um die Dauer der Behinderung verlängert.\n\nAbs. 6 — Schadensersatz: Ist die Behinderung von einem Vertragsteil zu vertreten, hat der andere Anspruch auf Ersatz des nachweislich entstandenen Schadens.\n\nAbs. 7 — Kündigung: Dauert eine Unterbrechung länger als 3 Monate, kann jeder Vertragsteil den Vertrag schriftlich kündigen.",
  },
  {
    slug: "7",
    ref: "§ 7",
    title: "Verteilung der Gefahr",
    summary:
      "Gefahr für zufälligen Untergang des Werkes vor Abnahme trägt der AN. Nach Abnahme: AG. Bei höherer Gewalt: AG trägt Risiko bereits ausgeführter Leistungen.",
    orderIdx: 7,
    content:
      "Paraphrase: Bis zur Abnahme trägt der AN die Gefahr für den zufälligen Untergang oder die zufällige Verschlechterung des Werkes. Bei Zerstörung durch höhere Gewalt, Krieg, Aufruhr oder andere objektiv unabwendbare Umstände trägt der AG die Gefahr für die bereits ausgeführten unselbständigen Leistungen.",
  },
  {
    slug: "8",
    ref: "§ 8",
    title: "Kündigung durch den Auftraggeber",
    summary:
      "Freie Kündigung (Abs. 1) mit Vergütungsanspruch des AN abzgl. ersparter Aufwendungen. Außerordentliche Kündigung aus wichtigem Grund (Abs. 2): bei AN-Insolvenz, Vertragsverletzung, Einstellung der Zahlungen.",
    orderIdx: 8,
    content:
      "Paraphrase wichtigster Absätze:\n\nAbs. 1 — Freie Kündigung: Der AG kann jederzeit den Vertrag kündigen. Dem AN steht die vereinbarte Vergütung zu, abzüglich ersparter Aufwendungen.\n\nAbs. 2 — Kündigung aus wichtigem Grund: Der AG kann auch ohne Frist kündigen, wenn der AN seine Zahlungen einstellt, von ihm bzw. zur Konkursmasse das Insolvenzverfahren beantragt ist, oder ein solches Verfahren eröffnet wird.\n\nAbs. 3 — AN-Vertragsverletzung: Bei Vertragsverletzung kann AG nach Fristsetzung mit Kündigungsandrohung den Vertrag entziehen.",
  },
  {
    slug: "9",
    ref: "§ 9",
    title: "Kündigung durch den Auftragnehmer",
    summary:
      "AN-Kündigungsrechte bei AG-Pflichtverletzung — insbesondere bei Zahlungsverzug nach Fristsetzung, fehlender Mitwirkung, Insolvenz des AG.",
    orderIdx: 9,
    content:
      "Paraphrase: Der AN kann den Vertrag kündigen, wenn der AG eine ihm obliegende Handlung unterlässt (z. B. Mitwirkung, Plan-Bereitstellung) und dadurch den AN außerstande setzt, die Leistung auszuführen. Voraussetzung: dem AG ist eine angemessene Frist zur Vertragserfüllung gesetzt worden mit der Erklärung, nach Ablauf der Frist den Vertrag zu kündigen.\n\nBei Zahlungsverzug: AN kann nach erfolgloser Fristsetzung Vertrag kündigen — vergütet werden alle erbrachten Leistungen plus entgangener Gewinn für nicht erbrachte.",
  },
  {
    slug: "10",
    ref: "§ 10",
    title: "Haftung der Vertragsparteien",
    summary:
      "Verschuldenshaftung für Schäden bei Erfüllung. Haftung für Schäden Dritter (Verkehrssicherungspflicht). Bei gemeinsamer Verantwortung Haftungsverteilung nach Verschuldensanteilen.",
    orderIdx: 10,
    content:
      "Paraphrase wichtigster Absätze:\n\nAbs. 1 — Verschuldenshaftung: Die Vertragsparteien haften einander für eigenes Verschulden sowie für das Verschulden ihrer gesetzlichen Vertreter und derjenigen Personen, die sie zur Erfüllung ihrer Verpflichtungen heranziehen (Erfüllungsgehilfen i. S. d. § 278 BGB).\n\nAbs. 2 — Schäden Dritter: Entsteht durch eine vertraglich geschuldete Leistung des AN ein Schaden bei einem Dritten, haftet grundsätzlich der AN. Verkehrssicherungspflicht auf der Baustelle liegt während der Ausführung beim AN.\n\nAbs. 3 — Gemeinsame Verantwortung: Wirken AG und AN bei der Schadensentstehung zusammen, ist der Schaden nach den Verschuldensanteilen aufzuteilen (vergleichbar § 254 BGB).\n\nAbs. 4 — Versicherung: Soweit nichts Abweichendes vereinbart ist, hat jede Vertragspartei die ihrem Risikobereich zuzuordnenden Schäden selbst zu tragen — Bauleistungs- und Haftpflichtversicherung sind in der Praxis Standard.\n\nAbs. 5 — Haftung für Hilfspersonen: Die Haftung erfasst alle Personen, deren sich der Vertragspartner zur Erfüllung der vertraglichen Pflichten bedient — auch Nachunternehmer.",
  },
  {
    slug: "11",
    ref: "§ 11",
    title: "Vertragsstrafe",
    summary:
      "Voraussetzung für wirksame Vertragsstrafe: ausdrückliche Vereinbarung. BGH-Höchstgrenzen in AGB: 0,3 % je Werktag, max. 5 % der Auftragssumme. Vorbehalt bei Abnahme erforderlich (Abs. 4).",
    orderIdx: 11,
    content:
      "Paraphrase wichtigster Absätze:\n\nAbs. 1 — Voraussetzung: Eine Vertragsstrafe muss ausdrücklich vereinbart werden und ist im Zweifel nur bei Verschulden verwirkt.\n\nAbs. 2 — Begrenzung: Tagessatz und Höchstsumme müssen verhältnismäßig sein. BGH-Rechtsprechung: bei AGB max. 0,3 % je Werktag und max. 5 % der Auftragssumme insgesamt — bei Überschreitung Klausel insgesamt unwirksam (keine geltungserhaltende Reduktion).\n\nAbs. 4 — Vorbehalt bei Abnahme: Hat der AG die Leistung abgenommen, kann er die Strafe nur dann verlangen, wenn er sie sich bei der Abnahme vorbehalten hat.",
  },
  {
    slug: "12",
    ref: "§ 12",
    title: "Abnahme",
    summary:
      "Förmliche Abnahme (Abs. 4), Teilabnahme (Abs. 2), fiktive Abnahme nach 12 Werktagen (Abs. 5). Verweigerung nur bei wesentlichen Mängeln (Abs. 3). Mit Abnahme: Beweislastumkehr, Verjährungsbeginn, Fälligkeit.",
    orderIdx: 12,
    content:
      "Paraphrase wichtigster Absätze:\n\nAbs. 3 — Verweigerung: Wegen wesentlicher Mängel kann die Abnahme bis zur Beseitigung verweigert werden. Unwesentliche Mängel berechtigen nicht zur Abnahmeverweigerung — der AG hat lediglich Anspruch auf Nachbesserung mit Mängelvorbehalt.\n\nAbs. 4 — Förmliche Abnahme: Eine förmliche Abnahme ist auf Verlangen einer Vertragspartei vorzunehmen. Beim Termin sind beide Parteien zugegen, der Zustand des Werkes wird in einem Protokoll festgestellt.\n\nAbs. 5 — Fiktive Abnahme: Verlangt der AN nach Fertigstellung schriftlich die Abnahme, gilt die Leistung 12 Werktage nach Zugang der Erklärung als abgenommen, wenn der AG keine wesentlichen Mängel rügt.\n\nAbs. 6 — Wirkungen der Abnahme: Beweislastumkehr, Verjährungsbeginn, Fälligkeit der Vergütung.",
  },
  {
    slug: "13",
    ref: "§ 13",
    title: "Mängelansprüche",
    summary:
      "Nacherfüllung (Abs. 5), Selbstvornahme (Abs. 5 S. 2), Minderung (Abs. 6), Schadensersatz (Abs. 7). Verjährung 4 Jahre VOB/B (Abs. 4) — bei Bauwerken vorrangig 5 Jahre § 634a BGB prüfen.",
    orderIdx: 13,
    content:
      "Paraphrase wichtigster Absätze:\n\nAbs. 1 — Mangelfreiheit: Der AN hat dem AG seine Leistung zur Zeit der Abnahme frei von Sachmängeln zu verschaffen.\n\nAbs. 4 — Verjährung: Die Verjährungsfrist für Mängelansprüche beträgt 4 Jahre für Bauwerke (VOB/B). ACHTUNG: Bei Bauwerks-Werkverträgen gilt vorrangig § 634a BGB mit 5 Jahren — bei Vertragsabschluss prüfen, welche Frist greift.\n\nAbs. 5 — Mangelbeseitigung: Auf schriftliche Aufforderung des AG hat der AN die Mängel innerhalb angemessener Frist zu beseitigen. Bei Fristversäumnis kann AG die Mangelbeseitigung selbst durchführen lassen (Ersatzvornahme) und Kosten beim AN einfordern.\n\nAbs. 6 — Minderung: Bei Unverhältnismäßigkeit der Mangelbeseitigung kann der AG mindern.\n\nAbs. 7 — Schadensersatz: Bei wesentlichen Mängeln, Verschulden des AN oder unzumutbarer Mangelbeseitigung.",
  },
  {
    slug: "14",
    ref: "§ 14",
    title: "Abrechnung",
    summary:
      "Aufmaß und Schlussrechnung. Prüffrist des AG: 2 Monate ab Zugang der Schlussrechnung. Nach Ablauf: Anerkenntnis bei Zahlung, Verjährung beginnt.",
    orderIdx: 14,
    content:
      "Paraphrase: Der AN hat seine Leistungen prüfbar abzurechnen. Über alle Leistungen ist eine prüffähige Schlussrechnung zu erteilen. Die Prüfung der Schlussrechnung soll spätestens innerhalb von 2 Monaten nach Zugang erfolgen.",
  },
  {
    slug: "15",
    ref: "§ 15",
    title: "Stundenlohnarbeiten",
    summary:
      "Voraussetzungen für Abrechnung im Stundenlohn: vorherige Anzeige an AG (Abs. 3), Stundenlohnzettel werktäglich. Bei Versäumnis: keine Stundenlohn-Vergütung.",
    orderIdx: 15,
    content:
      "Paraphrase: Stundenlohnarbeiten sind nur als solche zu vergüten, wenn sie als Stundenlohnarbeiten vereinbart sind. Der AN hat dem AG die Ausführung von Stundenlohnarbeiten vor Beginn anzuzeigen. Stundenlohnzettel sind dem AG werktäglich oder, wenn dies vereinbart ist, in anderen Zeitabständen, einzureichen.",
  },
  {
    slug: "16",
    ref: "§ 16",
    title: "Zahlung",
    summary:
      "Abschlagszahlungen werden monatlich oder zu vereinbarten Terminen geleistet. Schlussrechnung: Zahlung innerhalb 30 Tagen nach Zugang. Verzug: 9 % über Basiszinssatz (§ 288 Abs. 2 BGB) bei B2B.",
    orderIdx: 16,
    content:
      "Paraphrase wichtigster Absätze:\n\nAbs. 1 — Abschlagszahlungen: Auf Antrag sind dem AN in möglichst kurzen Zeitabständen Abschlagszahlungen in Höhe des Wertes der jeweils nachgewiesenen vertragsgemäßen Leistungen zu gewähren.\n\nAbs. 5 — Schlusszahlung: Die Schlusszahlung ist alsbald nach Prüfung und Feststellung der Schlussrechnung, spätestens innerhalb von 30 Tagen nach Zugang, fällig.\n\nAbs. 6 — Skonto: Erlaubt zwischen den Parteien zu vereinbaren.",
  },
  {
    slug: "17",
    ref: "§ 17",
    title: "Sicherheitsleistung",
    summary:
      "Vertragserfüllungs-Sicherheit max. 5 % (Abs. 3) · Gewährleistungssicherheit max. 5 % (Abs. 6) · Recht zur Bürgschafts-Ablöse (Abs. 8) zwingend.",
    orderIdx: 17,
    content:
      "Paraphrase wichtigster Absätze:\n\nAbs. 1 — Zweck: Sicherheitsleistung bezweckt die Erfüllung der Verpflichtungen oder die Sicherung von Mängelansprüchen.\n\nAbs. 3 — Vertragserfüllung: Die Höhe der Sicherheit für die Vertragserfüllung soll 5 % der Auftragssumme nicht überschreiten.\n\nAbs. 6 — Gewährleistung: Die Höhe der Sicherheit für Mängelansprüche darf 5 % der Auftragssumme nicht überschreiten — wirksam für 4 Jahre nach Abnahme (entsprechend Verjährung nach Abs. 4 § 13).\n\nAbs. 8 — Ablöse durch Bürgschaft: Der AN kann die Sicherheit jederzeit durch eine selbstschuldnerische Bürgschaft eines im EU-Bereich zugelassenen Kreditinstituts ablösen.",
  },
  {
    slug: "18",
    ref: "§ 18",
    title: "Streitigkeiten",
    summary:
      "Vorschaltverfahren bei Streit zwischen AG-Behörde und AN: vorhergehende Anrufung der vorgesetzten Stelle. Gerichtsstand bei Privatrechts-Streitigkeiten am Sitz des AG (B2B-bezogen).",
    orderIdx: 18,
    content:
      "Paraphrase: Bei Streit aus dem Vertrag zwischen einer Behörde als AG und dem AN ist vor Anrufung des Gerichts die vorgesetzte Stelle anzurufen. Diese hat innerhalb von 2 Monaten Stellung zu nehmen.\n\nGerichtsstand für Privatrechtsstreitigkeiten ist der Sitz des AG (B2B-typisch — bei AGB-Inhaltskontrolle nach § 38 ZPO).",
  },
];
