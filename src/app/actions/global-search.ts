/**
 * Backwards-Compat-Shim. Die kanonische Quelle liegt in
 * `src/lib/actions/global-search.ts`. Eine "use server"-Datei darf in
 * Next.js 16/Turbopack nur async-Funktionen exportieren (kein Re-Export-
 * Statement). Daher wird hier ein dünner Wrapper definiert.
 */
"use server";

import {
  globalSearch as globalSearchImpl,
  type GlobalSearchResult,
} from "@/lib/actions/global-search";

export async function globalSearch(query: string): Promise<GlobalSearchResult> {
  return globalSearchImpl(query);
}
