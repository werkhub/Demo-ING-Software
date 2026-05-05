import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Container } from "@/components/container";
import { LogoMark } from "@/components/logo-mark";
import { Link } from "@/i18n/navigation";
import { LoginForm } from "./login-form";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "modules.login" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (session?.user) {
    const sp = await searchParams;
    redirect(sp.callbackUrl ?? "/");
  }

  const t = await getTranslations({ locale, namespace: "modules.login" });
  const tSidebar = await getTranslations({ locale, namespace: "sidebar" });

  return (
    <Container size="narrow">
      <div className="pt-20 pb-16 max-w-md mx-auto">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <LogoMark className="text-[color:var(--color-accent)] transition-transform group-hover:rotate-3" />
          <div>
            <div className="text-[15px] font-semibold tracking-tight text-[color:var(--color-fg)] leading-none">
              LexBau
            </div>
            <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] mt-1">
              {tSidebar("tagline")}
            </div>
          </div>
        </Link>

        <p className="mt-12 font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          {t("welcome")}
        </h1>
        <p className="mt-3 text-base text-[color:var(--color-fg-muted)]">
          {t("emailIntro")}
        </p>

        <LoginForm />
      </div>
    </Container>
  );
}
