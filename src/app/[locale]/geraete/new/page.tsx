import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { GeraetForm } from "../geraet-form";
import { createGeraet } from "../actions";

export const dynamic = "force-dynamic";

export default function NewGeraetPage() {
  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Betriebsmittel
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          Neues Gerät
        </h1>
        <div className="mt-3">
          <Link
            href="/geraete"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zur Übersicht
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <GeraetForm mode="create" action={createGeraet} />
      </section>
    </Container>
  );
}
