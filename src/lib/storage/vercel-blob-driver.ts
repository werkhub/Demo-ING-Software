import "server-only";

import { put, del, head } from "@vercel/blob";
import type {
  SaveUploadInput,
  StorageDriver,
  StoredFile,
} from "./driver";

function sanitizeFileName(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/^\.+/, "_")
    .slice(0, 200);
}

/**
 * Vercel-Blob-Driver für das Production-Deployment auf Vercel.
 *
 * Erfordert die ENV-Var `BLOB_READ_WRITE_TOKEN` (wird von Vercel automatisch
 * gesetzt, sobald ein Blob-Store am Projekt verbunden ist; lokal muss er aus
 * dem Vercel-Dashboard kopiert werden).
 *
 * `storagePath` enthält bei Vercel-Blob keine lokalen Pfade, sondern den
 * öffentlichen Blob-URL — wir speichern diesen direkt in der DB. So ist die
 * Datei in einer API-Route per fetch lesbar, und das Löschen geht über
 * `del(url)`.
 */
export class VercelBlobDriver implements StorageDriver {
  readonly name = "vercel-blob";

  async save(input: SaveUploadInput): Promise<StoredFile> {
    const cleanName = sanitizeFileName(input.fileName) || "datei";
    const key = `${input.workspaceId}/${input.bucket}/${input.entityId}/${cleanName}`;
    const buf = Buffer.from(
      input.data instanceof Uint8Array ? input.data : new Uint8Array(input.data)
    );
    const blob = await put(key, buf, {
      access: "public",
      // addRandomSuffix=true verhindert Konflikte bei gleichem Dateinamen
      addRandomSuffix: true,
    });
    return {
      storagePath: blob.url,
      fileName: cleanName,
      fileSize: buf.byteLength,
    };
  }

  async delete(storagePath: string): Promise<void> {
    if (!storagePath) return;
    try {
      await del(storagePath);
    } catch {
      /* ignore — Blob evtl. schon weg */
    }
  }

  async read(storagePath: string): Promise<Buffer> {
    if (!storagePath) {
      throw new Error("Leerer storagePath.");
    }
    // Public-URL → einfacher fetch. Bei privaten Blobs müsste hier ein
    // signed URL erzeugt werden; für die Demo reichen public URLs.
    const meta = await head(storagePath);
    const res = await fetch(meta.url);
    if (!res.ok) {
      throw new Error(
        `Vercel Blob ${storagePath} nicht lesbar: HTTP ${res.status}`
      );
    }
    return Buffer.from(await res.arrayBuffer());
  }
}
