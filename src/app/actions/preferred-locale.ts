/**
 * "use server"-Shim für setPreferredLocale.
 * Kanonische Quelle: src/lib/actions/preferred-locale.ts.
 */
"use server";

import { setPreferredLocale as impl } from "@/lib/actions/preferred-locale";

export async function setPreferredLocale(locale: string): Promise<void> {
  return impl(locale);
}
