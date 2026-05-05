import "server-only";

import path from "node:path";
import fs from "node:fs/promises";
import type {
  SaveUploadInput,
  StorageDriver,
  StoredFile,
} from "./driver";

const STORAGE_ROOT = path.join(process.cwd(), "storage");

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^\.+/, "_")
    .slice(0, 200);
}

/**
 * Default-Driver für die POC-Phase: legt Dateien unter
 * <repo>/storage/<workspaceId>/<bucket>/<entityId>/<dateiname> ab.
 *
 * Sicherheits-Check: alle Pfad-Operationen werden auf STORAGE_ROOT begrenzt,
 * damit ein manipulierter storagePath kein Path-Traversal ermöglicht.
 */
export class LocalDiskDriver implements StorageDriver {
  readonly name = "local-disk";

  async save(input: SaveUploadInput): Promise<StoredFile> {
    const cleanName = sanitizeFileName(input.fileName) || "datei";
    const dir = path.join(
      STORAGE_ROOT,
      input.workspaceId,
      input.bucket,
      input.entityId
    );
    await fs.mkdir(dir, { recursive: true });
    const dest = path.join(dir, cleanName);
    const buf = Buffer.from(
      input.data instanceof Uint8Array ? input.data : new Uint8Array(input.data)
    );
    await fs.writeFile(dest, buf);
    const storagePath = path.relative(process.cwd(), dest).replace(/\\/g, "/");
    return { storagePath, fileName: cleanName, fileSize: buf.byteLength };
  }

  async delete(storagePath: string): Promise<void> {
    if (!storagePath) return;
    const full = path.resolve(process.cwd(), storagePath);
    if (!full.startsWith(STORAGE_ROOT)) return;
    try {
      await fs.unlink(full);
    } catch {
      /* ignore — Datei evtl. schon weg */
    }
  }

  async read(storagePath: string): Promise<Buffer> {
    const full = path.resolve(process.cwd(), storagePath);
    if (!full.startsWith(STORAGE_ROOT)) {
      throw new Error("Pfad außerhalb des Storage-Roots verweigert.");
    }
    return fs.readFile(full);
  }

  absolutePath(storagePath: string): string {
    return path.resolve(process.cwd(), storagePath);
  }
}
