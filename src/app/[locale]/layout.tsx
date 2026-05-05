import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { eq } from "drizzle-orm";
import "../globals.css";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { ThemeProvider } from "@/components/theme-provider";
import { Sidebar } from "@/components/sidebar";
import { SidebarProvider } from "@/components/sidebar-context";
import { Header } from "@/components/header";
import { LegalFooter } from "@/components/legal-footer";
import { CookieBanner } from "@/components/cookie-banner";
import { ToastProvider } from "@/components/ui/toast";
import { UserMenu } from "@/components/user-menu";
import { NAV } from "@/lib/data";
import { buildNavForRole, ROLE_META } from "@/lib/roles";
import { parseDisciplines } from "@/lib/workspace/disciplines";
import { getSamplePrompts } from "@/lib/ki-assistent/sample-prompts";
import { KiAssistantMount } from "@/components/ki-assistant-mount";
import { routing } from "@/i18n/routing";
import type { ClientFocus, WorkspaceRole } from "@/db/schema";

// Lokale Font-Files via geist-Package (kein Google-Fonts-Network-Hit beim Build).
// `variable` ist im Package gesetzt: --font-geist-sans bzw. --font-geist-mono.

export const metadata: Metadata = {
  title: {
    default: "LexBau — Operatives Risikobetriebssystem für Bauprojekte",
    template: "%s | LexBau",
  },
  description:
    "LexBau ist das operative Risikobetriebssystem für Bauprojekte — operative Workflows mit eingebetteter juristischer Intelligenz für Bauunternehmen, Ingenieurbüros, Projektsteuerung und Bauleitung im DACH-Raum.",
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  const session = await auth();
  let workspaceLabel: string | undefined;
  let workspaceRole: WorkspaceRole = "bauunternehmer";
  let hinschgEnabled = false;
  let isAdmin = false;
  let disciplinesJson: string | null = null;
  let clientFocus: ClientFocus | undefined;
  let companySize: number | null = null;
  let firstActiveProjectName: string | null = null;
  if (session?.user?.workspaceId) {
    const [ws] = await db
      .select({
        name: schema.workspaces.name,
        workspaceRole: schema.workspaces.workspaceRole,
        hinschgEnabled: schema.workspaces.hinschgEnabled,
        disciplinesJson: schema.workspaces.disciplinesJson,
        clientFocus: schema.workspaces.clientFocus,
        companySize: schema.workspaces.companySize,
      })
      .from(schema.workspaces)
      .where(eq(schema.workspaces.id, session.user.workspaceId))
      .limit(1);
    workspaceLabel = ws?.name;
    workspaceRole = ws?.workspaceRole ?? "bauunternehmer";
    hinschgEnabled = ws?.hinschgEnabled ?? false;
    disciplinesJson = ws?.disciplinesJson ?? null;
    clientFocus = ws?.clientFocus;
    companySize = ws?.companySize ?? null;

    // Erstes aktives Projekt für Sample-Prompt-Vorbelegung — billiger
    // Single-Row-Query, kein Stats-Overhead.
    const [firstProject] = await db
      .select({ name: schema.projects.name })
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, session.user.workspaceId))
      .limit(1);
    firstActiveProjectName = firstProject?.name ?? null;
  }
  if (session?.user?.id) {
    const [u] = await db
      .select({ role: schema.users.role })
      .from(schema.users)
      .where(eq(schema.users.id, session.user.id))
      .limit(1);
    isAdmin = u?.role === "admin";
  }
  const nav = buildNavForRole(NAV, workspaceRole, {
    isAdmin,
    workspaceFlags: { hinschgEnabled },
    disciplines: parseDisciplines(disciplinesJson),
    clientFocus,
    companySize,
  });
  // Locale-aware Nav: Section-Titel + Item-Labels aus Messages.
  // Rollen-Overrides (z.B. "Bautagebuch (LP8)") bleiben Phase-1-mäßig nur für DE
  // erhalten — Phase 2 zieht sie in role-spezifische Messages.
  const tNav = await getTranslations({ locale, namespace: "nav" });
  const localizedNav = nav.map((section) => ({
    ...section,
    title: tNav(`sections.${section.slug}`),
    items: section.items.map((item) =>
      locale === "de"
        ? item
        : { ...item, label: tNav(`items.${item.id}`) }
    ),
  }));
  const roleMeta = ROLE_META[workspaceRole];
  const userMenu = session?.user?.email ? (
    <UserMenu
      name={session.user.name ?? session.user.email}
      email={session.user.email}
      workspaceLabel={workspaceLabel}
    />
  ) : null;

  return (
    <html
      lang={locale}
      className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full font-sans">
        <NextIntlClientProvider>
          <ThemeProvider>
            <ToastProvider>
              <SidebarProvider>
                <div className="flex min-h-screen">
                  <Sidebar
                    workspaceName={workspaceLabel}
                    nav={localizedNav}
                    roleShortLabel={roleMeta.shortLabel}
                    roleLabel={roleMeta.label}
                  />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <Header userMenu={userMenu} />
                    <main className="flex-1">{children}</main>
                    <LegalFooter />
                  </div>
                </div>
                {session?.user?.workspaceId ? (
                  <KiAssistantMount
                    projectNameForPrompts={firstActiveProjectName}
                    samplePrompts={getSamplePrompts(
                      workspaceRole,
                      locale === "en" ? "en" : "de"
                    )}
                    locale={locale === "en" ? "en" : "de"}
                  />
                ) : null}
                <CookieBanner />
              </SidebarProvider>
            </ToastProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
