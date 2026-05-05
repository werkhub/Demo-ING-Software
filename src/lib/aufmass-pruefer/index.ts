/**
 * Aufmaß-Prüfer-Token-Logik (rein, ohne DB-Zugriffe).
 *
 * Modul 13: Externe Prüfer (AG-Bauleitung, Architekt mit Bauleitung) prüfen
 * ein eingereichtes Aufmaß über einen Token-Link, ohne LexBau-Account.
 */
import type { AufmassPrueferToken } from "@/db/schema";

/** Standard-Gültigkeit eines Prüfer-Tokens. */
export const DEFAULT_VALID_DAYS = 14;

/** UUID v4 (RFC 4122) — ausreichend Entropie (122 bit) für Pseudonym-Token. */
export function generatePrueferToken(): string {
  return crypto.randomUUID();
}

/** Berechnet das Ablauf-Datum aus „heute + N Tage". */
export function computeExpiry(
  validDays: number = DEFAULT_VALID_DAYS,
  from: Date = new Date()
): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + validDays);
  return d;
}

/**
 * Token-Validität:
 *   - vorhanden + nicht widerrufen + nicht abgelaufen → true
 */
export function isTokenValid(
  token: Pick<AufmassPrueferToken, "expiresAt" | "revokedAt"> | null,
  now: Date = new Date()
): boolean {
  if (!token) return false;
  if (token.revokedAt !== null) return false;
  if (token.expiresAt.getTime() <= now.getTime()) return false;
  return true;
}

export type TokenInvalidReason = "not_found" | "revoked" | "expired";

export function tokenInvalidReason(
  token: Pick<AufmassPrueferToken, "expiresAt" | "revokedAt"> | null,
  now: Date = new Date()
): TokenInvalidReason | null {
  if (!token) return "not_found";
  if (token.revokedAt !== null) return "revoked";
  if (token.expiresAt.getTime() <= now.getTime()) return "expired";
  return null;
}

/**
 * Mapping Zeilen-Status → Log-Action. Nur die drei Prüfer-Aktionen werden
 * geloggt; "view" und das Reset auf "offen" haben kein Mapping.
 */
export function statusToLogAction(
  status: "zugestimmt" | "gekuerzt" | "bestritten"
): "approve" | "reduce" | "dispute" {
  switch (status) {
    case "zugestimmt":
      return "approve";
    case "gekuerzt":
      return "reduce";
    case "bestritten":
      return "dispute";
  }
}

export const ACTION_LABEL: Record<
  "view" | "approve" | "reduce" | "dispute",
  string
> = {
  view: "Aufgerufen",
  approve: "Zugestimmt",
  reduce: "Gekürzt",
  dispute: "Bestritten",
};
