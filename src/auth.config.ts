import type { NextAuthConfig } from "next-auth";
import { routing } from "./i18n/routing";

const PUBLIC_PREFIXES = [
  "/login",
  "/impressum",
  "/datenschutz",
  "/agb",
  "/rdg-hinweis",
  "/hinweis",
  "/aufmass-pruefen",
];

/**
 * Strippt das führende Locale-Segment (`/de/...` → `/...`), damit
 * PUBLIC_PREFIXES locale-agnostisch matcht.
 */
function stripLocale(path: string): string {
  for (const loc of routing.locales) {
    if (path === `/${loc}`) return "/";
    if (path.startsWith(`/${loc}/`)) return path.slice(loc.length + 1);
  }
  return path;
}

export const authConfig: NextAuthConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  // NextAuth v5 verweigert in Production-Modus per Default Hosts wie localhost,
  // wenn AUTH_URL nicht gesetzt ist. Für lokale Production-Demos / Self-Hosting
  // hinter Reverse-Proxy ist trustHost notwendig. Bei Multi-Tenant-Cloud-Deploy
  // stattdessen AUTH_URL pro Workspace setzen.
  trustHost: true,
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const path = stripLocale(request.nextUrl.pathname);
      const isPublic = PUBLIC_PREFIXES.some(
        (p) => path === p || path.startsWith(`${p}/`)
      );
      if (isPublic) return true;
      return !!auth?.user;
    },
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.workspaceId = (user as { workspaceId?: string }).workspaceId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId && session.user) {
        session.user.id = token.userId as string;
        session.user.workspaceId = token.workspaceId as string;
      }
      return session;
    },
  },
};
