/**
 * Pure Funktion: Upload-Validierung. Server-only nicht zwingend, weil hier
 * nur Strings/Zahlen verglichen werden — wird aber typischerweise in
 * Server-Actions verwendet, bevor `saveUpload` gerufen wird.
 *
 * Default-Limits sind konservativ und decken die typischen Bauunterlagen ab:
 *   - PDF (Verträge, Rechnungen, Schreiben)
 *   - JPEG/PNG/HEIC/WEBP (Foto-Dokumentation)
 *   - DOCX/XLSX (LV-Tabellen, Aufmaße)
 *   - EML/MSG (E-Mail-Anhänge zur Beweissicherung)
 *   - TXT/CSV (GAEB-Exporte als Vorstufe)
 */

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "message/rfc822",
  "application/vnd.ms-outlook",
  "text/plain",
  "text/csv",
  "text/xml",
  "application/xml",
]);

export const ALLOWED_EXTENSIONS: ReadonlySet<string> = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "heic",
  "heif",
  "webp",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "eml",
  "msg",
  "txt",
  "csv",
  "xml",
  "x81",
  "x83",
  "x84",
  "x86",
]);

export type UploadValidationResult =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Validiert Mime-Type, Größe und Dateinamen. Wirft NICHT — Caller entscheidet,
 * wie der Fehler kommuniziert wird (Server-Action `throw` oder ActionResult).
 */
export function validateUploadFile(
  file: { name: string; size: number; type: string },
  opts: { maxBytes?: number } = {}
): UploadValidationResult {
  if (!file.name || file.name.trim().length === 0) {
    return { ok: false, reason: "Dateiname fehlt." };
  }
  // Pfad-Traversal-Schutz: Slashes/Backslashes im Dateinamen sind nie legitim.
  if (/[\\/]/.test(file.name) || file.name.includes("..")) {
    return { ok: false, reason: "Ungültiger Dateiname." };
  }
  if (file.size <= 0) {
    return { ok: false, reason: "Datei ist leer." };
  }
  const max = opts.maxBytes ?? MAX_UPLOAD_BYTES;
  if (file.size > max) {
    return {
      ok: false,
      reason: `Datei zu groß (${formatBytes(file.size)}). Maximum: ${formatBytes(max)}.`,
    };
  }

  const ext = getExtension(file.name);
  // Mime-Type-Validation: bevorzugt Browser-MIME, fallback auf Endung. Browser
  // liefern für DOCX/XLSX und älteren Windows-Versionen oft leere oder
  // generische Mime-Types — daher Endungs-Whitelist als Fallback.
  const mimeOk = file.type ? ALLOWED_MIME_TYPES.has(file.type) : false;
  const extOk = ext.length > 0 && ALLOWED_EXTENSIONS.has(ext);
  if (!mimeOk && !extOk) {
    return {
      ok: false,
      reason: `Dateityp nicht erlaubt (${file.type || ext || "unbekannt"}). Erlaubt: PDF, JPG, PNG, DOC(X), XLS(X), EML, MSG, TXT, CSV.`,
    };
  }
  return { ok: true };
}

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  if (dot < 0 || dot === fileName.length - 1) return "";
  return fileName.slice(dot + 1).toLowerCase();
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 102.4) / 10} KB`;
  return `${Math.round(n / (1024 * 102.4)) / 10} MB`;
}
