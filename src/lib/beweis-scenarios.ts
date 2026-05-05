export type BeweisItem = {
  id: string;
  title: string;
  detail: string;
  basis: string;
  critical: boolean;
};

export type BeweisScenario = {
  id: string;
  title: string;
  intro: string;
  items: BeweisItem[];
};

export const BEWEIS_SCENARIOS: BeweisScenario[] = [
  {
    id: "mangel",
    title: "Mangelrüge erhalten",
    intro:
      "Bevor Mängel beseitigt werden, müssen Beweise gesichert werden. BGH-Anforderungen für späteren Streitfall.",
    items: [
      { id: "M1", title: "Foto-Dokumentation IST-Zustand (mit Maßstab)", detail: "Mindestens 8 Fotos: Übersicht, Detail jedes Risses, Zollstock im Bild, Datum/Uhrzeit-Stempel.", basis: "OLG Köln 11 U 90/16", critical: true },
      { id: "M2", title: "Sachverständigen-Termin VOR Beseitigung anbieten", detail: "Schriftliche Aufforderung an AG, einen öbuv. Sachverständigen mitwirken zu lassen.", basis: "BGH VII ZR 13/16", critical: true },
      { id: "M3", title: "Bautagebuch-Auszug der Ausführungsphase", detail: "Vollständige Tagebuch-Einträge der Wochen mit der relevanten Leistung.", basis: "Bauvertrag Ziff. 8", critical: true },
      { id: "M4", title: "AG-Vorleistungen dokumentieren", detail: "Übergabe-Protokolle, Plan-Anforderungen, AG-Anweisungen sammeln.", basis: "§ 4 Abs. 3 VOB/B", critical: true },
      { id: "M5", title: "Bedenkenanmeldungs-Historie prüfen", detail: "Wurde Bedenken gegen Untergrund/Anweisung angemeldet?", basis: "§ 4 Abs. 3 VOB/B", critical: false },
      { id: "M6", title: "AG-Anweisungen aus Ausführungszeit", detail: "E-Mails, Bautagebuch, Protokolle der Ausführungsphase.", basis: "§ 4 Abs. 1 VOB/B", critical: false },
      { id: "M7", title: "Wetter-Daten (DWD)", detail: "Bei Witterungs-relevanten Mängeln: DWD-Daten archivieren.", basis: "BGH VII ZR 11/08", critical: false },
      { id: "M8", title: "Subunternehmer-Beteiligung dokumentieren", detail: "Welcher NU war zuständig? Vertrag, Aufmaß, Abnahme.", basis: "Pass-Through-Klausel", critical: false },
    ],
  },
  {
    id: "bha",
    title: "Behinderungsanzeige",
    intro:
      "Vor Versand der BHA: Bauablauf-Störung tagesgenau dokumentieren — Schadensersatz nach § 6 Abs. 6 setzt Beweisbarkeit voraus.",
    items: [
      { id: "B1", title: "Plan-Anforderungen schriftlich nachweisen", detail: "E-Mails, Protokolle der letzten 14 Tage mit Datum + Empfänger.", basis: "§ 6 Abs. 1 VOB/B", critical: true },
      { id: "B2", title: "Bauablauf-Soll vs. Ist-Vergleich", detail: "Bauzeitenplan + Ist-Aufzeichnung tagesgenau gegenüberstellen.", basis: "OLG Düsseldorf 22 U 122/18", critical: true },
      { id: "B3", title: "Lohnstunden-Aufzeichnung Stillstandszeiten", detail: "Pro Tag: anwesendes Personal + nicht-produktive Stunden.", basis: "BGH VII ZR 11/08", critical: true },
      { id: "B4", title: "Witterungs-Daten DWD", detail: "Bei witterungsbedingter Behinderung: DWD-Auszug für Standort + Zeitraum.", basis: "DWD-Klimadaten", critical: true },
      { id: "B5", title: "Foto-Dokumentation der Baustellen-Lage", detail: "Wöchentlich Übersichtsfotos mit Datum, beweissichern.", basis: "Best Practice", critical: false },
      { id: "B6", title: "Material-Liefer-Aufzeichnung", detail: "Lieferscheine, Rechnungen, Verzögerungs-Begründungen.", basis: "§ 6 Abs. 6 VOB/B", critical: false },
    ],
  },
  {
    id: "abnahme",
    title: "Förmliche Abnahme",
    intro:
      "Vor förmlicher Abnahme alle relevanten Unterlagen sichern — Beweislast kehrt sich nach Abnahme um.",
    items: [
      { id: "A1", title: "Vollständige Aufmaß-Unterlagen", detail: "Alle Aufmaß-Blätter unterschrieben (AG + AN), Plan-Stand, Datum.", basis: "Bauvertrag Ziff. 11", critical: true },
      { id: "A2", title: "Mängelvorbehalts-Liste vorbereiten", detail: "Alle Restleistungen + bekannten Mängel mit Datum + Beweis.", basis: "§ 12 VOB/B", critical: true },
      { id: "A3", title: "Vertragsstrafe-Vorbehalt explizit erklären", detail: "Sonst Verlust des Anspruchs (BGH-Rechtsprechung).", basis: "BGH VII ZR 210/01", critical: true },
      { id: "A4", title: "Foto-Dokumentation Übergabe-Zustand", detail: "Mindestens 20 Übersichts- und Detailfotos vor Übergabe.", basis: "Best Practice", critical: true },
      { id: "A5", title: "Bautagebuch-Schluss-Eintrag", detail: "Letzter Eintrag mit ausgeführten Leistungen + Restleistungen.", basis: "Bauvertrag Ziff. 8", critical: false },
      { id: "A6", title: "Datenträger / Pläne / Bedienungsanleitungen", detail: "Übergabe an AG quittieren lassen.", basis: "VOB/B § 12 Abs. 4", critical: false },
    ],
  },
  {
    id: "nachtrag",
    title: "Nachtrag durchsetzen",
    intro:
      "Vor Geltendmachung des Nachtrags: Anspruchsgrundlage + Mehrleistung beweissichern.",
    items: [
      { id: "N1", title: "Anordnungs-Schreiben des AG", detail: "E-Mail, WhatsApp, Bautagebuch-Eintrag mit klarem Anordnungs-Charakter.", basis: "§ 2 Abs. 5 VOB/B", critical: true },
      { id: "N2", title: "Mehrkosten-Ankündigung VOR Ausführung", detail: "Datum + Zugangs-Beweis (Lesebestätigung, Einschreiben).", basis: "BGH VII ZR 201/18", critical: true },
      { id: "N3", title: "Aufmaß Mehr- vs. Minderleistung", detail: "Soll-Leistung vs. tatsächlich ausgeführte Leistung tabellarisch.", basis: "VOB/B § 14", critical: true },
      { id: "N4", title: "Urkalkulation auf Anforderung verfügbar", detail: "Kalkulation der Soll-Leistung als Basis der Nachtrags-EP-Bildung.", basis: "BGH VII ZR 201/18", critical: true },
      { id: "N5", title: "Foto-Dokumentation Mehrleistung", detail: "Vorher/Nachher-Vergleich der erweiterten Leistung.", basis: "Best Practice", critical: false },
      { id: "N6", title: "Bautagebuch-Einträge geänderte Leistung", detail: "Tagesgenaue Aufzeichnung der geänderten/zusätzlichen Leistung.", basis: "Bauvertrag Ziff. 8", critical: false },
    ],
  },
];
