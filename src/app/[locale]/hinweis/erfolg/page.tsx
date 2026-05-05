import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meldung übermittelt",
};

export default async function ErfolgPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) redirect("/hinweis");

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header className="border-b border-[color:var(--color-border)] py-6">
        <div className="max-w-3xl mx-auto px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-success)]">
            ✓ Meldung übermittelt
          </p>
          <p className="text-base font-semibold mt-1">
            Bitte bewahren Sie diesen Token auf
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tighter">
          Vielen Dank — Ihre Meldung ist eingegangen.
        </h1>
        <p className="mt-4 text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
          Die Eingangsbestätigung erfolgt innerhalb von 7 Tagen, die Rückmeldung
          über ergriffene Maßnahmen innerhalb von 3 Monaten (§ 17 II HinSchG).
        </p>

        <section className="mt-10 border border-[color:var(--color-warning-border)] bg-[color:var(--color-warning-soft)] rounded-md p-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-warning)]">
            Ihr persönlicher Zugangs-Token
          </p>
          <p className="mt-3 text-sm text-[color:var(--color-fg)]">
            Mit diesem Token können Sie jederzeit den <strong>Status</strong> Ihrer
            Meldung abrufen und <strong>Folge-Nachrichten</strong> mit der
            Meldestelle austauschen — auch anonym.
          </p>
          <div className="mt-4 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md p-4 break-all font-mono text-base text-[color:var(--color-fg)] select-all">
            {token}
          </div>
          <p className="mt-3 text-xs text-[color:var(--color-fg-muted)]">
            Wir können den Token nicht wiederherstellen, wenn er verloren geht
            — bitte ausdrucken oder sicher speichern.
          </p>
        </section>

        <section className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            href={`/hinweis/status?token=${encodeURIComponent(token)}`}
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            Status jetzt prüfen →
          </Link>
          <Link
            href="/hinweis"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            zur Startseite
          </Link>
        </section>
      </main>
    </div>
  );
}
