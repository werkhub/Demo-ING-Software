/**
 * Backwards-Compat-Shim. Die kanonische Quelle liegt in
 * `src/lib/actions/vorgaenge-new.ts`. Eine "use server"-Datei darf in
 * Next.js 16/Turbopack nur async-Funktionen exportieren (kein
 * Re-Export-Statement). Daher ein dünner Wrapper.
 */
"use server";

import { createVorgangFromUpload as createVorgangFromUploadImpl } from "@/lib/actions/vorgaenge-new";

export async function createVorgangFromUpload(formData: FormData): Promise<void> {
  return createVorgangFromUploadImpl(formData);
}
