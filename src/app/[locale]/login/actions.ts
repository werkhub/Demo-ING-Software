"use server";

import { AuthError } from "next-auth";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { signIn, signOut } from "@/auth";
import { db, schema } from "@/db";
import { fail, ok, type ActionResult } from "@/lib/action-result";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Strippt das führende Locale-Segment, damit beim Re-Prefixen kein doppeltes
 * /de/de oder /en/de entsteht.
 */
function stripLocaleFromPath(path: string): string {
  for (const loc of routing.locales) {
    if (path === `/${loc}`) return "/";
    if (path.startsWith(`/${loc}/`)) return path.slice(loc.length + 1);
  }
  return path;
}

export async function loginAction(
  _prev: ActionResult<never> | null,
  formData: FormData
): Promise<ActionResult<never>> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  let redirectTo = String(formData.get("redirectTo") ?? "/");
  const t = await getTranslations("modules.login.errors");

  if (!email) {
    return fail(t("emptyEmail"));
  }

  // Sprach-Präferenz auflösen (in dieser Reihenfolge):
  //   1. users.preferredLocale (explizite Wahl)
  //   2. workspaces.defaultLocale (Workspace-Default für Onboarding)
  //   3. Locale aus aktuellem URL-Prefix bleibt
  try {
    const [user] = await db
      .select({
        preferredLocale: schema.users.preferredLocale,
        workspaceDefaultLocale: schema.workspaces.defaultLocale,
      })
      .from(schema.users)
      .leftJoin(
        schema.workspaces,
        eq(schema.users.workspaceId, schema.workspaces.id)
      )
      .where(eq(schema.users.email, email))
      .limit(1);
    const resolved = (user?.preferredLocale ?? user?.workspaceDefaultLocale) as
      | Locale
      | null
      | undefined;
    if (resolved && routing.locales.includes(resolved)) {
      const stripped = stripLocaleFromPath(redirectTo);
      redirectTo = stripped === "/" ? `/${resolved}` : `/${resolved}${stripped}`;
    }
  } catch {
    // DB-Lesefehler darf den Login nicht blockieren — Locale-Fallback greift.
  }

  try {
    await signIn("credentials", {
      email,
      redirectTo,
    });
    // signIn redirects on success — this line never runs
    return ok(undefined as never);
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return fail(t("notFound"));
      }
      return fail(t("generic"));
    }
    throw error;
  }
}

export async function logoutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
