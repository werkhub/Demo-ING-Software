/**
 * Pluggable Storage-Driver-Interface.
 *
 * Zweck: Disk-Storage (POC) später ohne API-Bruch durch S3/MinIO/R2 ersetzbar
 * machen. Konsumenten halten sich an dieses Interface, der konkrete Driver
 * wird in storage/index.ts ausgewählt.
 */

export type StorageBucket =
  | "vorgaenge"
  | "rechnungen"
  | "nu_certificates"
  | "securities"
  | "anzeigen"
  | "lv_imports"
  | "ausgangsrechnungen"
  | "bautagebuch";

export type SaveUploadInput = {
  bucket: StorageBucket;
  workspaceId: string;
  entityId: string;
  fileName: string;
  data: ArrayBuffer | Uint8Array;
};

export type StoredFile = {
  /** Driver-spezifischer Pfad — wird in der DB gespeichert. */
  storagePath: string;
  fileName: string;
  fileSize: number;
};

/**
 * Driver-Interface. Implementierungen:
 *   LocalDiskDriver — schreibt unter <repo>/storage/ (Default für POC)
 *   S3Driver        — folgt, sobald sich die App auf produktive Tier bewegt
 */
export interface StorageDriver {
  /** Eindeutiger Driver-Name für Logs/Telemetry. */
  readonly name: string;

  /** Schreibt eine Datei. Pfade werden in der DB gespeichert. */
  save(input: SaveUploadInput): Promise<StoredFile>;

  /** Löscht eine zuvor gespeicherte Datei. Idempotent — fehlende Dateien sind OK. */
  delete(storagePath: string): Promise<void>;

  /** Liest die Datei als Buffer (für API-Routes, die Inhalt ausliefern). */
  read(storagePath: string): Promise<Buffer>;

  /**
   * Optional: Resolve auf einen absoluten Pfad. LocalDiskDriver hat einen,
   * S3 nicht — daher optional in der Schnittstelle.
   */
  absolutePath?(storagePath: string): string;
}
