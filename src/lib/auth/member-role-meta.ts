/**
 * UI-Beschriftungen für die User-Domain-Rollen (Modul 4.8).
 * Browser-safe — keine DB- oder Session-Imports.
 */
import type { MemberRole } from "@/db/schema";

export const MEMBER_ROLE_META: Record<
  MemberRole,
  { label: string; tagline: string }
> = {
  gf: {
    label: "Geschäftsleitung",
    tagline: "Voller Zugriff inkl. Permissions-Editor.",
  },
  admin: {
    label: "Admin",
    tagline: "Voller Zugriff (technisch identisch zur GF-Rolle).",
  },
  kalkulator: {
    label: "Kalkulator",
    tagline: "LV/Aufmaß r/w, Vorgänge r/w, Einsicht in AR + Nachkalk.",
  },
  polier: {
    label: "Polier / Bauleitung",
    tagline: "Bautagebuch, Stunden, Geräte, Pläne, Mängel — operative Pflege.",
  },
  buchhaltung: {
    label: "Buchhaltung",
    tagline: "AR/Mahnungen/NU-Eingang/DATEV/Finanzen r/w.",
  },
  // Ingenieurbüro-spezifisch
  ingenieur: {
    label: "Projektingenieur",
    tagline: "Projekte, Stunden, Pläne, Mängel — fachliche Bearbeitung.",
  },
  bauleiter: {
    label: "Bauleiter (LP8)",
    tagline: "Bautagebuch, Mängel, Anordnung, Aufmaß-Prüfung.",
  },
  verwaltung: {
    label: "Verwaltung",
    tagline: "Honorar/Mahnungen/DATEV/Fristen — Office-Workflow.",
  },
  zeichner: {
    label: "Bauzeichner",
    tagline: "Pläne r/w, Stunden, Projekt-Sicht — kein Honorar/Finanzen.",
  },
  // Universal
  viewer: {
    label: "Viewer",
    tagline: "Nur Leserechte auf Domain-Daten.",
  },
};

export const MEMBER_ROLE_ORDER: readonly MemberRole[] = [
  "gf",
  "admin",
  "kalkulator",
  "polier",
  "buchhaltung",
  "ingenieur",
  "bauleiter",
  "verwaltung",
  "zeichner",
  "viewer",
];
