import { getTranslations } from "next-intl/server";
import { LegalPage, LegalSection } from "@/components/legal-page";
import { RDG_LONG_PARAGRAPHS } from "@/lib/legal/rdg";

export async function generateMetadata() {
  const t = await getTranslations("legal.rdg");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RdgHinweisPage() {
  const t = await getTranslations("legal.rdg");
  return (
    <LegalPage
      kicker="Rechtsdienstleistungsgesetz"
      title={t("title")}
      intro="Was LexBau leistet — und was nicht. Dieser Hinweis steht im Zusammenhang mit § 2 RDG."
    >
      <LegalSection title="Was LexBau ist">
        {RDG_LONG_PARAGRAPHS.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </LegalSection>

      <LegalSection title="Konkrete Folgen für die Nutzung">
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Jede generierte Mangelrüge, Behinderungsanzeige oder Vertragsantwort ist vor dem
            Versand vom Nutzer eigenverantwortlich zu prüfen.
          </li>
          <li>
            Frist-Berechnungen sind Hilfswerkzeuge. Maßgeblich bleibt der Vertrag bzw. das
            Gesetz; im Zweifel ist der Anwalt einzubeziehen.
          </li>
          <li>
            Risiko- und Vertragsscans heben Auffälligkeiten hervor, ersetzen aber keine
            anwaltliche Prüfung des Einzelfalls.
          </li>
          <li>
            Bei wirtschaftlich relevanten Streitwerten oder drohenden Klagen empfehlen wir die
            sofortige Einschaltung eines Rechtsanwalts.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Hausanwalt-Vermittlung">
        <p>
          Über die Hausanwalt-Karte in der Seitenleiste können Sie ohne Umweg einen Termin bei
          einem Anwalt aus unserem Netzwerk vereinbaren. Die Mandatsbeziehung entsteht
          ausschließlich zwischen Ihnen und dem Anwalt; LexBau ist nicht Vertragspartei.
        </p>
      </LegalSection>

      <LegalSection title="Zitatrecht und VOB-Volltexte">
        <p>
          BGB und HOAI sind amtliche Werke (§ 5 UrhG) und in dieser App im Volltext
          enthalten. Die <strong>VOB/B</strong> ist demgegenüber urheberrechtlich
          geschützt (DIN Media). LexBau hält daher nur eigene Zusammenfassungen
          (Paraphrasen) bereit und verlinkt für den Volltext zu Ihrem bevorzugten
          Anbieter (juris, DIN Media oder beck-online — einstellbar im Workspace).
        </p>
        <p>
          Wenn die KI in einer Antwort einen kurzen VOB-Auszug zitiert, geschieht
          dies im Rahmen des <strong>Zitatrechts nach § 51 UrhG</strong> — kurze
          Belege mit Quellenangabe in einem konkreten analytischen Zusammenhang sind
          nach ständiger BGH-Rechtsprechung auch ohne Lizenz zulässig. Die KI gibt
          niemals den vollständigen Wortlaut eines VOB-Paragraphen wieder.
        </p>
        <p>
          Sobald LexBau eine Plattform-Lizenz mit DIN Media oder einem Reseller
          abgeschlossen hat, werden VOB-Volltexte für Pro-Tier-Workspaces nativ in
          der App angezeigt — die rechtliche Grundlage und die Anzeige in dieser
          Erklärung wird in dem Fall entsprechend aktualisiert.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
