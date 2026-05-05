import { getTranslations } from "next-intl/server";
import { LegalPage, LegalSection, LegalNote } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal/contact";

export async function generateMetadata() {
  const t = await getTranslations("legal.agb");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function AgbPage() {
  const t = await getTranslations("legal.agb");
  return (
    <LegalPage
      kicker="Nutzungsbedingungen"
      title={t("title")}
      intro="Die folgenden Bedingungen regeln die Nutzung der Plattform LexBau zwischen dem Anbieter und dem Nutzer."
    >
      <LegalNote>
        Mustertext. Vor Verwendung vom Anwalt prüfen lassen. Insbesondere
        Haftungsbegrenzungen, Gewährleistung und AGB-Recht (§§ 305 ff. BGB) sind im Einzelfall
        zu prüfen.
      </LegalNote>

      <LegalSection title="§ 1 Geltungsbereich">
        <p>
          Diese AGB gelten für die Nutzung der Plattform LexBau zwischen {OPERATOR.legalName}
          {" "}(„Anbieter“) und dem registrierten Nutzer („Nutzer“). Abweichende Bedingungen
          des Nutzers werden nicht anerkannt, soweit der Anbieter ihrer Geltung nicht
          ausdrücklich schriftlich zustimmt.
        </p>
      </LegalSection>

      <LegalSection title="§ 2 Vertragsgegenstand">
        <p>
          LexBau ist eine Software-as-a-Service-Plattform zur Information, Dokumentation und
          Vorbereitung von baurechtlichen Vorgängen. Sie liefert paraphrasierte Zusammenfassungen
          von Gesetzestexten (BGB, HOAI, VOB/B), Vorlagen, Bautagebuch-Funktionen,
          KI-gestützte Antworten zu typischen Fragestellungen sowie Frist- und
          Vertragsanalysen.
        </p>
        <p>
          LexBau ersetzt keine anwaltliche Rechtsberatung. Hinweise hierzu finden sich in
          unserem RDG-Hinweis.
        </p>
      </LegalSection>

      <LegalSection title="§ 3 Registrierung und Workspace">
        <p>
          Die Nutzung setzt eine Registrierung mit gültiger E-Mail-Adresse und einen aktiven
          Workspace voraus. Der Nutzer ist verpflichtet, seine Zugangsdaten geheim zu halten
          und Verstöße gegen die Vertraulichkeit unverzüglich anzuzeigen.
        </p>
      </LegalSection>

      <LegalSection title="§ 4 Pflichten des Nutzers">
        <ul className="list-disc pl-5 space-y-1">
          <li>Wahrheitsgemäße Angaben bei Registrierung und Pflege seines Workspace.</li>
          <li>
            Eigenverantwortliche Prüfung aller von LexBau generierten Inhalte vor jeder
            Außenwirkung (E-Mail an Vertragspartner, Schriftsätze, Behörden).
          </li>
          <li>
            Keine Eingabe sensibler Daten Dritter (z. B. Sozialversicherungsnummern,
            Bankverbindungen) in den Recht-Assistenten.
          </li>
          <li>Keine missbräuchliche Nutzung, kein Reverse Engineering der Plattform.</li>
        </ul>
      </LegalSection>

      <LegalSection title="§ 5 Verfügbarkeit">
        <p>
          Der Anbieter strebt eine Verfügbarkeit von 99 % im Jahresmittel an. Wartungsarbeiten
          werden nach Möglichkeit außerhalb der Geschäftszeiten durchgeführt. Eine darüber
          hinausgehende Verfügbarkeit wird nicht zugesichert.
        </p>
      </LegalSection>

      <LegalSection title="§ 6 Haftung und Haftungsausschluss bei KI-Inhalten">
        <p>
          Die von LexBau gelieferten Antworten, Vorlagen, Frist- und Vertragsanalysen sind
          Informationen, keine Rechtsberatung. Der Anbieter übernimmt keine Gewähr für
          Vollständigkeit, Richtigkeit oder rechtliche Eignung im Einzelfall. Insbesondere
          automatisierte Frist- und Risikoberechnungen ersetzen nicht die anwaltliche Prüfung.
        </p>
        <p>
          Der Anbieter haftet nur für Vorsatz und grobe Fahrlässigkeit sowie für die
          Verletzung wesentlicher Vertragspflichten (Kardinalpflichten). Bei einfacher
          Fahrlässigkeit ist die Haftung auf den vertragstypischen, vorhersehbaren Schaden
          begrenzt. Die Haftung nach dem Produkthaftungsgesetz und für die Verletzung von
          Leben, Körper oder Gesundheit bleibt unberührt.
        </p>
      </LegalSection>

      <LegalSection title="§ 7 Vergütung und Laufzeit">
        <p>
          Vergütung und Laufzeit ergeben sich aus dem jeweils gewählten Tarif. Die ordentliche
          Kündigungsfrist beträgt einen Monat zum Ende der Vertragslaufzeit. Das Recht zur
          außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt.
        </p>
      </LegalSection>

      <LegalSection title="§ 8 Datenschutz">
        <p>
          Die Verarbeitung personenbezogener Daten erfolgt nach Maßgabe der{" "}
          <a href="/datenschutz" className="underline text-[color:var(--color-accent)]">
            Datenschutzerklärung
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="§ 9 Schlussbestimmungen">
        <p>
          Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist —
          soweit gesetzlich zulässig — der Sitz des Anbieters. Sollte eine Bestimmung dieser
          AGB unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
