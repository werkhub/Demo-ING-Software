import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { NewProjectForm } from "./new-project-form";

export default function NewProjectPage() {
  return (
    <Container size="narrow">
      <div className="pt-14 pb-16">
        <Link
          href="/projekte"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Zurück zur Projektliste
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Bauvorhaben anlegen
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          Neues Projekt
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          Wird in der lokalen SQLite-Datenbank gespeichert und ist nach Reload weiterhin verfügbar.
        </p>

        <NewProjectForm />
      </div>
    </Container>
  );
}
