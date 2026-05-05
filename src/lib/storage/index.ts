import "server-only";

import { LocalDiskDriver } from "./local-disk-driver";
import { VercelBlobDriver } from "./vercel-blob-driver";
import type {
  SaveUploadInput,
  StorageDriver,
  StoredFile,
} from "./driver";

export type { SaveUploadInput, StorageBucket, StoredFile, StorageDriver } from "./driver";

/**
 * Globaler Driver. Auswahl per ENV-Var.
 *
 *   STORAGE_DRIVER=local-disk    (Default lokal)
 *   STORAGE_DRIVER=vercel-blob   (Default auf Vercel)
 *
 * Auf Vercel automatisch vercel-blob, weil das lokale FS read-only ist.
 */
function selectDriver(): StorageDriver {
  const explicit = process.env.STORAGE_DRIVER;
  const choice = explicit ?? (process.env.VERCEL ? "vercel-blob" : "local-disk");
  switch (choice) {
    case "local-disk":
      return new LocalDiskDriver();
    case "vercel-blob":
      return new VercelBlobDriver();
    default:
      throw new Error(
        `Unbekannter STORAGE_DRIVER="${choice}". Erlaubt: local-disk, vercel-blob.`
      );
  }
}

declare global {
  var __lexbauStorageDriver: StorageDriver | undefined;
}

const driver: StorageDriver =
  global.__lexbauStorageDriver ?? selectDriver();

if (process.env.NODE_ENV !== "production") {
  global.__lexbauStorageDriver = driver;
}

/* ============== PUBLIC API ============== */

export async function saveUpload(input: SaveUploadInput): Promise<StoredFile> {
  return driver.save(input);
}

export async function deleteUpload(storagePath: string): Promise<void> {
  return driver.delete(storagePath);
}

export async function readUpload(storagePath: string): Promise<Buffer> {
  return driver.read(storagePath);
}

export function absoluteStoragePath(storagePath: string): string {
  if (!driver.absolutePath) {
    throw new Error(
      `Driver "${driver.name}" unterstützt keine absoluten Pfade — nutze readUpload() stattdessen.`
    );
  }
  return driver.absolutePath(storagePath);
}

export function readUploadStream(storagePath: string) {
  // Backwards-Compat: wird nur vom LocalDisk-Pfad genutzt; bei S3 würde ein
  // eigener Streaming-Endpoint folgen. Heute lazy-import wegen "server-only".
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createReadStream } = require("node:fs") as typeof import("node:fs");
  return createReadStream(absoluteStoragePath(storagePath));
}

export function getStorageDriverName(): string {
  return driver.name;
}
