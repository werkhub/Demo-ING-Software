import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { RechnungUploadDropzone } from "@/components/rechnungen/RechnungUploadDropzone";
import { getProjects } from "@/db/queries";

export const metadata = { title: "Rechnung hochladen" };

export const dynamic = "force-dynamic";

export default async function RechnungNewPage() {
  const projects = await getProjects();
  return (
    <Container>
      <section className="pt-14 pb-8">
        <Link
          href="/rechnungen"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Alle Rechnungen
        </Link>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
          Eingangsrechnung erfassen
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
          Lade eine PDF, ZUGFeRD-XML oder XRechnung hoch. Positionen erfasst du nach
          der Anlage. Die Anomalie-Engine prüft Mathematik, Vorrechnungs-Preise und
          Hauptvertrag-Bezug.
        </p>
      </section>
      <section className="pb-16">
        <RechnungUploadDropzone
          projects={projects.map((p) => ({
            id: p.id,
            identifier: p.identifier,
            name: p.name,
          }))}
        />
      </section>
    </Container>
  );
}
