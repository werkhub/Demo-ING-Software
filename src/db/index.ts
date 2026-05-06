// Nur server-side verwenden (Server Components, Server Actions, Route Handlers, Scripts).
// Niemals in Client Components importieren — sowohl `postgres` als auch der Neon-
// WebSocket-Adapter sind Node-only.
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import postgres from "postgres";
import ws from "ws";
import * as schema from "./schema";

/**
 * Postgres-Connection mit zwei Treibern:
 *   - `postgres-js` (Default) für Vercel-Postgres / Supabase / Eigen-Hosting.
 *   - `@neondatabase/serverless` über WebSocket (Port 443) für Neon-Hosts —
 *     unverzichtbar in Netzen, die Port 5432 ausgehend blocken (typisch bei
 *     deutschen Consumer-ISPs und Firmennetzen).
 *
 * Der Treiber wird anhand des URL-Hostnames gewählt: enthält der Host
 * `neon.tech`, wird der WebSocket-Treiber benutzt — lokal wie auf Vercel.
 *
 * Lazy-init über einen Proxy: erst beim ersten DB-Zugriff wird die Connection
 * aufgebaut, sodass `import { db }` zur Build-Zeit (z. B. Static Generation)
 * keine ENV-Vars verlangt.
 */

type DrizzleClient = ReturnType<typeof drizzlePg<typeof schema>>;

const POOL_GLOBAL_KEY = "__lexbau_postgres_pool" as const;
const DB_GLOBAL_KEY = "__lexbau_drizzle_db" as const;

declare global {
  // eslint-disable-next-line no-var
  var __lexbau_postgres_pool: unknown;
  // eslint-disable-next-line no-var
  var __lexbau_drizzle_db: DrizzleClient | undefined;
}

function isNeonUrl(url: string): boolean {
  try {
    return new URL(url).hostname.includes("neon.tech");
  } catch {
    return false;
  }
}

function buildClient(): DrizzleClient {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL (oder POSTGRES_URL) ist nicht gesetzt. " +
        "Lokal: in .env.local hinterlegen. Vercel: in Project Settings → Environment Variables."
    );
  }

  if (isNeonUrl(url)) {
    // Neon: WebSocket-Treiber über wss://...:443 — funktioniert auch hinter
    // Firewalls, die TCP/5432 blocken.
    neonConfig.webSocketConstructor = ws;
    const cachedPool = (globalThis as Record<string, unknown>)[POOL_GLOBAL_KEY] as
      | NeonPool
      | undefined;
    const pool =
      cachedPool ??
      new NeonPool({
        connectionString: url,
        max: process.env.VERCEL ? 1 : 10,
      });
    if (!cachedPool) {
      (globalThis as Record<string, unknown>)[POOL_GLOBAL_KEY] = pool;
    }
    return drizzleNeon(pool, { schema }) as unknown as DrizzleClient;
  }

  // Default: postgres-js für klassische Postgres-Hosts (Vercel-Postgres alt,
  // Supabase, eigene Instanz).
  const cachedPool = (globalThis as Record<string, unknown>)[POOL_GLOBAL_KEY] as
    | ReturnType<typeof postgres>
    | undefined;
  const pool =
    cachedPool ??
    postgres(url, {
      max: process.env.VERCEL ? 1 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  if (!cachedPool && process.env.NODE_ENV !== "production") {
    (globalThis as Record<string, unknown>)[POOL_GLOBAL_KEY] = pool;
  } else if (!cachedPool && process.env.VERCEL) {
    (globalThis as Record<string, unknown>)[POOL_GLOBAL_KEY] = pool;
  }
  return drizzlePg(pool, { schema });
}

function getClient(): DrizzleClient {
  const cached = (globalThis as Record<string, unknown>)[DB_GLOBAL_KEY] as
    | DrizzleClient
    | undefined;
  if (cached) return cached;
  const client = buildClient();
  (globalThis as Record<string, unknown>)[DB_GLOBAL_KEY] = client;
  return client;
}

/**
 * Proxy, der jede Methodenanfrage an die echte Drizzle-Instanz delegiert. So
 * scheitert `import { db }` nicht beim Build (kein DB-Connect), sondern erst
 * beim ersten Zugriff — bei dem dann auch die ENV-Var gesetzt sein muss.
 */
export const db = new Proxy({} as DrizzleClient, {
  get(_, prop) {
    const client = getClient();
    const value = client[prop as keyof DrizzleClient];
    return typeof value === "function" ? value.bind(client) : value;
  },
});

export type DB = DrizzleClient;
export { schema };
