import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { VorgangCreateDropzone } from "@/components/vorgang/VorgangCreateDropzone";
import { getProjects } from "@/db/queries";

export async function generateMetadata() {
  const t = await getTranslations("modules.vorgaenge.create");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function VorgangNewPage() {
  const [projects, t] = await Promise.all([
    getProjects(),
    getTranslations("modules.vorgaenge.create"),
  ]);

  return (
    <Container>
      <section className="pt-14 pb-8">
        <Link
          href="/vorgaenge"
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          {t("backLink")}
        </Link>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tighter">
          {t("headline")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-[color:var(--color-fg-muted)] leading-relaxed">
          {t("intro")}
        </p>
      </section>
      <section className="pb-16">
        <VorgangCreateDropzone
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
