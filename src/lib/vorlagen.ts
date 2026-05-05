/**
 * Vorlagen-Bibliothek für typische Bau-Korrespondenz.
 * Platzhalter im Format {feld_name} werden mit Projekt-Daten ersetzt.
 *
 * KEINE Rechtsberatung — die Vorlagen sind Ausgangspunkt, kein Endprodukt.
 * Vor Versand IMMER eigenverantwortlich prüfen, ggf. anwaltlich.
 */

import type { WorkspaceRole } from "@/db/schema";

export type VorlagenCategory =
  | "rüge_antwort"
  | "rüge_setzen"
  | "behinderung"
  | "bedenken"
  | "nachtrag"
  | "anordnung"
  | "abnahme"
  | "kuendigung"
  | "schluss"
  | "vertragsstrafe";

export type Vorlage = {
  id: string;
  title: string;
  category: VorlagenCategory;
  description: string;
  legalBasis: string;
  body: string;
  /** Rollen, für die diese Vorlage primär relevant ist. */
  roles: WorkspaceRole[];
};

export const VORLAGEN: Vorlage[] = [
  {
    id: "mangelruege_antwort",
    title: "Mangelrüge-Antwort · angemessene Frist anbieten",
    category: "rüge_antwort",
    description:
      "Antwort auf eingehende Mangelrüge mit zu kurz gesetzter Frist. Bietet 14 Werktage Nachbesserung an, behält Vorbehalt der Kostentragung vor.",
    legalBasis: "§ 13 Abs. 5 VOB/B · § 634 Nr. 1 BGB · BGH VII ZR 13/16",
    roles: ["bauunternehmer"],
    body: `[Briefkopf · {an_name}]

{site_address}

Betreff: Mangelrüge {bv_nummer} · {project_name}
Datum: {today}

Sehr geehrte Damen und Herren,

wir bestätigen den Erhalt Ihrer Mangelrüge vom {received_date}.

Die von Ihnen gesetzte Frist von {requested_days} {requested_days_unit} halten wir
für nicht angemessen i.S.d. § 13 Abs. 5 VOB/B. Bei umfangreichen Nachbesserungen
sind nach BGH-Rechtsprechung (VII ZR 13/16) regelmäßig Trocknungs- und
Witterungsbedingungen zu berücksichtigen; eine Frist unter 10 Werktagen ist
typischerweise unwirksam kurz.

Wir bieten Ihnen folgendes an:

1. Beweissicherung VOR Beseitigung
   Wir schlagen einen Termin in der KW {kw_proposed} vor, an dem ein öffentlich
   bestellter und vereidigter Sachverständiger die Mängel im IST-Zustand
   dokumentiert. Bitte teilen Sie uns Ihre Verfügbarkeit mit.

2. Nachbesserung mit angemessener Frist
   Wir werden die gerügten Mängel binnen 14 Werktagen ab dem o.g. Termin
   beseitigen.

3. Vorbehalt der Kostentragung
   Sollte die Beweisaufnahme ergeben, dass die Mängel auf einer Vorleistung des
   AG (z. B. mangelhafter Untergrund, geänderte Anweisungen) beruhen, behalten
   wir uns die Geltendmachung der Kosten ausdrücklich vor.

Eine Selbstvornahme nach § 13 Abs. 5 Satz 2 VOB/B vor Ablauf der angemessenen
Frist setzt uns nicht in Verzug und löst keine Erstattungsansprüche aus.

Mit freundlichen Grüßen

{author_name}
{author_role}
{operator_legal_name}

Hinweis: Information, keine Rechtsberatung i.S.d. RDG. Bei wirtschaftlich
relevanten Streitwerten Rücksprache mit einem Rechtsanwalt empfohlen.`,
  },
  {
    id: "bha",
    title: "Behinderungsanzeige (BHA)",
    category: "behinderung",
    description:
      "Förmliche Behinderungsanzeige nach § 6 Abs. 1 VOB/B. Voraussetzung für Bauzeitverlängerung und Schadensersatz.",
    legalBasis: "§ 6 Abs. 1 VOB/B · BGH VII ZR 11/08 (Form + Inhalt)",
    roles: ["bauunternehmer"],
    body: `[Briefkopf]

{ag_name}
{ag_address}

Betreff: Behinderungsanzeige · {bv_nummer} · {project_name}
Datum: {today}

Sehr geehrte Damen und Herren,

hiermit zeigen wir Ihnen gemäß § 6 Abs. 1 VOB/B eine Behinderung in der
Ausführung des oben genannten Bauvorhabens an.

1. Behinderungstatsache
   {hindrance_facts}

2. Ursache
   {hindrance_cause}

3. Voraussichtliche Auswirkungen auf die Bauzeit
   - Beginn der Behinderung: {hindrance_start}
   - Voraussichtliche Dauer: {hindrance_duration}
   - Auswirkungen auf den Bauablauf: {hindrance_impact}
   - Erwartete Bauzeitverlängerung: {extension_days} Werktage

Wir behalten uns vor, im Fall der Fortdauer der Behinderung weitere Rechte aus
§ 6 Abs. 6 VOB/B (Schadensersatz) und § 6 Abs. 7 VOB/B (Kündigungsrecht nach
3 Monaten) geltend zu machen.

Wir bitten um umgehende Mitteilung, mit welchen Maßnahmen die Behinderung
beseitigt werden kann.

Mit freundlichen Grüßen

{author_name}
{author_role}
{operator_legal_name}

Hinweis: Information, keine Rechtsberatung i.S.d. RDG.`,
  },
  {
    id: "bedenken",
    title: "Bedenkenanmeldung",
    category: "bedenken",
    description:
      "Schriftliche Bedenkenanmeldung nach § 4 Abs. 3 VOB/B — schützt vor Mit-Haftung bei mangelhafter Vorleistung des AG.",
    legalBasis: "§ 4 Abs. 3 VOB/B",
    roles: ["bauunternehmer"],
    body: `[Briefkopf]

{ag_name}
{ag_address}

Betreff: Bedenkenanmeldung · {bv_nummer} · {project_name}
Datum: {today}

Sehr geehrte Damen und Herren,

gemäß § 4 Abs. 3 VOB/B zeigen wir Ihnen Bedenken gegen folgende Sachverhalte
an:

1. Gegenstand der Bedenken
   {bedenken_subject}

2. Konkrete Bedenken
   {bedenken_details}

3. Empfohlene Maßnahmen
   {bedenken_recommendations}

Sollten Sie trotz dieser Bedenken die Ausführung in der ursprünglich
vorgesehenen Form anordnen, bitten wir Sie um schriftliche Bestätigung. Wir
führen die Leistung dann unter Verzicht auf die Mängelrüge nicht aus und
behalten uns die Folgen einer Mängel-Mit-Haftung vor.

Wir bitten um Bestätigung des Eingangs sowie um eine Stellungnahme binnen
{response_days} Werktagen.

Mit freundlichen Grüßen

{author_name}
{author_role}
{operator_legal_name}

Hinweis: Information, keine Rechtsberatung i.S.d. RDG.`,
  },
  {
    id: "mehrkosten_ankuendigung",
    title: "Mehrkosten-Ankündigung VOR Ausführung (§ 2 Abs. 5 VOB/B)",
    category: "nachtrag",
    description:
      "Anspruchsvoraussetzung nach § 2 Abs. 5 VOB/B: muss VOR Ausführung versendet werden, sonst Anspruchsverlust (BGH VII ZR 201/18).",
    legalBasis: "§ 2 Abs. 5 VOB/B · BGH VII ZR 201/18",
    roles: ["bauunternehmer"],
    body: `[Briefkopf]

{ag_name}
{ag_address}

Betreff: Mehrkosten-Ankündigung · {bv_nummer} · {project_name}
Datum: {today}

Sehr geehrte Damen und Herren,

Sie haben am {anordnung_date} die Ausführung folgender geänderter/zusätzlicher
Leistung angeordnet:

   {leistung_geaendert}

Hiermit kündigen wir Ihnen gemäß § 2 Abs. 5 VOB/B AUSDRÜCKLICH VOR Ausführung
der Leistung an, dass die Anordnung Mehrkosten gegenüber der vertraglichen
Vergütung auslöst:

   - Voraussichtliche Mehrkosten netto: ca. {mehrkosten_eur} €
   - Auswirkungen auf den Bauablauf: {bauablauf_impact}

Ein detailliertes Nachtragsangebot reichen wir innerhalb von {nachtrag_days}
Werktagen ein.

Bitte teilen Sie uns binnen 5 Werktagen mit, ob die Anordnung
aufrechterhalten wird oder zurückgenommen wird. Andernfalls gehen wir von
Aufrechterhaltung aus.

Mit freundlichen Grüßen

{author_name}
{author_role}
{operator_legal_name}

Hinweis: Information, keine Rechtsberatung i.S.d. RDG.`,
  },
  {
    id: "abnahmeprotokoll",
    title: "Abnahmeprotokoll mit Vertragsstrafe-Vorbehalt",
    category: "abnahme",
    description:
      "Abnahmeprotokoll mit explizitem Vertragsstrafe-Vorbehalt (BGH-Rechtsprechung erfordert ausdrückliche Erklärung).",
    legalBasis: "§ 12 VOB/B · § 640 BGB · BGH VII ZR 210/01",
    roles: ["bauherr", "ingenieurbuero"],
    body: `ABNAHMEPROTOKOLL

Bauvorhaben: {project_name}
BV-Nummer: {bv_nummer}
Auftraggeber: {ag_name}
Auftragnehmer: {operator_legal_name}
Datum der Abnahme: {abnahme_date}
Ort: {site_address}

Anwesend (AG):  ____________________________________________
Anwesend (AN):  ____________________________________________
Anwesend (Architekt/SV): _____________________________________

1. GEGENSTAND DER ABNAHME
   Die heute zur Abnahme vorgelegten Leistungen umfassen:
   {abnahme_scope}

2. FESTGESTELLTE MÄNGEL
   Nr | Lage | Mangel | Frist zur Beseitigung
   1  | ___  | ____   | bis __________
   2  | ___  | ____   | bis __________
   3  | ___  | ____   | bis __________

   (Liste fortsetzen / Anlagen beifügen)

3. RESTLEISTUNGEN (nicht-mangel-haftig)
   {restleistungen}

4. ERKLÄRUNG ZUR ABNAHME
   [ ] Abnahme unter Vorbehalt der oben festgestellten Mängel
   [ ] Verweigerung der Abnahme — Begründung: ______________

5. VERTRAGSSTRAFE-VORBEHALT
   Der Auftraggeber behält sich die Geltendmachung einer Vertragsstrafe wegen
   Bauzeitüberschreitung gemäß Vertrag vom {contract_date} ausdrücklich vor.

   Hinweis: Ohne ausdrücklichen Vorbehalt bei Abnahme verfällt der
   Vertragsstrafenanspruch (BGH VII ZR 210/01).

6. SCHLUSSRECHNUNG
   Die Frist zur Vorlage der Schlussrechnung beginnt mit Datum der Abnahme zu
   laufen (§ 14 VOB/B).

7. GEWÄHRLEISTUNGSFRIST
   Die Gewährleistungsfrist von {warranty_years} Jahren beginnt mit dem heutigen
   Datum.

Unterschrift AG:                        Unterschrift AN:

____________________                    ____________________

Datum: __________                       Datum: __________


Hinweis: Information, keine Rechtsberatung i.S.d. RDG.`,
  },
  {
    id: "kuendigung_wichtiger_grund",
    title: "Kündigung aus wichtigem Grund (§ 6 Abs. 7 VOB/B)",
    category: "kuendigung",
    description:
      "Kündigung wegen Behinderung > 3 Monate nach § 6 Abs. 7 VOB/B. Vorbehalt: anwaltliche Prüfung dringend empfohlen.",
    legalBasis: "§ 6 Abs. 7 VOB/B · § 648 BGB",
    roles: ["bauunternehmer"],
    body: `[Briefkopf]

{ag_name}
{ag_address}

Per Einschreiben mit Rückschein

Betreff: Kündigung aus wichtigem Grund · {bv_nummer} · {project_name}
Datum: {today}

Sehr geehrte Damen und Herren,

mit diesem Schreiben kündigen wir den oben bezeichneten Bauvertrag aus
wichtigem Grund gemäß § 6 Abs. 7 VOB/B.

1. KÜNDIGUNGSGRUND
   Die Behinderung der Leistung dauert seit dem {behinderung_start} an. Trotz
   mehrerer Behinderungsanzeigen (zuletzt vom {last_bha_date}) wurde der
   Behinderungsgrund bis heute nicht beseitigt. Eine Fortsetzung der Arbeiten
   ist uns nicht zumutbar.

2. ABRECHNUNG
   Wir werden die Schlussrechnung über die bisher erbrachten Leistungen
   einschließlich:
   - tatsächlich erbrachter Leistung (gemäß Aufmaß)
   - nicht ausgeführter, aber bereits einkalkulierter Leistungen
     (entgangener Gewinn nach § 6 Abs. 6 VOB/B)
   - vorhaltbare Material- und Vorhaltekosten
   binnen 30 Werktagen vorlegen.

3. RÜCKGABE
   Materialien und Geräte werden binnen 14 Tagen von der Baustelle abtransportiert.

WICHTIGER HINWEIS:
Eine Kündigung aus wichtigem Grund hat erhebliche Folgen. Vor dem Versand
sollte unbedingt anwaltliche Beratung eingeholt werden — die formellen
Voraussetzungen (Vorlauf-Schreiben, Fristsetzung, Form) variieren je nach
Konstellation.

Mit freundlichen Grüßen

{author_name}
{author_role}
{operator_legal_name}

Hinweis: Information, keine Rechtsberatung i.S.d. RDG. **Diese Vorlage
ersetzt keine anwaltliche Prüfung.**`,
  },
  {
    id: "schlussrechnung_anschreiben",
    title: "Schlussrechnung · Anschreiben",
    category: "schluss",
    description:
      "Begleitschreiben zur Schlussrechnung mit Hinweis auf Prüffrist nach § 16 Abs. 3 VOB/B.",
    legalBasis: "§ 14 VOB/B · § 16 Abs. 3 VOB/B",
    roles: ["bauunternehmer"],
    body: `[Briefkopf]

{ag_name}
{ag_address}

Betreff: Schlussrechnung · {bv_nummer} · {project_name}
Datum: {today}

Sehr geehrte Damen und Herren,

anliegend übersenden wir Ihnen die Schlussrechnung Nr. {invoice_no} zum
oben genannten Bauvorhaben.

   Brutto-Betrag: {brutto_eur} €
   Bisher erhaltene Abschlagszahlungen: {abschlag_eur} €
   Restzahlung: {rest_eur} €

Wir bitten um Begleichung des Restbetrages binnen 30 Tagen ab Eingang dieser
Rechnung gemäß § 16 Abs. 3 VOB/B.

Wir weisen darauf hin, dass die Schlusszahlung nach § 16 Abs. 3 Nr. 2 VOB/B
binnen 30 Tagen nach Zugang der prüfbaren Schlussrechnung fällig ist. Erfolgt
keine vollständige Zahlung, treten Verzug und Verzugszinsen (9 Prozentpunkte
über Basiszinssatz) ein.

Bei Rückfragen zur Aufschlüsselung der einzelnen Positionen stehen wir gerne
zur Verfügung.

Mit freundlichen Grüßen

{author_name}
{author_role}
{operator_legal_name}

Hinweis: Information, keine Rechtsberatung i.S.d. RDG.`,
  },

  /* ============== AG / BL — RÜGEN, ANORDNEN, FRISTEN SETZEN ============== */
  {
    id: "mangelruege_setzen",
    title: "Mängelrüge an AN · Frist zur Beseitigung",
    category: "rüge_setzen",
    description:
      "AG/BL rügt Mängel beim AN und setzt angemessene Nachbesserungsfrist. Voraussetzung für Selbstvornahme nach § 13 Abs. 5 S. 2 VOB/B.",
    legalBasis: "§ 4 Nr. 7 VOB/B · § 13 Abs. 5 VOB/B · § 634 BGB",
    roles: ["bauherr", "ingenieurbuero"],
    body: `[Briefkopf · {ag_name}]

{an_name}
{an_address}

Per Einschreiben mit Rückschein

Betreff: Mängelrüge · {bv_nummer} · {project_name}
Datum: {today}

Sehr geehrte Damen und Herren,

an der von Ihnen unter dem oben genannten Bauvertrag erbrachten Leistung
haben sich die nachstehend bezeichneten Mängel gezeigt:

1. FESTGESTELLTE MÄNGEL
   Nr | Lage | Mangel-Beschreibung
   1  | {mangel_lage_1} | {mangel_beschreibung_1}
   2  | {mangel_lage_2} | {mangel_beschreibung_2}
   3  | {mangel_lage_3} | {mangel_beschreibung_3}

   (Foto-Dokumentation als Anlage 1)

2. AUFFORDERUNG ZUR BESEITIGUNG
   Wir fordern Sie hiermit gemäß § 4 Nr. 7 VOB/B (vor Abnahme) bzw.
   § 13 Abs. 5 VOB/B (nach Abnahme) auf, die festgestellten Mängel
   bis zum {nachbesserung_frist} zu beseitigen.

   Diese Frist ist angemessen, da:
   {fristbegruendung}

3. ANKÜNDIGUNG SELBSTVORNAHME
   Sollten die Mängel bis zum genannten Termin nicht vollständig beseitigt
   sein, werden wir die Beseitigung gemäß § 13 Abs. 5 S. 2 VOB/B durch ein
   Drittunternehmen auf Ihre Kosten vornehmen lassen (Selbstvornahme).
   Etwaige Mehrkosten werden Ihnen in Rechnung gestellt.

4. WEITERGEHENDE RECHTE
   Wir behalten uns ausdrücklich vor:
   - Minderung der Vergütung (§ 13 Abs. 6 VOB/B)
   - Schadensersatz (§ 13 Abs. 7 VOB/B)
   - Einbehalt eines Druckzuschlags von 2× Mangelbeseitigungskosten

5. NACHWEIS DER MANGELFREIHEIT
   Nach erfolgter Mangelbeseitigung legen Sie bitte einen schriftlichen
   Nachweis (Abnahmeprotokoll, ggf. SV-Zertifikat) vor.

Wir gehen davon aus, dass Sie als ordentlicher Kaufmann zeitnah handeln, und
erwarten Ihre schriftliche Bestätigung des Bearbeitungstermins binnen
3 Werktagen.

Mit freundlichen Grüßen

{author_name}
{author_role}
{ag_legal_name}

Hinweis: Information, keine Rechtsberatung i.S.d. RDG.`,
  },
  {
    id: "anordnung_geaenderte_leistung",
    title: "Anordnung geänderte/zusätzliche Leistung (AG/BL → AN)",
    category: "anordnung",
    description:
      "Schriftliche Anordnung des AG nach § 1 Abs. 3 oder § 1 Abs. 4 VOB/B. Wirksame Anordnung ist Voraussetzung für Nachtragsrecht des AN.",
    legalBasis: "§ 1 Abs. 3 + 4 VOB/B · § 2 Abs. 5 + 6 VOB/B",
    roles: ["bauherr", "ingenieurbuero"],
    body: `[Briefkopf · {ag_name}]

{an_name}
{an_address}

Betreff: Anordnung · {bv_nummer} · {project_name}
Datum: {today}

Sehr geehrte Damen und Herren,

hiermit ordnen wir gemäß folgender Vorschriften eine Änderung bzw. Erweiterung
der vertraglich geschuldeten Leistung an:

1. ART DER ANORDNUNG
   [ ] Änderung der vertraglichen Leistung (§ 1 Abs. 3 VOB/B → Vergütung § 2 Abs. 5)
   [ ] Zusätzlich erforderliche Leistung (§ 1 Abs. 4 VOB/B → Vergütung § 2 Abs. 6)

2. GEGENSTAND DER ANORDNUNG
   {anordnung_gegenstand}

3. FACHLICHE BEGRÜNDUNG
   {anordnung_begruendung}

4. AUSFÜHRUNGSTERMIN
   Beginn: {anordnung_start}
   Fertigstellung: {anordnung_end}

5. NACHTRAGSANGEBOT
   Wir erwarten Ihr Nachtragsangebot mit Aufschlüsselung der Mehr-/Minderkosten
   binnen 10 Werktagen nach Erhalt dieses Schreibens. Bitte legen Sie das
   Angebot auf Basis der Urkalkulation vor.

6. AUSFÜHRUNG NACH ZUSTIMMUNG
   Mit der Ausführung darf erst nach unserer schriftlichen Zustimmung zum
   Nachtragsangebot oder nach unserer ausdrücklichen Anordnung trotz
   ungeklärter Vergütung begonnen werden.

WICHTIG: Mit Erhalt dieses Schreibens ist die Anordnung gemäß § 1 Abs. 3 bzw.
Abs. 4 VOB/B wirksam erteilt. Sie sind verpflichtet, die Leistung nach unserer
Zustimmung zum Nachtrag auszuführen (Ausführungspflicht des AN).

Mit freundlichen Grüßen

{author_name}
{author_role}
{ag_legal_name}

Hinweis: Information, keine Rechtsberatung i.S.d. RDG.`,
  },
  {
    id: "vertragsstrafe_geltend",
    title: "Vertragsstrafe geltend machen (Bauzeitüberschreitung)",
    category: "vertragsstrafe",
    description:
      "AG fordert Vertragsstrafe wegen Bauzeitüberschreitung — setzt voraus, dass die Vertragsstrafe wirksam vereinbart UND bei der Abnahme vorbehalten wurde (§ 11 Abs. 4 VOB/B).",
    legalBasis: "§ 11 VOB/B · BGH VII ZR 210/01 (Vorbehaltspflicht)",
    roles: ["bauherr", "ingenieurbuero"],
    body: `[Briefkopf · {ag_name}]

{an_name}
{an_address}

Per Einschreiben mit Rückschein

Betreff: Vertragsstrafe wegen Bauzeitüberschreitung · {bv_nummer} · {project_name}
Datum: {today}

Sehr geehrte Damen und Herren,

mit diesem Schreiben machen wir die im Bauvertrag vom {contract_date}
unter Ziff. {vs_klausel} vereinbarte Vertragsstrafe wegen Überschreitung
der Vertragsfristen geltend.

1. VERTRAGSFRIST
   Vertraglich geschuldeter Fertigstellungstermin: {soll_termin}
   Tatsächliche Fertigstellung / Abnahme: {ist_termin}
   Verzug in Werktagen: {verzug_werktage}

2. VERSCHULDEN
   Die Verzögerung ist von Ihnen zu vertreten:
   {verschulden_begruendung}

   Eine wirksame Behinderungsanzeige nach § 6 Abs. 1 VOB/B mit
   nachvollziehbarem Bezug zur konkreten Verzögerung liegt nicht vor.

3. BERECHNUNG VERTRAGSSTRAFE
   Tagessatz laut Vertrag: {tagessatz_eur} € je Werktag
   Anzahl Werktage Verzug: {verzug_werktage}
   Vertragsstrafe gesamt: {vs_gesamt_eur} €
   Begrenzt auf max. 5 % der Auftragssumme: {vs_max_eur} €
   Geltend gemachte Vertragsstrafe: {vs_gefordert_eur} €

4. VORBEHALT BEI ABNAHME
   Wir haben uns die Vertragsstrafe bei der Abnahme am {abnahme_date}
   ausdrücklich vorbehalten (siehe Abnahmeprotokoll Ziff. 5).
   Die Vorbehaltspflicht nach § 11 Abs. 4 VOB/B ist erfüllt.

5. AUFRECHNUNG
   Wir rechnen die Vertragsstrafe gegen Ihre offene Schlussrechnungs-Forderung
   in Höhe von {schlussrechnung_offen_eur} € auf. Der verbleibende Betrag
   beträgt: {nach_aufrechnung_eur} €.

6. ZAHLUNGSAUFFORDERUNG / EINBEHALT
   [ ] Wir behalten den Betrag von der Schlusszahlung ein.
   [ ] Wir fordern Sie auf, den Betrag binnen 14 Tagen zu zahlen.

WICHTIGER HINWEIS:
Die Geltendmachung einer Vertragsstrafe scheitert in der Praxis oft an der
fehlenden Vorbehaltserklärung bei der Abnahme oder an unwirksamen
AGB-Klauseln (BGH: max. 0,3 % je Werktag, max. 5 % insgesamt).
Vor Versand anwaltliche Prüfung empfohlen.

Mit freundlichen Grüßen

{author_name}
{author_role}
{ag_legal_name}

Hinweis: Information, keine Rechtsberatung i.S.d. RDG. **Diese Vorlage
ersetzt keine anwaltliche Prüfung.**`,
  },
  {
    id: "rechnungspruefung_kuerzen",
    title: "Rechnungsprüfung mit Kürzung (BL → AG → AN)",
    category: "schluss",
    description:
      "Bauleitung / PS prüft AN-Rechnung und teilt AG bzw. AN Kürzung formell mit. Stützt § 16 Abs. 3 VOB/B (prüfbare Rechnung) und Aufrechnung.",
    legalBasis: "§ 14 VOB/B · § 16 Abs. 3 VOB/B",
    roles: ["bauherr", "ingenieurbuero"],
    body: `[Briefkopf · {ag_name}]

{an_name}
{an_address}

Betreff: Rechnungsprüfung Schlussrechnung Nr. {invoice_no} · {bv_nummer}
Datum: {today}

Sehr geehrte Damen und Herren,

wir haben Ihre Schlussrechnung Nr. {invoice_no} vom {invoice_date} geprüft.

1. ÜBERPRÜFTE FORDERUNG
   Brutto-Endbetrag laut SR: {sr_brutto_eur} €
   Bisher erhaltene Abschlagszahlungen: {abschlag_eur} €
   Verbleibende Forderung laut SR: {rest_eur} €

2. KÜRZUNGEN NACH PRÜFUNG
   Pos. | Beschreibung der Kürzung | Betrag
   {kuerzung_pos_1} | {kuerzung_grund_1} | {kuerzung_eur_1} €
   {kuerzung_pos_2} | {kuerzung_grund_2} | {kuerzung_eur_2} €
   {kuerzung_pos_3} | {kuerzung_grund_3} | {kuerzung_eur_3} €

   Summe Kürzungen: {kuerzung_summe_eur} €

3. ANGEPASSTE FORDERUNG
   Geprüfter Brutto-Endbetrag: {geprueft_brutto_eur} €
   Restzahlung nach Prüfung: {geprueft_rest_eur} €

4. EINBEHALT GEWÄHRLEISTUNG
   Sicherheitseinbehalt für Mängelansprüche (§ 17 VOB/B): {gewaehrleistung_eur} €
   (5 % der Auftragssumme, ablösbar durch Bürgschaft)

5. ZAHLUNGSFREIGABE
   Wir geben den Betrag von {auszahlung_eur} € zur Zahlung frei.
   Zahlungsziel gemäß § 16 Abs. 5 VOB/B: 30 Tage nach Eingang dieser
   Schlussrechnung.

6. WIDERSPRUCHSFRIST
   Sollten Sie der Kürzung widersprechen, teilen Sie uns dies bitte binnen
   14 Tagen schriftlich mit. Andernfalls gehen wir von Akzeptanz aus
   (vgl. § 16 Abs. 3 Nr. 5 VOB/B Vorbehaltspflicht bei Schlusszahlung).

Mit freundlichen Grüßen

{author_name}
{author_role}
{ag_legal_name}

Hinweis: Information, keine Rechtsberatung i.S.d. RDG.`,
  },
];

export type ResolvedVariables = Record<string, string | number | null | undefined>;

export function fillTemplate(body: string, vars: ResolvedVariables): string {
  return body.replace(/\{([a-z_][a-z0-9_]*)\}/gi, (match, key: string) => {
    const value = vars[key];
    if (value === undefined || value === null || value === "") {
      return `[${key}]`;
    }
    return String(value);
  });
}

/**
 * Liefert eine Liste aller Platzhalter, die in einer Vorlage vorkommen.
 */
export function extractPlaceholders(body: string): string[] {
  const set = new Set<string>();
  const re = /\{([a-z_][a-z0-9_]*)\}/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) set.add(m[1]);
  return Array.from(set).sort();
}
