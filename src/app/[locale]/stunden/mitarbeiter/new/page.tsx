import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { MitarbeiterForm } from "../mitarbeiter-form";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ error?: string }>;

export default async function NewMitarbeiterPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Stunden · Mitarbeiter · Anlegen
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Neuer Mitarbeiter
        </h1>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}

      <MitarbeiterForm mode="new" />

      <p className="mt-6 text-xs text-[color:var(--color-fg-muted)]">
        <Link
          href="/stunden/mitarbeiter"
          className="hover:text-[color:var(--color-accent)]"
        >
          ← Zurück zur Liste
        </Link>
      </p>
    </Container>
  );
}
