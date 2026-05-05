"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { useParams } from "next/navigation";
import { Languages } from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { setPreferredLocale } from "@/app/actions/preferred-locale";

/**
 * Sprach-Umschalter — schickt den Nutzer auf die gleiche Route in der
 * gewählten Sprache. Nutzt next-intl's typed router; das Locale wird via
 * URL-Prefix gesetzt (`/de/...` ↔ `/en/...`).
 */
export function LocaleSwitcher() {
  const locale = useLocale() as Locale;
  const t = useTranslations("localeSwitcher");
  const router = useRouter();
  const pathname = usePathname();
  // params: erlaubt es, dynamische Segmente beim Sprachwechsel zu erhalten
  const params = useParams();
  const [isPending, startTransition] = useTransition();

  function onChange(next: Locale) {
    if (next === locale) return;
    // Fire-and-forget: persistiert die Präferenz für eingeloggte User.
    // Schlägt fehl → fällt auf URL-Prefix + Cookie zurück (silent).
    void setPreferredLocale(next).catch(() => {});
    startTransition(() => {
      router.replace(
        // @ts-expect-error -- params shape matches dynamic-route segments at runtime
        { pathname, params },
        { locale: next }
      );
    });
  }

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-full border border-[color:var(--color-border)] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors",
        isPending && "opacity-60"
      )}
      role="group"
      aria-label={t("label")}
    >
      <span className="pl-2.5 pr-1 grid place-items-center" aria-hidden>
        <Languages size={14} />
      </span>
      {routing.locales.map((loc) => {
        const active = loc === locale;
        return (
          <button
            key={loc}
            type="button"
            onClick={() => onChange(loc)}
            aria-pressed={active}
            aria-label={t(`options.${loc}`)}
            disabled={isPending}
            className={cn(
              "font-mono text-[10px] uppercase tracking-[0.18em] px-2 py-1.5 first:rounded-l-full last:rounded-r-full transition-colors",
              active
                ? "text-[color:var(--color-fg)] font-semibold"
                : "hover:text-[color:var(--color-fg)]"
            )}
          >
            {loc}
          </button>
        );
      })}
    </div>
  );
}
