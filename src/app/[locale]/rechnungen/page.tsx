import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { RechnungListTable } from "@/components/rechnungen/RechnungListTable";
import { getProjects, getRechnungen } from "@/db/queries";

export async function generateMetadata() {
  const t = await getTranslations("modules.rechnungen");
  return { title: t("title") };
}

export const dynamic = "force-dynamic";

export default async function RechnungenListPage() {
  const [rechnungen, projects, t] = await Promise.all([
    getRechnungen({ limit: 200 }),
    getProjects(),
    getTranslations("modules.rechnungen"),
  ]);

  const totalAnomalies = rechnungen.reduce((s, r) => s + r.anomalyCount, 0);
  const highRisk = rechnungen.filter((r) => r.anomalyScore >= 60).length;
  const xmlCount = rechnungen.filter((r) => r.xmlFormat).length;
  const xmlInvalid = rechnungen.filter(
    (r) => r.xmlValidationStatus === "invalid"
  ).length;
  const xmlWarnings = rechnungen.filter(
    (r) => r.xmlValidationStatus === "warnings"
  ).length;

  return (
    <Container>
      <section className="pt-14 pb-8">
        <div className="flex items-start justify-between gap-6 flex-wrap mb-3">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
              {t("kicker", { count: rechnungen.length })}
            </p>
            <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
              {t("headline")}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-fg-muted)]">
              {t("summary", { anomalies: totalAnomalies, highRisk, xml: xmlCount })}
              {xmlInvalid > 0 ? t("summaryInvalid", { n: xmlInvalid }) : ""}
              {xmlWarnings > 0 ? t("summaryWarnings", { n: xmlWarnings }) : ""}
              {"."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/eingangsrechnungen/upload"
              className="inline-flex items-center gap-2 rounded-full border border-[color:var(--color-border)] px-4 py-2 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
            >
              {t("uploadXml")}
            </Link>
            <Link
              href="/rechnungen/new"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              {t("addPdf")} <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-16">
        <RechnungListTable
          rows={rechnungen}
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
