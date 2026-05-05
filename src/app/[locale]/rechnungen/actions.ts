/**
 * Backwards-Compat-Shim. Die kanonische Quelle liegt in
 * `src/lib/actions/rechnungen.ts`. Eine "use server"-Datei darf in
 * Next.js 16/Turbopack nur async-Funktionen exportieren (kein
 * Re-Export-Statement). Daher dünne Wrapper.
 */
"use server";

import type { ActionResult } from "@/lib/action-result";
import {
  createRechnungWithUpload as createRechnungWithUploadImpl,
  updateRechnungStatus as updateRechnungStatusImpl,
  deleteRechnung as deleteRechnungImpl,
  addRechnungPosition as addRechnungPositionImpl,
  deleteRechnungPosition as deleteRechnungPositionImpl,
  runAnomalieEngine as runAnomalieEngineImpl,
  escalateRechnungToVorgang as escalateRechnungToVorgangImpl,
  registerBauabzugAbfuehrung as registerBauabzugAbfuehrungImpl,
} from "@/lib/actions/rechnungen";

export async function createRechnungWithUpload(formData: FormData): Promise<void> {
  return createRechnungWithUploadImpl(formData);
}

export async function updateRechnungStatus(formData: FormData): Promise<void> {
  return updateRechnungStatusImpl(formData);
}

export async function deleteRechnung(formData: FormData): Promise<void> {
  return deleteRechnungImpl(formData);
}

export async function addRechnungPosition(
  prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  return addRechnungPositionImpl(prev, formData);
}

export async function deleteRechnungPosition(formData: FormData): Promise<void> {
  return deleteRechnungPositionImpl(formData);
}

export async function runAnomalieEngine(formData: FormData): Promise<void> {
  return runAnomalieEngineImpl(formData);
}

export async function escalateRechnungToVorgang(formData: FormData): Promise<void> {
  return escalateRechnungToVorgangImpl(formData);
}

export async function registerBauabzugAbfuehrung(formData: FormData): Promise<void> {
  return registerBauabzugAbfuehrungImpl(formData);
}
