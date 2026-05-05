/**
 * Disk-Storage für Pläne + Dokumente.
 *
 * Bewusst KEIN "server-only" — die Helper sind reine Node-APIs (fs/path) und
 * Cron- oder Test-Pfade greifen ggf. ohne Next-Bundling drauf zu. Trotzdem
 * NICHT in Client-Code importieren — fs ist Node-only und der Bundler wirft.
 *
 * Layout:
 *   ./data/uploads/plaene/<workspaceId>/<planId>/v<version>/<filename>
 *   ./data/uploads/dokumente/<workspaceId>/<dokId>/<filename>
 *
 * Sicherheits-Eigenschaften:
 *   - sanitizeFileName entfernt Pfad-Separatoren und limitiert Länge.
 *   - resolveAndCheck() verifiziert nach Resolve, dass der Pfad unter
 *     UPLOADS_ROOT liegt (Path-Traversal-Schutz für die Read-API).
 */
import path from "node:path";
import fs from "node:fs/promises";
import { sanitizeFileName } from "./index";

export const UPLOADS_ROOT = path.join(process.cwd(), "data", "uploads");

const VERCEL_DEACTIVATED_MSG =
  "Plan-/Dokument-Upload ist in der Vercel-Demo deaktiviert (lokales Filesystem nicht persistent). " +
  "Lokal mit `npm run dev` ausprobieren oder die Demo um Vercel Blob erweitern.";

function isVercel(): boolean {
  return Boolean(process.env.VERCEL);
}

function planVersionDir(
  workspaceId: string,
  planId: string,
  versionNr: number
): string {
  return path.join(
    UPLOADS_ROOT,
    "plaene",
    workspaceId,
    planId,
    `v${versionNr}`
  );
}

function dokumentDir(workspaceId: string, dokumentId: string): string {
  return path.join(UPLOADS_ROOT, "dokumente", workspaceId, dokumentId);
}

export type SavedFile = {
  /** Repo-relativer POSIX-Pfad — wird in der DB nicht persistiert (nur Filename), aber für die Auslieferung über /api/uploads/[...path] verwendet. */
  relPath: string;
  filename: string;
  sizeBytes: number;
};

export async function savePlanVersionFile(opts: {
  workspaceId: string;
  planId: string;
  versionNr: number;
  filename: string;
  data: ArrayBuffer | Uint8Array;
}): Promise<SavedFile> {
  if (isVercel()) {
    throw new Error(VERCEL_DEACTIVATED_MSG);
  }
  const cleanName = sanitizeFileName(opts.filename);
  const dir = planVersionDir(opts.workspaceId, opts.planId, opts.versionNr);
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, cleanName);
  const buf = Buffer.from(
    opts.data instanceof Uint8Array ? opts.data : new Uint8Array(opts.data)
  );
  await fs.writeFile(dest, buf);
  const relPath = path
    .relative(process.cwd(), dest)
    .split(path.sep)
    .join("/");
  return { relPath, filename: cleanName, sizeBytes: buf.byteLength };
}

export async function saveDokumentFile(opts: {
  workspaceId: string;
  dokumentId: string;
  filename: string;
  data: ArrayBuffer | Uint8Array;
}): Promise<SavedFile> {
  if (isVercel()) {
    throw new Error(VERCEL_DEACTIVATED_MSG);
  }
  const cleanName = sanitizeFileName(opts.filename);
  const dir = dokumentDir(opts.workspaceId, opts.dokumentId);
  await fs.mkdir(dir, { recursive: true });
  const dest = path.join(dir, cleanName);
  const buf = Buffer.from(
    opts.data instanceof Uint8Array ? opts.data : new Uint8Array(opts.data)
  );
  await fs.writeFile(dest, buf);
  const relPath = path
    .relative(process.cwd(), dest)
    .split(path.sep)
    .join("/");
  return { relPath, filename: cleanName, sizeBytes: buf.byteLength };
}

export async function deletePlanFolder(
  workspaceId: string,
  planId: string
): Promise<void> {
  const dir = path.join(UPLOADS_ROOT, "plaene", workspaceId, planId);
  await fs.rm(dir, { recursive: true, force: true });
}

export async function deleteDokumentFolder(
  workspaceId: string,
  dokumentId: string
): Promise<void> {
  const dir = dokumentDir(workspaceId, dokumentId);
  await fs.rm(dir, { recursive: true, force: true });
}

/**
 * Resolved einen User-Submitted Path-Suffix unter UPLOADS_ROOT und prüft auf
 * Path-Traversal. Wirft, wenn der Pfad das Root verlässt.
 *
 * Erwartet Segmente nach `/api/uploads/`:
 *   ["plaene", "<ws>", "<planId>", "v<n>", "<file>"]
 *   ["dokumente", "<ws>", "<dokId>", "<file>"]
 */
export function resolveUploadPath(segments: ReadonlyArray<string>): {
  absolutePath: string;
  bucket: "plaene" | "dokumente";
  workspaceId: string;
  entityId: string;
  versionFolder: string | null;
  filename: string;
} {
  if (segments.length < 4) {
    throw new Error("Ungültiger Upload-Pfad.");
  }
  const [bucket, workspaceId, entityId, ...rest] = segments;
  if (bucket !== "plaene" && bucket !== "dokumente") {
    throw new Error("Unbekannter Bucket.");
  }
  if (!workspaceId || !entityId) {
    throw new Error("Workspace/Entity fehlt im Pfad.");
  }
  let versionFolder: string | null = null;
  let filename: string;
  if (bucket === "plaene") {
    if (rest.length !== 2) throw new Error("Plan-Pfad braucht v<n>/<file>.");
    versionFolder = rest[0];
    filename = rest[1];
    if (!/^v\d+$/.test(versionFolder)) {
      throw new Error("Ungültiger Versions-Ordner.");
    }
  } else {
    if (rest.length !== 1) throw new Error("Dokument-Pfad braucht <file>.");
    filename = rest[0];
  }
  if (filename !== sanitizeFileName(filename)) {
    throw new Error("Dateiname enthält ungültige Zeichen.");
  }
  const absolutePath = path.join(
    UPLOADS_ROOT,
    bucket,
    workspaceId,
    entityId,
    ...(versionFolder ? [versionFolder] : []),
    filename
  );
  const resolved = path.resolve(absolutePath);
  if (!resolved.startsWith(path.resolve(UPLOADS_ROOT))) {
    throw new Error("Pfad außerhalb von UPLOADS_ROOT.");
  }
  return {
    absolutePath: resolved,
    bucket,
    workspaceId,
    entityId,
    versionFolder,
    filename,
  };
}

export async function readUpload(absolutePath: string): Promise<Buffer> {
  return fs.readFile(absolutePath);
}
