/**
 * Client-sicherer Re-Export der Bucket-Konstanten — keine DB-Imports.
 * Das Form-Component importiert von hier, der Server-only `auskunft.ts`
 * von dort.
 */
export type DsgvoBucket =
  | "users"
  | "subcontractors"
  | "projectContacts"
  | "mitarbeiter";

export const ALL_BUCKETS: readonly DsgvoBucket[] = [
  "users",
  "subcontractors",
  "projectContacts",
  "mitarbeiter",
] as const;
