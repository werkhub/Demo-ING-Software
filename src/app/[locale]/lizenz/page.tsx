import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Container } from "@/components/container";
import { StatCard, StatGrid } from "@/components/stat-card";
import { getCurrentWorkspace } from "@/lib/session";
import { formatDateShort, timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  solo: "Solo",
  team: "Team",
  business: "Business",
  enterprise: "Enterprise",
};

const TIER_DESCRIPTION: Record<string, string> = {
  solo: "Einzelplatz · alle Kernfunktionen · ohne Multi-User",
  team: "Mehrplatz · bis 10 Nutzer · alle Module",
  business: "Mehrplatz · DIN-Media-Volltexte (VOB) · Audit-Log",
  enterprise: "Vollausstattung · juris-Reseller · individuelle SLAs",
};

const VOB_PROVIDER_LABEL: Record<string, string> = {
  none: "Keine Lizenz · Paraphrase-Modus",
  din_media: "DIN Media · Plattformlizenz aktiv",
  juris: "juris · Reseller-Vertrag",
  beck_online: "beck-online · Reseller-Vertrag",
};

export default async function LizenzCenter() {
  const workspace = await getCurrentWorkspace();
  const [t, locale] = await Promise.all([
    getTranslations("modules.lizenz"),
    getLocale(),
  ]);

  const [users, licensedSources, accessLogCount] = await Promise.all([
    db
      .select({
        id: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        role: schema.users.role,
        roleLabel: schema.users.roleLabel,
        hasLicense: schema.users.hasLicense,
        status: schema.users.status,
        lastLoginAt: schema.users.lastLoginAt,
      })
      .from(schema.users)
      .where(eq(schema.users.workspaceId, workspace.id)),
    db.select().from(schema.licensedSources),
    db
      .select({ id: schema.licensedAccessLog.id })
      .from(schema.licensedAccessLog)
      .where(eq(schema.licensedAccessLog.workspaceId, workspace.id)),
  ]);

  const activeUsers = users.filter((u) => u.status === "active").length;
  const licenseUsers = users.filter((u) => u.hasLicense && u.status !== "inactive").length;
  const activeSources = licensedSources.filter((s) => s.status === "active");

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker", { name: workspace.name })}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("intro")}
        </p>
      </section>

      <section className="border-t border-[color:var(--color-border)] pt-8 pb-8">
        <StatGrid>
          <StatCard
            label={t("stats.activeTier")}
            value={TIER_LABEL[workspace.tier] ?? workspace.tier}
            tone="accent"
          />
          <StatCard label={t("stats.usersActive")} value={`${activeUsers}/${users.length}`} />
          <StatCard label={t("stats.platformLicenses")} value={activeSources.length} />
        </StatGrid>
      </section>

      <section className="grid gap-12 md:grid-cols-3 pb-12">
        <div className="md:col-span-2 space-y-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
              {t("sections.workspaceTier")}
            </p>
            <div className="border border-[color:var(--color-border)] rounded-md p-5 bg-[color:var(--color-bg-subtle)]">
              <p className="text-xl font-semibold tracking-tight">
                {TIER_LABEL[workspace.tier] ?? workspace.tier}
              </p>
              <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
                {TIER_DESCRIPTION[workspace.tier] ?? t("tierFallback")}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <FactInline label={t("facts.workspaceId")}>
                  <code className="font-mono text-xs">{workspace.id}</code>
                </FactInline>
                <FactInline label={t("facts.createdAt")}>
                  {formatDateShort(workspace.createdAt.toISOString(), locale)}
                </FactInline>
                <FactInline label={t("facts.usedLicenses")}>
                  {t("facts.usedLicensesValue", { used: licenseUsers, total: users.length })}
                </FactInline>
                <FactInline label={t("facts.vobLicense")}>
                  <span
                    className={
                      workspace.vobLicenseProvider === "none"
                        ? "text-[color:var(--color-fg-muted)]"
                        : "text-[color:var(--color-success)]"
                    }
                  >
                    {VOB_PROVIDER_LABEL[workspace.vobLicenseProvider]}
                  </span>
                </FactInline>
              </div>
            </div>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
              {t("sections.platformLicensesCount", { count: licensedSources.length })}
            </p>
            {licensedSources.length === 0 ? (
              <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-8 text-center">
                <p className="text-sm text-[color:var(--color-fg-muted)]">
                  {t("noPlatformLicense")}
                </p>
                <p className="mt-3 text-xs text-[color:var(--color-fg-muted)]">
                  {t.rich("noPlatformLicenseHint", {
                    code: (chunks) => (
                      <code className="font-mono">{chunks}</code>
                    ),
                  })}
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-[color:var(--color-border)] border-y border-[color:var(--color-border)]">
                {licensedSources.map((s) => (
                  <li key={s.id} className="py-4 flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <p className="text-sm font-medium">
                        {s.provider} · {s.product}
                      </p>
                      <p className="text-xs text-[color:var(--color-fg-muted)]">
                        {s.validFrom ? t("validFrom", { date: formatDateShort(s.validFrom, locale) }) : ""}
                        {s.validUntil ? t("validUntil", { date: formatDateShort(s.validUntil, locale) }) : ""}
                      </p>
                    </div>
                    <span
                      className={`font-mono text-[10px] uppercase tracking-[0.18em] border rounded-sm px-2 py-1 ${
                        s.status === "active"
                          ? "bg-[color:var(--color-success-soft)] text-[color:var(--color-success)] border-[color:var(--color-success-border)]"
                          : "bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] border-[color:var(--color-border)]"
                      }`}
                    >
                      {s.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
              {t("sections.external")}
            </p>
            <ul className="space-y-3">
              <ExternalCheck
                title={t("external_.vobTitle")}
                value={
                  workspace.vobPreferredExternalProvider === "all"
                    ? t("external_.vobAll")
                    : t("external_.vobPreferred", { provider: workspace.vobPreferredExternalProvider })
                }
                href="/workspace#vob"
                actionLabel={t("external_.vobAction")}
              />
              <ExternalCheck
                title={t("external_.anthropicTitle")}
                value={t("external_.anthropicValue")}
                href="https://www.anthropic.com/legal/dpa"
                actionLabel={t("external_.anthropicAction")}
                external
              />
              <ExternalCheck
                title={t("external_.hostingTitle")}
                value={t("external_.hostingValue")}
                href="https://www.hetzner.com/de/legal/data-privacy"
                actionLabel={t("external_.hostingAction")}
                external
              />
            </ul>
          </div>
        </div>

        <div className="md:col-span-1 space-y-10">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
              {t("sections.users")}
            </p>
            <ul className="space-y-2">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="border-l-2 border-[color:var(--color-border)] pl-3"
                >
                  <p className="text-sm font-medium">{u.name}</p>
                  <p className="text-xs text-[color:var(--color-fg-muted)] font-mono">
                    {u.email}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
                    {u.role}
                    {u.hasLicense ? ` · ${t("users_.withLicense")}` : ` · ${t("users_.noLicense")}`}
                    {u.lastLoginAt
                      ? ` · ${t("users_.lastLogin", { ago: timeAgo(u.lastLoginAt, locale) })}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
            <Link
              href="/workspace"
              className="mt-4 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
            >
              {t("users_.manageLink")}
            </Link>
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-4">
              {t("sections.compliance")}
            </p>
            <ul className="space-y-2 text-sm text-[color:var(--color-fg-muted)]">
              <li>
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg)]">
                  {t("compliance_.auditEntries")}
                </span>{" "}
                · {accessLogCount.length}
              </li>
              <li>
                {t("compliance_.auditNote")}
              </li>
            </ul>
          </div>
        </div>
      </section>
    </Container>
  );
}

function FactInline({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-xs border-b border-[color:var(--color-border)] pb-1">
      <span className="text-[color:var(--color-fg-muted)] font-mono uppercase tracking-[0.18em] text-[10px]">
        {label}
      </span>
      <span className="text-[color:var(--color-fg)] text-right">{children}</span>
    </div>
  );
}

function ExternalCheck({
  title,
  value,
  href,
  actionLabel,
  external,
}: {
  title: string;
  value: string;
  href: string;
  actionLabel: string;
  external?: boolean;
}) {
  return (
    <li className="border border-[color:var(--color-border)] rounded-md p-4 bg-[color:var(--color-bg)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        {title}
      </p>
      <p className="mt-1 text-sm text-[color:var(--color-fg)]">{value}</p>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
        >
          {actionLabel} ↗
        </a>
      ) : (
        <Link
          href={href}
          className="mt-2 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
        >
          {actionLabel} →
        </Link>
      )}
    </li>
  );
}
