import { getTranslations } from "next-intl/server";
import { LegalPage, LegalSection, LegalNote } from "@/components/legal-page";
import { OPERATOR } from "@/lib/legal/contact";

export async function generateMetadata() {
  const t = await getTranslations("legal.impressum");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ImpressumPage() {
  const t = await getTranslations("legal.impressum");
  return (
    <LegalPage
      kicker="Pflichtangaben"
      title={t("title")}
      intro={t("description")}
    >
      <LegalNote>
        Vor Veröffentlichung: alle mit <span className="font-mono">TODO</span> markierten Felder
        durch die tatsächlichen Angaben des Betreibers ersetzen und juristisch prüfen lassen.
      </LegalNote>

      <LegalSection title="Anbieter">
        <p>
          {OPERATOR.legalName}
          <br />
          {OPERATOR.street}
          <br />
          {OPERATOR.zip} {OPERATOR.city}
          <br />
          {OPERATOR.country}
        </p>
      </LegalSection>

      <LegalSection title="Vertretungsberechtigt">
        <p>{OPERATOR.represented}</p>
      </LegalSection>

      <LegalSection title="Kontakt">
        <p>
          E-Mail: {OPERATOR.email}
          <br />
          Telefon: {OPERATOR.phone}
        </p>
      </LegalSection>

      <LegalSection title="Registereintrag">
        <p>
          {OPERATOR.registerCourt}
          <br />
          {OPERATOR.registerNumber}
        </p>
      </LegalSection>

      <LegalSection title="Umsatzsteuer-Identifikationsnummer">
        <p>{OPERATOR.vatId}</p>
      </LegalSection>

      <LegalSection title="Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV">
        <p>
          {OPERATOR.represented}
          <br />
          {OPERATOR.street}
          <br />
          {OPERATOR.zip} {OPERATOR.city}
        </p>
      </LegalSection>

      <LegalSection title="EU-Streitschlichtung">
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{" "}
          <a
            href="https://ec.europa.eu/consumers/odr/"
            className="underline text-[color:var(--color-accent)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            https://ec.europa.eu/consumers/odr/
          </a>
          .
        </p>
        <p>
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
          Verbraucherschlichtungsstelle teilzunehmen.
        </p>
      </LegalSection>

      <LegalSection title="Haftung für Inhalte">
        <p>
          Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf diesen Seiten
          nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 DDG sind wir als
          Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde
          Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige
          Tätigkeit hinweisen. Bei Bekanntwerden von Rechtsverletzungen werden wir die betreffenden
          Inhalte umgehend entfernen.
        </p>
      </LegalSection>

      <LegalSection title="Haftung für Links">
        <p>
          Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen
          Einfluss haben. Für diese fremden Inhalte ist stets der jeweilige Anbieter oder
          Betreiber verantwortlich. Bei Bekanntwerden von Rechtsverletzungen werden derartige Links
          umgehend entfernt.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
