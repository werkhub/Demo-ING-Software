"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";
import { useHasConsent } from "./use-consent";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const hasConsent = useHasConsent();

  // Bis zur Cookie-Zustimmung kein localStorage-Schreibzugriff:
  // Wir rendern Children ohne next-themes — Server-Default (Light) bleibt aktiv.
  if (!hasConsent) {
    return <>{children}</>;
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
