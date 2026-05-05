/**
 * Backwards-Compat-Shim. Die kanonische Quelle der Vorgang-Server-Actions
 * liegt in `src/lib/actions/vorgaenge.ts`. Eine "use server"-Datei darf in
 * Next.js 16/Turbopack nur async-Funktionen exportieren (kein
 * Re-Export-Statement). Daher dünne Wrapper.
 *
 * Bestehende relative Imports der Form `from "../actions"` aus den
 * Page-Komponenten bleiben dadurch stabil. Neuer Code sollte direkt aus
 * `@/lib/actions/vorgaenge` importieren.
 */
"use server";

import type { ActionResult } from "@/lib/action-result";
import {
  createVorgang as createVorgangImpl,
  updateVorgang as updateVorgangImpl,
  setVorgangStatus as setVorgangStatusImpl,
  deleteVorgang as deleteVorgangImpl,
  uploadVorgangDocument as uploadVorgangDocumentImpl,
  deleteVorgangDocument as deleteVorgangDocumentImpl,
  classifyVorgangFromDocument as classifyVorgangFromDocumentImpl,
  saveVorgangDraft as saveVorgangDraftImpl,
  sendVorgangDraft as sendVorgangDraftImpl,
  discardVorgangDraft as discardVorgangDraftImpl,
  addVorgangLink as addVorgangLinkImpl,
  removeVorgangLink as removeVorgangLinkImpl,
} from "@/lib/actions/vorgaenge";

export async function createVorgang(
  prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  return createVorgangImpl(prev, formData);
}

export async function updateVorgang(
  prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  return updateVorgangImpl(prev, formData);
}

export async function setVorgangStatus(formData: FormData): Promise<void> {
  return setVorgangStatusImpl(formData);
}

export async function deleteVorgang(formData: FormData): Promise<void> {
  return deleteVorgangImpl(formData);
}

export async function uploadVorgangDocument(formData: FormData): Promise<void> {
  return uploadVorgangDocumentImpl(formData);
}

export async function deleteVorgangDocument(formData: FormData): Promise<void> {
  return deleteVorgangDocumentImpl(formData);
}

export async function classifyVorgangFromDocument(
  formData: FormData
): Promise<void> {
  return classifyVorgangFromDocumentImpl(formData);
}

export async function saveVorgangDraft(
  prev: ActionResult<{ id: string }> | null,
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  return saveVorgangDraftImpl(prev, formData);
}

export async function sendVorgangDraft(formData: FormData): Promise<void> {
  return sendVorgangDraftImpl(formData);
}

export async function discardVorgangDraft(formData: FormData): Promise<void> {
  return discardVorgangDraftImpl(formData);
}

export async function addVorgangLink(formData: FormData): Promise<void> {
  return addVorgangLinkImpl(formData);
}

export async function removeVorgangLink(formData: FormData): Promise<void> {
  return removeVorgangLinkImpl(formData);
}
