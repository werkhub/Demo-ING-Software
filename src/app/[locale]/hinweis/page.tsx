import { Link } from "@/i18n/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hinweisgeberstelle",
  description:
    "Vertrauliche Meldung von Missständen — anonym oder mit Kontakt, nach HinSchG.",
};

async function findActiveWorkspaces() {
  return db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
    })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.hinschgEnabled, true));
}

export default async function HinweisLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>;
}) {
  const { ws } = await searchParams;
  const active = await findActiveWorkspaces();

  // Wenn ws gesetzt + aktiv → direkt anbieten. Sonst Liste / Hinweis.
  const selected = ws ? active.find((w) => w.id === ws) : null;
  const showList = !selected && active.length > 1;
  const single = !selected && active.length === 1 ? active[0] : null;
  const targetWorkspace = selected ?? single;

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header className="border-b border-[color:var(--color-border)] py-6">
        <div className="max-w-3xl mx-auto px-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
              Hinweisgeberstelle
            </p>
            <p className="text-base font-semibold">Vertrauliche Meldung</p>
          </div>
          <Link
            href="/hinweis/status"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors"
          >
            Status mit Token abrufen →
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
          Sie wollen einen Missstand melden?
        </h1>
        <p className="mt-4 text-base text-[color:var(--color-fg-muted)] leading-relaxed">
          Diese Meldestelle ist eine interne Stelle nach §§ 12 ff. des
          Hinweisgeberschutzgesetzes (HinSchG). Sie können <strong>anonym</strong> oder
          mit Kontaktangabe melden. Ihre Identität wird vertraulich behandelt;
          Repressalien sind nach § 36 HinSchG verboten.
        </p>

        <section className="mt-10 grid gap-6 md:grid-cols-3">
          <Card
            num="1"
            title="Anonym oder mit Kontakt"
            body="Sie entscheiden, ob Sie sich zu erkennen geben. Bei Anonymität speichern wir keine Identifikationsdaten."
          />
          <Card
            num="2"
            title="Token zur Wieder­anmeldung"
            body="Nach dem Absenden erhalten Sie einen einmaligen Zugriffs-Code. Damit können Sie jederzeit den Status prüfen oder nachfragen."
          />
          <Card
            num="3"
            title="Gesetzliche Fristen"
            body="Eingangsbestätigung binnen 7 Tagen, Rückmeldung über Maßnahmen binnen 3 Monaten — § 17 HinSchG."
          />
        </section>

        <section className="mt-12 border-t border-[color:var(--color-border)] pt-8">
          {showList ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
                Bitte Meldestelle wählen
              </p>
              <ul className="space-y-2">
                {active.map((w) => (
                  <li key={w.id}>
                    <Link
                      href={`/hinweis/neu?ws=${w.id}`}
                      className="block border border-[color:var(--color-border)] rounded-md p-4 hover:border-[color:var(--color-accent)] transition-colors"
                    >
                      <p className="font-medium">{w.name}</p>
                      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                        Meldung an die interne Meldestelle
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          ) : targetWorkspace ? (
            <div className="flex flex-col items-start gap-4">
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                Meldung an: <strong className="text-[color:var(--color-fg)]">
                  {targetWorkspace.name}
                </strong>
              </p>
              <Link
                href={`/hinweis/neu?ws=${targetWorkspace.id}`}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-6 py-3 text-base text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                Meldung jetzt einreichen →
              </Link>
            </div>
          ) : (
            <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center">
              <p className="text-sm text-[color:var(--color-fg-muted)]">
                Aktuell ist keine Meldestelle aktiv.
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-fg-muted)]">
                Bitte wenden Sie sich direkt an Ihren Arbeitgeber oder an eine
                externe Meldestelle (z. B. BfJ Online-Meldestelle).
              </p>
            </div>
          )}
        </section>

        <section className="mt-12 border-t border-[color:var(--color-border)] pt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-2">
            Datenschutz · § 8 HinSchG
          </p>
          <p className="text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
            Wir speichern keine IP-Adressen und setzen für diese Seite keine
            Tracking-Cookies. Ihre Meldung wird verschlüsselt übertragen und
            nur Personen zugänglich gemacht, die nach § 15 HinSchG zur
            Bearbeitung berechtigt sind.
          </p>
        </section>
      </main>
    </div>
  );
}

function Card({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)]">
        Schritt {num}
      </div>
      <p className="mt-2 text-sm font-semibold text-[color:var(--color-fg)]">
        {title}
      </p>
      <p className="mt-1 text-xs text-[color:var(--color-fg-muted)] leading-relaxed">
        {body}
      </p>
    </div>
  );
}
