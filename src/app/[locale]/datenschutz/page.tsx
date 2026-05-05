import { getTranslations } from "next-intl/server";
import { LegalPage, LegalSection, LegalNote } from "@/components/legal-page";
import { OPERATOR, HOSTING, SUBPROCESSORS } from "@/lib/legal/contact";

export async function generateMetadata() {
  const t = await getTranslations("legal.datenschutz");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function DatenschutzPage() {
  const t = await getTranslations("legal.datenschutz");
  return (
    <LegalPage
      kicker="DSGVO Art. 13 / 14"
      title={t("title")}
      intro="Wir verarbeiten personenbezogene Daten ausschließlich nach den Vorgaben der DSGVO und des BDSG. Diese Erklärung beschreibt, welche Daten wir warum und wie lange speichern."
    >
      <LegalNote>
        Mustertext zur Befüllung. Vor Produktivstart durch Datenschutzbeauftragten oder
        Fachanwalt prüfen lassen — insbesondere Speicherdauern, Rechtsgrundlagen und
        Auftragsverarbeitungsverträge (Hetzner, Anthropic).
      </LegalNote>

      <LegalSection title="1. Verantwortlicher">
        <p>
          {OPERATOR.legalName}
          <br />
          {OPERATOR.street}, {OPERATOR.zip} {OPERATOR.city}
          <br />
          E-Mail: {OPERATOR.email}
          <br />
          Telefon: {OPERATOR.phone}
        </p>
      </LegalSection>

      <LegalSection title="2. Datenschutzbeauftragter">
        <p>
          {OPERATOR.dpoName}
          <br />
          E-Mail: {OPERATOR.dpoEmail}
        </p>
      </LegalSection>

      <LegalSection title="3. Zwecke und Rechtsgrundlagen der Verarbeitung">
        <p>
          Wir verarbeiten personenbezogene Daten zur Bereitstellung der Plattform LexBau
          (Vertragserfüllung, Art. 6 Abs. 1 lit. b DSGVO) sowie zur Wahrung berechtigter
          Interessen am sicheren und stabilen Betrieb (Art. 6 Abs. 1 lit. f DSGVO).
        </p>
        <p>Konkret werden folgende Daten verarbeitet:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Name und E-Mail-Adresse zur Anmeldung und Workspace-Zuordnung.</li>
          <li>
            Projektdaten (Bauvorhaben, Auftraggeber, Volumen, Termine) zur Nutzung der
            Fachfunktionen.
          </li>
          <li>
            Bautagebuch-Einträge inklusive Autorenname zur lückenlosen Dokumentation —
            erforderliche Beweissicherung im Bauablauf.
          </li>
          <li>
            Eingaben an den Recht-Assistent, soweit Sie diese aktiv abschicken, zur Lieferung
            der Antwort und zur Qualitätssicherung.
          </li>
          <li>Server-Logfiles (IP-Adresse, Zeitstempel) zur Abwehr von Missbrauch.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Speicherdauer">
        <p>
          Konto- und Projektdaten werden bis zur Beendigung des Vertrags und einer
          anschließenden gesetzlichen Aufbewahrungsfrist (in der Regel zehn Jahre nach § 257
          HGB / § 147 AO) gespeichert. Bautagebuch-Einträge bleiben über die
          Gewährleistungsfrist hinaus archiviert, da sie als Beweismittel dienen können.
          Server-Logfiles werden nach 14 Tagen gelöscht.
        </p>
      </LegalSection>

      <LegalSection title="5. Empfänger und Auftragsverarbeiter">
        <p>
          Wir nutzen folgende Auftragsverarbeiter im Sinne von Art. 28 DSGVO. Mit jedem ist ein
          Auftragsverarbeitungsvertrag (AVV) abgeschlossen.
        </p>
        <ul className="list-disc pl-5 space-y-2">
          {SUBPROCESSORS.map((sp) => (
            <li key={sp.name}>
              <strong>{sp.name}</strong> · {sp.purpose} · Standort: {sp.location} · AVV:{" "}
              <a
                href={sp.avv}
                className="underline text-[color:var(--color-accent)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                {sp.avv}
              </a>
            </li>
          ))}
        </ul>
        <p>
          Hosting erfolgt bei {HOSTING.provider} in {HOSTING.location}. Eine Übermittlung in
          Drittländer findet nur statt, wenn ein angemessenes Datenschutzniveau nach Art. 44 ff.
          DSGVO sichergestellt ist (insbesondere durch Standardvertragsklauseln).
        </p>
      </LegalSection>

      <LegalSection title="6. KI-Antworten und Datenminimierung">
        <p>
          Eingaben in den Recht-Assistenten werden zur Generierung der Antwort an die
          Claude-API der Anthropic PBC übermittelt. Anthropic verarbeitet diese Daten ausschließlich
          weisungsgebunden im Rahmen des AVV und nutzt sie nicht für Modelltraining.
        </p>
        <p>
          Bitte geben Sie keine Klarnamen Dritter, keine Sozialversicherungsnummern oder
          Kontodaten in die Anfragen ein. LexBau warnt Sie vor dem Absenden, wenn solche Muster
          erkannt werden.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies und lokale Speicherung">
        <p>
          Wir setzen ausschließlich technisch notwendige Cookies und nutzen den Local Storage
          Ihres Browsers zur Speicherung Ihrer Theme-Wahl (Hell/Dunkel) und der Bestätigung
          rechtlicher Hinweise. Marketing- oder Tracking-Cookies werden nicht eingesetzt.
        </p>
      </LegalSection>

      <LegalSection title="8. Ihre Rechte">
        <p>Ihnen stehen folgende Rechte zu:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Auskunft über die zu Ihrer Person gespeicherten Daten (Art. 15 DSGVO),</li>
          <li>Berichtigung unrichtiger Daten (Art. 16 DSGVO),</li>
          <li>Löschung (Art. 17 DSGVO) und Einschränkung der Verarbeitung (Art. 18 DSGVO),</li>
          <li>Datenübertragbarkeit (Art. 20 DSGVO),</li>
          <li>Widerspruch gegen die Verarbeitung (Art. 21 DSGVO),</li>
          <li>
            Beschwerde bei einer Aufsichtsbehörde (Art. 77 DSGVO). Zuständig ist die{" "}
            {OPERATOR.supervisoryAuthority}.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="9. Änderungen dieser Erklärung">
        <p>
          Wir passen diese Erklärung an, wenn sich Funktionen oder Auftragsverarbeiter ändern.
          Die jeweils aktuelle Fassung ist auf dieser Seite abrufbar.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
