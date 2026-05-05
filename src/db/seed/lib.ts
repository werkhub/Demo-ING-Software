/**
 * Gemeinsame Helfer für alle Seed-Module.
 *
 * Achtung: Termine werden RELATIV zu „heute" berechnet, damit „MORGEN"-
 * Fristen auch wirklich morgen sind und der Demo-Tag konsistent wirkt.
 */

const today = new Date();

export function isoPlus(days: number): string {
  const d = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + days
  );
  return d.toISOString().slice(0, 10);
}

export function dateAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

export function dateAgoH(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

/** Cents aus € (mit Komma-Toleranz). */
export function eur(amount: number): number {
  return Math.round(amount * 100);
}
