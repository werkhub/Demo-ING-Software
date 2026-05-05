import NextAuth from "next-auth";
import createMiddleware from "next-intl/middleware";
import { authConfig } from "./auth.config";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

/**
 * Composed proxy: NextAuth (Auth-Check via authorized-Callback in auth.config.ts)
 * → next-intl (Locale-Routing, /de/x ↔ /en/x). NextAuth läuft zuerst und
 * redirectet ggf. nach /login (das wiederum von intl auf /de/login geprefixt wird).
 */
export default auth((req) => {
  return intlMiddleware(req);
});

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|.*\\..*).*)",
  ],
};
