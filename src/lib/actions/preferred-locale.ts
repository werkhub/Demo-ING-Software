import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Speichert die UI-Sprachpräferenz des eingeloggten Users.
 * Anonymous User → no-op (LocaleSwitcher fällt auf URL-Prefix + Cookie zurück).
 *
 * Validierung: nur Werte aus routing.locales werden persistiert; alles andere
 * wird ignoriert (kein Throw — der Switcher soll auch bei DB-Fehler
 * weiterfunktionieren).
 */
export async function setPreferredLocale(locale: string): Promise<void> {
  if (!routing.locales.includes(locale as Locale)) return;

  const session = await auth();
  if (!session?.user?.id) return;

  await db
    .update(schema.users)
    .set({ preferredLocale: locale as Locale })
    .where(eq(schema.users.id, session.user.id));
}
