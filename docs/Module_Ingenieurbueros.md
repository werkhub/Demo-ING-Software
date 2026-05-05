# LexBau — Modul-Übersicht für Ingenieurbüros

> **Zielgruppe:** Interne Produktdokumentation für Vertrieb, Onboarding und Produktmanagement.
> **Stand:** 2026-05-05 · basierend auf Code-Verifikation gegen `src/lib/modules.ts` und Routen unter `src/app/`.
> **Workspace-Typ:** Diese Übersicht beschreibt ausschließlich Module, die für `workspaceRole = "ingenieurbuero"` sichtbar sind. Bauunternehmer-spezifische Module (z. B. NU-Pass-Through) sind ausgeklammert.

---

## Inhaltsverzeichnis

1. [Lesehilfe](#lesehilfe)
2. [Sidebar-Sektionen im Überblick](#sidebar-sektionen-im-überblick)
3. [Sektion 1 — Arbeit](#sektion-1--arbeit-tagesgeschäft)
4. [Sektion 2 — Quick-Actions](#sektion-2--quick-actions)
5. [Sektion 3 — Bibliothek](#sektion-3--bibliothek)
6. [Sektion 4 — Verwaltung](#sektion-4--verwaltung)
7. [HOAI-Leistungsphasen-Matrix](#hoai-leistungsphasen-matrix)
8. [Status-Gesamtübersicht](#status-gesamtübersicht)
9. [Quellen & Code-Referenzen](#quellen--code-referenzen)

---

## Lesehilfe

### Status-Legende

| Symbol | Bedeutung |
|---|---|
| ✓ **Live** | Funktion ist im Code implementiert, nutzt echte Datenbank-Persistenz und ist im Produktiv-Einsatz nutzbar. |
| ⚙ **Teilweise** | Grundstruktur und Daten-Modell vorhanden, einzelne Sub-Funktionen oder UI-Eingabeflächen fehlen noch. |
| ⏳ **Stub / In Entwicklung** | Route ist erreichbar, Inhalte sind Mock-Daten oder Heuristik-Antworten. Voll-Implementierung in der Roadmap. |

### Modul-Beschreibung — Aufbau

Pro Modul werden konsistent vier Aspekte beschrieben:

- **Zweck** — was das Modul löst (1–2 Sätze)
- **Funktionen & Features** — was im Code passiert (Bullet-Liste)
- **Relevanz für Ingenieurbüros** — Bezug zu HOAI-Leistungsphasen, BGB-/VOB/B-Pflichten, Bauüberwachung und typischen IB-Workflows
- **Technik** — Datenmodell, Server Actions, ggf. KI-Anbindung

### Workspace-Rolle „Ingenieurbüro"

In `src/db/schema/workspaces.ts` wird die Rolle als Enum `workspaceRole` mit den Werten `bauunternehmer | bauherr | ingenieurbuero` geführt. Der Recht-Assistent und mehrere Module passen ihre Perspektive automatisch an: Ein IB sieht z. B. Mängelrügen aus Planer-Sicht (HOAI-Schnittstellen, Planungsfehler-Risiko) statt aus Auftragnehmer-Sicht.

---

## Sidebar-Sektionen im Überblick

Die Navigation ist in vier Sektionen gegliedert (definiert in [src/lib/modules.ts](../src/lib/modules.ts)):

| Sektion | Zweck | Anzahl Module (für IB) |
|---|---|---|
| **Arbeit** | Tagesgeschäft mit DB-Persistenz: Vorgänge, Projekte, Bautagebuch, Fristen, Rechnungen, Stunden | 8 (inkl. Finanzen-Hub mit 4 Sub-Modulen) |
| **Quick-Actions** | Fokussierte Werkzeuge — meist aus einem Vorgang heraus aufgerufen, oft KI-gestützt | 3 (HOAI-Rechner, Analysen-Hub mit 3 Sub-Tools, Recht-Assistent) |
| **Bibliothek** | Referenzinhalte ohne Workflow-Zustand: Gesetze, Urteile, Vorlagen, Beweissicherung | 4 |
| **Verwaltung** | Workspace-Konfiguration, Compliance, Lizenzen | 3 (Workspace, HinSchG, Lizenz-Center) |

> **Hinweis:** Module mit `hideFromSidebar: true` (z. B. einzelne Finanz-Sub-Module) sind unter dem jeweiligen Hub-Eintrag erreichbar, haben aber keinen eigenen Sidebar-Link. Die Routen bleiben direkt aufrufbar.

---

## Sektion 1 — Arbeit (Tagesgeschäft)

Die Sektion bündelt alle Module, in denen das Ingenieurbüro produktiv arbeitet — von der Projektanlage über die laufende Bauüberwachung bis hin zur Rechnungsstellung.

### 1.1 Dashboard ✓ Live · `/dashboard`

**Zweck:** Zentrale Übersichtsseite mit Live-Stats aus allen Bereichen.

**Funktionen & Features**
- Asynchrone Server Component — Daten werden bei jedem Aufruf aus SQLite frisch geladen (`force-dynamic`).
- Aggregierte KPIs: offene Vorgänge nach Risk-Score, fällige Fristen (kritisch/diese Woche/offen), aktive Projekte.
- Kürzlich erfasste Anfragen aus dem Recht-Assistenten.
- Quick-Access-Tiles auf häufig genutzte Module.

**Relevanz für Ingenieurbüros**
Das Dashboard ist der morgendliche Anlaufpunkt für die Projektleitung. Es macht binnen Sekunden sichtbar, ob Mitwirkungsfristen gegenüber dem AG (BGB § 642) auslaufen, ob neue Mangelrügen oder Anordnungen offen sind und welche Honorarphasen in der laufenden Woche zu rechnen sind. Reduziert das Risiko, eine Frist zu verpassen — der häufigste Hebel für Honorar-Ausfälle.

**Technik**
- Lese-Queries: `getProjects()`, `getFristen()`, `getVorgangStats()`, `getAllQueries()`
- Workspace-isoliert (jeder User sieht nur seine Workspace-Daten)

---

### 1.2 Vorgänge ✓ Live · `/vorgaenge` · Badge: NEU

**Zweck:** Zentrales Posteingangs- und Aufgaben-Management für klärungsbedürftige Sachverhalte.

**Funktionen & Features**
- Filter-Bar: Projekt, Status (offen/in Arbeit/erledigt), Kategorie, Volltextsuche, Risk-Score.
- Tabellen-Ansicht mit Zuordnung zu Workspace-Mitgliedern.
- Vorgangs-Erstellung **automatisch** aus dem Vertrags-Scan (Server Action `createVorgangFromContract()`).
- Vorgangs-Erstellung **automatisch** bei Plausi-Verstößen aus dem Stunden-Modul (>12h/Tag).
- Risk-Score-Anzeige zur Priorisierung.

**Relevanz für Ingenieurbüros**
Vorgänge sind das Workflow-Rückgrat: Jede Klärungsanfrage des AG, jede Rüge eines ausführenden Unternehmens, jede automatisch erkannte Risiko-Klausel landet hier. Für ein IB mit mehreren parallelen Bauvorhaben ist die strukturierte Verwaltung dieser „losen Enden" der Unterschied zwischen sauberer Projektsteuerung und stillen Honorar-Verlusten. Bezug zur HOAI: betrifft alle Leistungsphasen, besonders LP 7 (Mitwirkung Vergabe), LP 8 (Objektüberwachung), LP 9 (Objektbetreuung).

**Technik**
- Tabelle `vorgaenge`: title, status, category, riskScore, createdAt, updatedAt, projectId, assigneeId
- Verknüpfung zu `projects` und `users` über workspaceId

---

### 1.3 Projekte ✓ Live · `/projekte`

**Zweck:** Stammdatenverwaltung aller Bauvorhaben mit projekt-spezifischen Compliance-Indikatoren.

**Funktionen & Features**
- Zwei Ansichten: Card-Layout (visuelle Übersicht) und Table-Layout (datendichte Liste).
- Filter und Sortierung: Status, Risk-Flag, Anzahl offener Nachträge, Sicherheiten-Status, Volltextsuche.
- **HOAI-spezifische Felder am Projekt:** `hoaiHonorarsummeNettoCents`, `hoaiParagraph` (z. B. § 35 Gebäudeplanung), `hoaiLeistungsPhase`.
- Spaltenanzeige: Subcontractor-Compliance, Projektwertentwicklung, kritische Issues.
- Server Action `createProject()` für Neuanlage.

**Relevanz für Ingenieurbüros**
Die HOAI-Verankerung pro Projekt ist der zentrale Mehrwert für IB: Honorarsumme, Honorarparagraph (§§ 34/35 Gebäude, § 47 Ingenieurbauwerke, § 51 Tragwerksplanung, § 56 Technische Ausrüstung) und aktuelle Leistungsphase werden direkt im Projekt gespeichert und sind später Grundlage für Abschlagsrechnungen, Liquiditätsplanung und HOAI-Rechner-Vorbelegungen. Ein durchgängiges HOAI-Stammdatenmodell, das in die Workflows weiterläuft.

**Technik**
- Tabelle `projects` mit erweiterten HOAI-Spalten
- Queries: `getProjectsTableRows()`, `getProjectsWithStats()`
- Verknüpfungen zu `fristen`, `vorgaenge`, `nachtraege`, `sicherheiten` über projectId

---

### 1.4 Bautagebuch ✓ Live · `/bautagebuch`

**Zweck:** Tagesweise Bauablauf-Dokumentation mit automatischer Erkennung rechtlich relevanter Trigger.

**Funktionen & Features**
- Tageseintrag mit Wetter, Temperatur, Personalstunden (eigene + NU), eingesetzte Geräte.
- Freitextfeld für Tagesgeschehen mit Projekt-Selektion.
- **Co-Pilot-Klassifikation:** automatische Erkennung von Triggern wie *Anordnung des AG*, *Behinderung*, *Bedenkenanmeldung*, *Mangelrüge*, *Zahlungsverzug*.
- Urgency-Indikator und Vorschlag der nächsten Handlung pro Eintrag.
- Listen-Ansicht mit Trigger-Labels.

**Relevanz für Ingenieurbüros**
Im Rahmen der **Objektüberwachung (HOAI § 34 LP 8)** ist die lückenlose Bautagebuchführung Pflicht — und in Streitfällen oft das einzige Beweismittel. LexBau hebt das Bautagebuch von einer reinen Dokumentationspflicht zu einem aktiven Frühwarnsystem: Ein Tagebuch-Eintrag wie *„Pläne für TGA fehlen seit 2 Wochen"* triggert automatisch den Hinweis auf eine Behinderungsanzeige nach § 6 Abs. 1 VOB/B. Für IB mit Bauüberwachungsverantwortung ist das die wichtigste Haftungsabsicherung.

**Technik**
- Tabelle `bautagebuchEntries`: text, category, entryDate, weatherCondition, temperatureCelsius, staffHoursOwn, staffHoursSubcontractors, equipment, trigger, urgency, suggestion, projectId
- Queries: `getBautagebuchEntries()`, `getBautagebuchStats()`

---

### 1.5 Fristen ✓ Live · `/fristen`

**Zweck:** Zentrale Fristen-Übersicht mit Dringlichkeitsklassifikation und Kalender-Export.

**Funktionen & Features**
- Klassifikation: kritisch (≤ 1 Tag), diese Woche, offen.
- Erfassung mit Aufgabentext, Deadline, Rechtsgrundlage (z. B. „§ 13 Abs. 5 VOB/B").
- iCal-Export für Outlook, Google Calendar, Apple Calendar.
- Server Actions: `toggleFristCompleted()`, `deleteFrist()`.
- Persistenter RDG-Banner (Hinweis: Information, keine Rechtsberatung).

**Relevanz für Ingenieurbüros**
Fristen sind in Bauprozessen scharf und reaktionspflichtig: Rüge-Antwortfrist, Mitwirkungsfrist gegenüber AG, Bedenkenanmeldungs-Frist bei erkannten Planungsfehlern, Mängelbeseitigungsfristen, Zahlungsfristen aus Honorarrechnungen (BGB § 650g Abs. 4). Eine versäumte Frist kann ein ganzes Honorar gefährden — insbesondere bei Verjährungsfristen nach § 634a BGB (5 Jahre Bauwerk). Der iCal-Export schließt die Lücke zu bestehenden Kalendersystemen, ohne Doppelpflege.

**Technik**
- Tabelle `fristen`: task, deadline, completed, daysRemaining, urgency, legalBasis, projectId
- Query: `getAllFristen()` mit Projekt-Join

---

### 1.6 Anzeigen ✓ Live · `/anzeigen` · Badge: NEU

**Zweck:** Spezialisiertes Modul für Behinderungsanzeigen und Bedenkenanmeldungen nach VOB/B mit Versand- und Zugangs-Tracking.

**Funktionen & Features**
- Zwei Anzeigentypen: Behinderungsanzeige (§ 6 VOB/B), Bedenkenanmeldung (§ 4 Abs. 3 VOB/B).
- Workflow: Entwurf → Versendet → Zugang bestätigt → ggf. Überfällig.
- Status-Badges in der Übersicht.
- Rechtshinweise direkt in der UI (z. B. Formerfordernisse).

**Relevanz für Ingenieurbüros**
Auch wenn Behinderungsanzeigen formal vom ausführenden Unternehmen kommen, ist das IB als bauüberwachender Planer derjenige, der sie **erkennt, bewertet und kommuniziert** — und der bei eigenen Planungsfehlern selbst in die Pflicht zur Bedenkenanmeldung kommt (§ 4 Abs. 3 VOB/B analog für Planungsleistungen, § 650p BGB für Architekten- und Ingenieurverträge). Das Modul stellt sicher, dass die formalen Anforderungen (Schriftform, konkreter Bezug, rechtzeitig vor Ausführung) eingehalten werden.

**Technik**
- Tabelle `anzeigen`: title, kind (behinderung|bedenken), subjectMatter, sentAt, acknowledgedAt, status, projectId
- Queries: `getAnzeigen()`, `getAnzeigenStats()`

---

### 1.7 Stunden ✓ Live · `/stunden` · Badge: NEU

**Zweck:** Wochenweise Personal-Stundenerfassung mit Lohnlauf-Lock und Plausibilitätsprüfung.

**Funktionen & Features**
- Tagesweise Eingabe pro Mitarbeiter und Gewerk.
- ISO-Wochen-Navigation (vorherige/nächste Kalenderwoche).
- **Wochen-Lock nach Lohnlauf:** Locking-Mechanismus mit Sperr-Datum, sperrendem Nutzer und Notizen — verhindert nachträgliche Manipulation.
- **Plausi-Check >12 h/Tag:** überschrittene Tage erzeugen automatisch einen Vorgang im Vorgangs-Modul.
- Aggregation pro Mitarbeiter+Tag mit Stundensatz (in Cent gespeichert).

**Relevanz für Ingenieurbüros**
Für IB mit eigenen Bauüberwachern, Tragwerksplanern oder Vermessungsteams ist die saubere Stundenerfassung doppelt relevant: einerseits als Grundlage für stundenbasierte Honorarvereinbarungen nach HOAI § 6 Abs. 3 (Zeithonorar), andererseits als Nachweis für Mehraufwand bei Auftraggeberverschulden. Die Lock-Funktion ist GoBD-relevant; die >12 h-Plausi schützt vor Falscheingaben, die in der Lohnabrechnung teuer werden können.

**Technik**
- Tabellen: `mitarbeiter` (name, gewerk, aktiv), `stunden` (datum, stunden, stundensatzCents), `stundenWochenLock` (jahr, kw, gesperrtAm, gesperrtVon, notes)
- Server Actions für Lock/Unlock

---

### 1.8 Finanzen-Hub ✓ Live · `/finanzen`

Der Finanzen-Hub bündelt fünf Sub-Module zu einer durchgängigen Finanz- und Buchhaltungs-Strecke. Im Sidebar erscheint nur „Finanzen"; die Sub-Module sind über den Hub und über Direkt-URLs erreichbar.

**Hub-Funktionen**
- Fünf Cards mit Live-Stats: Eingangsrechnungen (Anomalien, offene Posten), E-Rechnung-Import, Ausgangsrechnungen (Mahnungen, offene Forderungen), DATEV-Export (letztes Export-Datum), Liquidität (Szenario-Anzahl, letztes Update).

**Relevanz für Ingenieurbüros**
Auch IB ohne eigene Lohnbuchhaltung profitieren: Ausgangsrechnungen (HOAI-Honorarrechnungen mit Abschlag/Schluss), Eingangsrechnungen (Subplaner, Sachverständige, externe Statik), DATEV-Export für den Steuerberater, und Liquiditätsplanung gerade bei langlaufenden HOAI-Verträgen mit Abschlagszahlungen über mehrere Jahre.

#### 1.8.1 Eingangsrechnungen ✓ Live (POC) · `/rechnungen`

- **Anomalie-Erkennung** mit Score und Anzahl: Plausibilitätsprüfung, Preissprünge gegenüber Vergleichsperioden, Doppelbuchungs-Verdacht, Vertragsabgleich.
- XRechnung-/ZUGFeRD-Format-Erkennung mit Validierungs-Status.
- Live-Tabelle mit anomalyCount und anomalyScore.
- **Tabelle:** `rechnungen` (vendor, amount, invoiceDate, anomalyCount, anomalyScore, xmlFormat, xmlValidationStatus).

**IB-Bezug:** Kontrolle der Subplaner- und Sachverständigenrechnungen, die in Honorardurchläufe weitergereicht werden — hier entstehen sonst die teuersten Doppelbuchungen.

#### 1.8.2 E-Rechnung-Import ✓ Live · `/eingangsrechnungen/upload` · Badge: NEU

- Upload XML-Format: **XRechnung (UBL/CII), ZUGFeRD**, max. 5 MB.
- Server Action `uploadErechnungXmlRedirect()` parst XML, prüft Pflichtfelder (Lieferant, Betrag, Datum, Leistungsbeschreibung).
- Bei fehlerhaften Pflichtfeldern: automatische Erstellung eines Klärungs-Vorgangs.
- Fehlerbehandlung mit Redirect-Pattern.

**IB-Bezug:** Seit 2025 ist E-Rechnung im B2B verpflichtend. IB als Empfänger müssen XRechnung/ZUGFeRD korrekt verarbeiten können — die XML-Validierung schützt vor formal ungültigen Rechnungen, die zum Vorsteuer-Abzugsverlust führen könnten.

#### 1.8.3 Ausgangsrechnungen ✓ Live · `/ausgangsrechnungen` · Badge: NEU

- **Abschlags- und Schlussrechnungen** über alle Projekte hinweg.
- Workspace-weite, fortlaufende und unveränderbare Rechnungsnummern (Steuerrecht-konform).
- Stats: Entwürfe, offene Forderungen, fällige Mahnungen, Verzugstage.
- Format-Badges: XRechnung-generiert, ZUGFeRD-generiert.
- **§ 13b Reverse-Charge**-Erkennung im Bau-Bereich.
- **Tabelle:** `ausgangsrechnungen` (number, kind [abschlag|schluss], status, invoiceDate, dueDate, payoutGross, paidAmount, xrechnungGeneratedAt, zugferdGeneratedAt, reverseCharge).

**IB-Bezug:** HOAI-Honorarrechnungen folgen einer eigenen Logik: Abschlagsrechnungen nach Leistungsphasen-Fortschritt, Schlussrechnung nach Leistungsabnahme oder Kündigung. Die Plattform unterstützt beide Typen und sorgt für VOB/B § 16 / BGB § 650g-konforme Zahlungsabwicklung. Verzugs-Berechnung schützt vor unbeabsichtigtem Verlust von Verzugszinsen.

#### 1.8.4 DATEV-Export ⚙ Teilweise · `/finanzen/datev` · Badge: NEU

- Buchungsstapel-CSV nach **DATEV-EXTF**-Standard.
- Hub-Card zeigt letztes Export-Datum und Historie (letzte 5 Exporte).
- **In Entwicklung:** Direktes Eingabe-Interface für Export-Konfiguration (Zeitraum, Sachkonten-Mapping).
- **Tabelle:** `datevExports`.

**IB-Bezug:** Der DATEV-Export ist die Standard-Schnittstelle zum Steuerberater im DACH-Raum. Für IB mit externer Buchhaltung essenziell, um Doppelerfassung zu vermeiden.

#### 1.8.5 Liquiditätsplanung ⚙ Teilweise · `/finanzen/liquiditaet` · Badge: NEU

- Cashflow-Forecast aus offenen Ausgangsrechnungen, NU-Eingangsrechnungen und Lohn (aus Stunden-Modul).
- **Frühwarnung** bei prognostiziertem Saldo ≤ 0 in den nächsten 14 Tagen.
- Hub-Card zeigt Anzahl Szenarien und letzten Update-Zeitpunkt.
- **In Entwicklung:** Eingabe-Seite für Szenario-Konfiguration.
- **Tabelle:** `liquiditaetSzenarien`.

**IB-Bezug:** Bei HOAI-Projekten mit langen Laufzeiten und Abschlagszahlungen, die auf Genehmigungsbescheide oder Bauabschnitte gekoppelt sind, ist Liquiditätsplanung kritisch — vor allem für kleinere Büros mit konzentrierter Auftragslast.

---

## Sektion 2 — Quick-Actions

Quick-Actions sind fokussierte Werkzeuge, oft KI-gestützt. Sie werden meist aus einem Vorgang oder einer Frist heraus aufgerufen.

### 2.1 HOAI-Rechner ✓ Live · `/hoai-rechner` · Badge: NEU · **IB-exklusiv**

> Dieses Modul ist über `requiresWorkspaceType: "ingenieurbuero"` ausschließlich für Ingenieurbüro-Workspaces sichtbar.

**Zweck:** Honorarberechnung nach HOAI 2021 für die wichtigsten Leistungsbilder.

**Funktionen & Features**
- Honorartafeln für:
  - **§ 35 HOAI** — Gebäudeplanung
  - **§ 47 HOAI** — Ingenieurbauwerke
  - **§ 51 HOAI** — Tragwerksplanung
  - **§ 56 HOAI** — Technische Ausrüstung
- **Lineare Interpolation** zwischen den Honorartafel-Stützstellen für anrechenbare Kosten zwischen den Tabellenwerten.
- Honorarzonen-Auswahl (I bis V).
- Hinweis auf Verwendung in Projekten: HOAI-Werte können direkt am Projekt hinterlegt werden — der Rechner ist Quick-Tool, das Projekt ist Single-Source-of-Truth.

**Relevanz für Ingenieurbüros**
Dies ist das Kernwerkzeug jedes IB. HOAI-Honorarberechnungen sind Pflichtbestandteil jedes Angebots, jeder Beauftragung und jeder Schlussrechnung. Die saubere Interpolation zwischen Stützstellen ist nicht trivial — viele Excel-Lösungen rechnen hier falsch. LexBau löst das in einer einheitlichen, im Code geprüften Implementierung. Das EMERALD-„NEU"-Badge markiert das Modul als Premium-Feature für IB-Kunden.

**Technik**
- Client-Component `HoaiCalculator` (keine DB-Persistenz, rein clientseitig).
- HOAI-Tafeldaten in Code-Konstanten — Aktualisierung bei HOAI-Novellen über Code-Update.

---

### 2.2 Recht-Assistent ⏳ Stub (KI-Roadmap) · `/recht-assistent` · Badge: KI

**Zweck:** Konversations-Interface für baurechtliche Fragen mit Norm-Bezug.

**Funktionen & Features (heute)**
- Freitext-Anfrage mit Auswahl des Projekt-Kontexts.
- Mock-Szenarien aus `lib/data.ts` liefern fertige Demo-Antworten zu typischen Standardfällen (Mängelrüge mit unzureichender Frist, fehlende TGA-Pläne, etc.).
- **Workspace-Rollen-spezifische Perspektive:** ein IB-Workspace bekommt IB-Antworten (Planer-Sicht, HOAI-Bezug), ein Bauunternehmen bekommt Auftragnehmer-Sicht.
- Persistente Anfragen-Historie pro Workspace.
- Persistenter RDG-Banner.

**Funktionen & Features (Roadmap, Phase 1)**
- Live-Anbindung an Claude-API mit RAG über Gesetzestexte und Urteile.
- Quellenangaben mit Norm-Zitat und BGH-Az.

**Relevanz für Ingenieurbüros**
IB stehen zwischen Bauherr und ausführendem Unternehmen — und damit oft im Zentrum baurechtlicher Streitfälle. Der Recht-Assistent soll eine schnelle erste Einschätzung mit Norm- und Rechtsprechungs-Bezug liefern, bevor (bei wirtschaftlich relevanten Streitwerten) ein Anwalt eingeschaltet wird. Die rollen-spezifische Perspektive ist hier entscheidend: Eine Mängelrüge muss aus IB-Sicht anders bewertet werden als aus Bauunternehmer-Sicht (Planungsfehler-Risiko vs. Ausführungsmangel-Verteidigung).

**Technik**
- Tabelle `queries`: question, category, response, createdAt, workspaceId
- Server Action: `createQuery()`
- Geplant: Claude-API + RAG auf `legalChunks` und `case_decisions`

---

### 2.3 Analysen-Hub ⚙ Teilweise · `/analysen` · Badge: PRO

Hub für drei spezialisierte KI-/Heuristik-Werkzeuge. Im Sidebar nur „Analysen"; Sub-Tools per Hub oder Direkt-URL.

**Hub-Funktionen**
- Statistiken: erfasste Verträge, Anzahl High-Risk- und Medium-Risk-Befunde.
- Quick-Cards zu den drei Sub-Tools.

#### 2.3.1 Vertrags-Scan ✓ Live · `/vertrag` · Badge: PRO

- **Vertragstext-Upload** mit automatischem Scan auf Risiko-Klauseln:
  - Vertragsstrafen / Pönale-Klauseln
  - Sicherheitseinbehalte über zulässigem Maß
  - Unangemessene Zahlungsfristen
  - AGB-Konflikte mit BGB/VOB/B
  - Fehlende Vorbehalte (z. B. bei Anordnungen, Mehrkosten)
- Findings mit Belegstelle (Markup im Original) und Rechtsgrundlage.
- Server Actions: `rescanContract()`, `createVorgangFromContract()`, `deleteContract()`.
- **Tabelle:** `contracts` (kind, title, projectId, signedAt, partyAg, riskScore, riskFindings [JSON Finding[]]).

**IB-Bezug:** Vor jeder Beauftragung sollte der Architekten-/Ingenieurvertrag (BGB §§ 650p–650t) auf Risiken geprüft werden. Häufige Fallstricke: Honorar-Deckelung bei Kostenerhöhung, Haftungsbegrenzung zugunsten des AG, unklare Leistungsphasen-Abgrenzung. Der Scan erzeugt aus jedem High-Risk-Befund direkt einen Vorgang — der Workflow läuft sauber bis zur Klärung.

#### 2.3.2 Rüge-Analyse ⏳ Heuristik · `/ruege-analyse` · Badge: PRO

- **Heute (Heuristik):** Eingehender Mängelrüge-Text wird auf formelle Wirksamkeit geprüft (konkrete Mangel-Bezeichnung, Frist, Schriftform), materielle Berechtigung wird grob bewertet, Antwortvorschlag wird generiert.
- Persistenter RDG-Banner.
- **Roadmap (Phase 1):** Volltext-Analyse mit Claude-API + RAG auf VOB/B-Kommentar und BGH-Rechtsprechung.

**IB-Bezug:** Bei IB-Generalplaner-Verträgen kommen Mängelrügen sowohl gegen Planungsleistungen (BGB § 634) als auch gegen Bauüberwachungsfehler. Die formelle Prüfung — ist die Frist angemessen, ist der Mangel konkret bezeichnet, ist die Schriftform gewahrt — ist Standard-Erstreaktion. Die Heuristik liefert das in Sekunden.

#### 2.3.3 Anordnungs-Check ✓ Live · `/anordnung` · Badge: PRO

- **AG-Kommunikation** (E-Mail/WhatsApp/Brief-Text einfügen).
- Klassifikation als **§ 1 Abs. 3 VOB/B** (Anordnung Leistungsänderung) oder **§ 1 Abs. 4 VOB/B** (zusätzliche Leistung).
- Live-Heuristik mit Score 0–100 (`analyzeAnordnung()` aus `lib/anordnung-analyze`).
- Stichwort-Match für anordnende Verben („wir bitten Sie", „bitte führen Sie aus", etc.).
- Deadline-Erkennung im Text.
- Empfehlungen mit Frist (z. B. „Mehrkosten-Ankündigung innerhalb 7 Tagen").
- Risk-Warning bei verdeckten Anordnungen ohne Mehrkosten-Vorbehalt.

**IB-Bezug:** Eine der gefährlichsten Schnittstellen für IB ist die mündliche oder formlose AG-Anordnung, die als „Selbstverständlichkeit" mitläuft, aber tatsächlich Mehrleistung im Sinne § 1 Abs. 3/4 VOB/B darstellt. Wer diese nicht **vor Ausführung** als Mehrleistung qualifiziert und ankündigt, verliert den Mehrkostenanspruch (BGH VII ZR 201/18). Der Anordnungs-Check ist genau dieser Frühwarnsensor.

---

## Sektion 3 — Bibliothek

Referenzinhalte ohne Workflow-Zustand: das juristische Nachschlagewerk der Plattform.

### 3.1 Gesetzestexte ✓ Live · `/gesetze`

**Zweck:** Durchsuchbare, paragraph-basierte Datenbank der zentralen Bauvorschriften.

**Funktionen & Features**
- Inhalte:
  - **BGB §§ 631–650v** (Werkvertrag, Bauvertrag, Architekten-/Ingenieurvertrag) — vollständig automatisch von gesetze-im-internet.de geladen
  - **HOAI 2021** — vollständig automatisch geladen
  - **VOB/A, VOB/B, VOB/C** — paraphrasierte Zusammenfassungen mit Deep-Links zu juris/DIN Media/beck-online (Volltext beim jeweils bestehenden Abo)
- Suchformular mit Volltextsuche (ab 2 Zeichen).
- Cards mit Lizenz-Status (Frei vs. Lizenziert) und Quellenangabe.
- VOB-Hinweis: Fair-Use-Zitatrecht (§ 51 UrhG); Volltext-Lizenz über Tier-Migration verfügbar.

**Relevanz für Ingenieurbüros**
Die HOAI ist das Honorar-Grundgesetz jedes IB; die §§ 631 ff. BGB regeln Werkvertragsrecht und seit 2018 explizit Architekten-/Ingenieurverträge (§§ 650p–650t BGB). VOB/B kommt über AG-AGB regelmäßig zur Anwendung, gerade bei öffentlichen Auftraggebern. Eine paragraph-genaue, durchsuchbare Plattform-Datenbank — ohne Sprung in Browser-Tabs — beschleunigt die juristische Arbeit erheblich.

**Technik**
- Tabelle `legalChunks`: source (bgb|hoai|vob_a|vob_b|vob_c), content, paragraph, licensedContent, licensedSourceId
- Befehle: `npm run db:fetch-laws` (BGB+HOAI von gesetze-im-internet.de)

---

### 3.2 Urteile ✓ Live · `/urteile`

**Zweck:** Indizierte BGH-Rechtsprechung aus den baurelevanten Senaten.

**Funktionen & Features**
- Inhalte: **BGH-Entscheidungen** aus den Senaten **VII. ZR** (Werkvertragsrecht — zentral für Bauverträge) und **V. ZR** (Sachenrecht).
- Indizierung über das offizielle ECLI-Verzeichnis des BMJ (rechtsprechung-im-internet.de).
- Filter: Gericht, Jahr, Volltextsuche.
- Statistiken: Gesamt, Verteilung VII. ZR vs. V. ZR, Verteilung nach Senaten.
- Volltext bleibt beim BMJ einsehbar (Metadaten gemeinfrei nach § 5 UrhG, Volltext nicht in der DB gespiegelt).

**Relevanz für Ingenieurbüros**
Die BGH-Rechtsprechung des VII. Zivilsenats ist die Schlüsselquelle für alle Streitfälle rund um Architekten-/Ingenieurvertrag, Mängelhaftung, Honorarberechnung, Abschlagsforderungen. Die direkte Az.-/ECLI-Verknüpfung ist die Brücke zur juristischen Recherche.

**Technik**
- Tabelle `case_decisions`: az, date, court, title, ecli, decisionType
- Befehl: `npm run db:fetch-cases` (idempotent, automatische Aktualisierung)

---

### 3.3 Vorlagen ⏳ Stub · `/vorlagen`

**Zweck:** Zentraler Speicher für wiederkehrende Schriftstücke (Verträge, Aushänge, Anschreiben).

**Funktionen & Features (heute)**
- Server-Component lädt Projekt-Meta (AG, Baustellenadresse, Vertragsdatum, Autor) sowie Workspace-Daten (juristischer Name).
- Übergabe an Client-Component `VorlagenClient` (UI in Entwicklung).

**Funktionen & Features (Roadmap)**
- Vertrags-Vorlagen mit projekt-spezifischer Vorbelegung
- Aushang-Templates (Baustellenschilder, Sicherheits-Aushänge)
- Anschreiben-Templates (Mahnungen, Bedenkenanmeldungen)

**Relevanz für Ingenieurbüros**
Vorlagen mit automatischer Vorbelegung von Projekt- und Workspace-Daten sparen pro Vorgang Minuten — über ein Jahr Stunden. Besonders relevant: Honorarrechnungs-Vorlagen mit HOAI-Daten aus dem Projekt, Bedenkenanmeldungs-Vorlagen mit Norm-Bezug.

**Technik**
- Lese-Operationen auf `projects` (id, identifier, name, ag, siteAddress, contractDate), `users` (name, roleLabel), `workspaces` (legalName)

---

### 3.4 Beweissicherung ⏳ Stub · `/beweis`

**Zweck:** Strukturierte Foto-/Video-/Notizen-Dokumentation als Beweissicherung bei kritischen Bauereignissen.

**Funktionen & Features (heute)**
- Server-Component lädt Projekte und vorhandene Beweis-Checklisten.
- Übergabe an Client-Component `BeweisClient` (UI in Entwicklung).

**Funktionen & Features (Roadmap)**
- Anlassbezogene Checklisten (z. B. „Vor Verputzen", „Nach Wassereintritt", „Übergabe").
- Foto-Upload mit Geo- und Zeitstempel.
- Verknüpfung zu Vorgang oder Frist.

**Relevanz für Ingenieurbüros**
Im Rahmen der Bauüberwachung (LP 8) ist Beweissicherung die wichtigste Versicherung gegen spätere Mangelvorwürfe. Strukturierte Checklisten („Was muss vor dem Verputzen fotografiert werden?") schützen vor vergessenen Aufnahmen, die später nicht mehr nachholbar sind. Ein typischer IB-Workflow: Beweissicherung vor jeder verdeckten Leistung.

**Technik**
- Tabelle `beweisChecklists`: projectId, anlass, checksState (JSON), notes, workspaceId

---

## Sektion 4 — Verwaltung

Workspace-Konfiguration, Compliance-Verpflichtungen und Lizenzen.

### 4.1 Workspace ✓ Live · `/workspace`

**Zweck:** Zentrale Workspace-Konfiguration und Nutzerverwaltung.

**Funktionen & Features**
- **Nutzerverwaltung:** Mitglieder mit Rollen (Admin, User), aktivem Status.
- **Rollen-Selektor** auf Workspace-Ebene: `bauunternehmer | bauherr | ingenieurbuero` — bestimmt Sichtbarkeit IB-spezifischer Module (z. B. HOAI-Rechner) und Perspektive im Recht-Assistenten.
- **VOB-Einstellungen:** bevorzugter externer Provider (juris, DIN Media, beck-online, alle).
- **HinSchG-Aktivierung:** Flag `hinschgEnabled` schaltet das HinSchG-Modul ein, mit Eingabe einer dedizierten Hinweisgeber-E-Mail.
- **Geschäftsdaten:** IBAN, BIC, Bankname, Steuer-Nr., USt-IdNr., Adresse, E-Mail, Telefon — werden in Vorlagen, Rechnungen und Briefkopf eingebettet.

**Relevanz für Ingenieurbüros**
Die Workspace-Rolle ist die wichtigste Konfigurationsentscheidung: sie schaltet den HOAI-Rechner frei, justiert die Antworten des Recht-Assistenten und passt die Risiko-Bewertungen im Vertrags-Scan auf IB-Perspektive an. Geschäftsdaten als Single-Source-of-Truth verhindern Inkonsistenzen zwischen Honorarrechnungen, Aushängen und Anschreiben.

**Technik**
- Tabelle `workspaces`: workspaceRole, vobPreferredExternalProvider, vobLicenseProvider, hinschgEnabled, hinschgOfficeContactEmail, iban, bic, bankName, taxId, vatId, address, email, phone
- Query: `getCurrentWorkspace()`

---

### 4.2 Hinweisgebersystem (HinSchG) ✓ Live · `/hinschg` · admin-only · flag-pflichtig

> Sichtbar nur, wenn `workspaces.hinschgEnabled = true` und User-Rolle `admin` ist.

**Zweck:** Hinweisgeberstelle nach §§ 12 ff. HinSchG (Hinweisgeberschutzgesetz).

**Funktionen & Features**
- Liste eingegangener Meldungen mit Status-Badges (Neu, In Prüfung, Abgeschlossen, Überfällig).
- Anonyme und namentliche Meldungen.
- **Pflicht-Fristen umgesetzt:** Eingangsbestätigung 7 Tage, Rückmeldung an Hinweisgeber 3 Monate.
- Öffentliche Meldungs-URL (für externe Hinweisgeber zugänglich).
- Kategorisierung der Meldungen.

**Relevanz für Ingenieurbüros**
Die Pflicht zum Hinweisgebersystem trifft Unternehmen ab 50 Mitarbeitern (§ 12 HinSchG). Größere IB fallen darunter. Die Plattform stellt sicher, dass die formalen Fristen — die bei Versäumnis bußgeldbewehrt sind — eingehalten werden. Für IB unter 50 MA bleibt das Modul deaktiviert (kein Konfigurations-Aufwand).

**Technik**
- Tabelle `meldungen`: subject, category, isAnonymous, submittedAt, responseDeadline, ackAt, reporterDisplayName, status (neu|in_pruefung|abgeschlossen)
- Queries: `getMeldungen()`, `getMeldungenStats()`

---

### 4.3 Lizenz-Center ✓ Live · `/lizenz` · Badge: PRO

**Zweck:** Transparenz über Workspace-Tier, Nutzer-Lizenzen, Plattform-Lizenzen und Compliance-Logs.

**Funktionen & Features**
- **Workspace-Tier-Anzeige:** Solo / Team / Business / Enterprise.
- **Nutzer-Lizenzen-Tracking:** wie viele User-Slots vergeben, wie viele frei.
- **Plattform-Lizenz-Management:** verwaltete Verträge mit DIN Media (VOB-Volltexte), juris, beck-online — mit Gültigkeitsdaten und Status.
- **Audit-Log-Zähler:** wie oft wurde lizenzpflichtiger Content angezeigt (DIN-Media-Verträge verlangen typischerweise Audit-Logs).
- **Externe Konten:** VOB-Provider, Anthropic-AVV, Hetzner-AVV — zentrale Übersicht aller Verträge mit Drittanbietern.

**Relevanz für Ingenieurbüros**
Für IB im Tier 0 (Solo/Free) reicht das standardmäßige Fair-Use-Zitatrecht für VOB. Sobald ein Workspace eine DIN-Media-Lizenz erwirbt (Tier 1+), schaltet die Plattform automatisch auf Volltext-Anzeige der VOB um — über das Feld `licensedContent` in den `legalChunks`. Das Lizenz-Center macht Lizenz-Status und -Kosten transparent und liefert das Audit-Log, das für die DIN-Media-Vertragstreue erforderlich ist.

**Technik**
- Tabellen: `workspaces` (tier, vobLicenseProvider), `users` (hasLicense, status), `licensedSources` (provider, product, validFrom, validUntil, status), `licensedAccessLog` (workspaceId)

---

## HOAI-Leistungsphasen-Matrix

Verbindet die HOAI-Leistungsphasen mit den Modulen, die in der jeweiligen Phase besonders relevant sind:

| LP | Bezeichnung | Primäre Module | Sekundär |
|---|---|---|---|
| **LP 1** | Grundlagenermittlung | HOAI-Rechner, Projekte | Vertrags-Scan |
| **LP 2** | Vorplanung | Projekte, Vorgänge | Recht-Assistent |
| **LP 3** | Entwurfsplanung | Projekte, Vorgänge | Fristen |
| **LP 4** | Genehmigungsplanung | Fristen, Vorgänge | Recht-Assistent |
| **LP 5** | Ausführungsplanung | Projekte, Vorgänge | Bautagebuch (vorbereitend) |
| **LP 6** | Vorbereitung der Vergabe | Vertrags-Scan, Vorlagen | Projekte |
| **LP 7** | Mitwirkung bei der Vergabe | Vertrags-Scan, Vorgänge | Anordnungs-Check |
| **LP 8** | **Objektüberwachung** | **Bautagebuch, Anzeigen, Anordnungs-Check, Beweissicherung, Rüge-Analyse, Stunden** | Fristen, Vorgänge |
| **LP 9** | Objektbetreuung | Rüge-Analyse, Fristen | Recht-Assistent (Verjährungsfragen § 634a BGB) |

> **Beobachtung:** Die Modul-Dichte konzentriert sich auf **LP 8 — Objektüberwachung**, die haftungsintensivste Phase für IB. Das ist kein Zufall, sondern reflektiert die Plattform-Strategie: dort ansetzen, wo die rechtlichen Risiken und der operative Druck am höchsten sind.

---

## Status-Gesamtübersicht

| Sektion | ✓ Live | ⚙ Teilweise | ⏳ Stub / Roadmap |
|---|---|---|---|
| **Arbeit** | Dashboard, Vorgänge, Projekte, Bautagebuch, Fristen, Anzeigen, Stunden, Finanzen-Hub, Eingangsrechnungen, E-Rechnung-Import, Ausgangsrechnungen | DATEV-Export, Liquiditätsplanung | — |
| **Quick-Actions** | HOAI-Rechner, Vertrags-Scan, Anordnungs-Check | Analysen-Hub | Recht-Assistent (Mock-Modus, Phase 1), Rüge-Analyse (Heuristik) |
| **Bibliothek** | Gesetzestexte, Urteile | — | Vorlagen, Beweissicherung |
| **Verwaltung** | Workspace, HinSchG, Lizenz-Center | — | — |

**Produktiv-Einsatz-Bewertung für Ingenieurbüros:**

Die Plattform ist heute einsatzfähig für die Kern-Workflows eines IB:
- Projekt- und Fristenmanagement mit HOAI-Verankerung
- Vertrags- und Risikoanalyse (Vertrags-Scan, Anordnungs-Check live)
- VOB/B-Compliance bei Anzeigen
- Bauüberwachungs-Dokumentation (Bautagebuch live; Beweissicherung in Entwicklung)
- Honorarrechnungen mit XRechnung/ZUGFeRD
- HOAI-Honorarberechnung

**In aktiver Entwicklung:**
- Recht-Assistent: Volltext-Anbindung an Claude-API mit RAG (Phase 1)
- Rüge-Analyse: Volltext-Parsing statt Heuristik (Phase 1)
- Vorlagen und Beweissicherung: UI-Vervollständigung
- DATEV-Export und Liquiditätsplanung: Eingabe-Interfaces

---

## Quellen & Code-Referenzen

| Aspekt | Quelle |
|---|---|
| Modul-Definitionen (Single Source of Truth) | [src/lib/modules.ts](../src/lib/modules.ts) |
| Sidebar-Navigation | [src/lib/data.ts](../src/lib/data.ts) |
| Datenbank-Schema | [src/db/schema/](../src/db/schema/) |
| Routen-Implementierung | [src/app/](../src/app/) |
| Workspace-Konfiguration | [src/db/schema/workspaces.ts](../src/db/schema/workspaces.ts) |
| HOAI-Rechner | [src/app/hoai-rechner/](../src/app/hoai-rechner/) |
| Roadmap & Phasen | [README.md](../README.md) — Abschnitt „Roadmap" |
| Use-Case-Analyse Ingenieurwesen | [Use_Case_Analyse_Ingenieurswesen.docx](../Use_Case_Analyse_Ingenieurswesen.docx) |
| Marktanalyse DACH | [Marktanalyse_LexBau_DACH.docx](../Marktanalyse_LexBau_DACH.docx) |

### Rechtshinweise

- **RDG-Konformität:** LexBau liefert Information, keine Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes. Bei wirtschaftlich relevanten Streitwerten ist die Rücksprache mit einem Rechtsanwalt empfohlen. Persistenter Banner unter `/recht-assistent`, `/ruege-analyse`, `/fristen` und auf eigener Seite [`/rdg-hinweis`](../src/app/rdg-hinweis/).
- **VOB-Lizenzmodell:** Tier 0 (Free/Solo) nutzt eigene Zusammenfassungen + Deep-Links zu juris/DIN Media/beck-online unter Berufung auf das Zitatrecht (§ 51 UrhG). Tier 1+ schaltet via DIN-Media-Plattformlizenz auf Volltext-Anzeige um. Audit-Logging vorbereitet.
- **Quellenrechte:** BGB und HOAI sind amtliche Werke (§ 5 UrhG, gemeinfrei). VOB/B ist DIN-Norm — paraphrasierte Zusammenfassungen mit Deep-Links.

---

*Dokument-Stand: 2026-05-05 · Erstellt aus Code-Verifikation gegen den aktuellen Hauptzweig.*
