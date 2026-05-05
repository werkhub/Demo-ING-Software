/**
 * Reine Type-Exporte ohne DB-Imports — sicher für Client-Components.
 */
import type { DsgvoBucket } from "./buckets";

export type DsgvoFinding = {
  bucket: DsgvoBucket;
  table: string;
  rows: Array<Record<string, unknown>>;
};

export type DsgvoExportBundle = {
  identifier: string;
  workspaceId: string;
  generatedAt: string;
  findings: DsgvoFinding[];
  notes: string[];
};
