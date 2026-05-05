import { getTranslations } from "next-intl/server";
import { Container } from "@/components/container";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("errors.notFound");
  return (
    <Container size="narrow">
      <section className="pt-24 pb-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("description")}
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
          >
            {t("backHome")}
          </Link>
          <Link
            href="/projekte"
            className="text-sm text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-4 py-2.5 transition-colors"
          >
            {t("viewProjects")}
          </Link>
        </div>
      </section>
    </Container>
  );
}
