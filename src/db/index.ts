// Nur server-side verwenden (Server Components, Server Actions, Route Handlers, Scripts).
// Niemals in Client Components importieren — `postgres` ist ein Node-only-Modul.
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * Postgres-Connection für Vercel-Deployment (Neon, Vercel Postgres, Supabase
 * usw.). Lazy-init über einen Proxy: erst beim ersten DB-Zugriff wird die
 * Connection aufgebaut, sodass `import { db }` zur Build-Zeit (z. B. Static
 * Generation) keine ENV-Vars verlangt.
 *
 * In Serverless-Umgebungen werden Hot-Lambdas wiederverwendet — die Connection
 * bleibt über mehrere Function-Invocations erhalten und wird via globalThis
 * zwischengespeichert, um Connection-Pool-Explosion zu vermeiden.
 */

type Sql = ReturnType<typeof postgres>;
type DrizzleClient = ReturnType<typeof drizzle<typeof schema>>;

const POOL_GLOBAL_KEY = "__lexbau_postgres_pool" as const;
const DB_GLOBAL_KEY = "__lexbau_drizzle_db" as const;

declare global {
  // eslint-disable-next-line no-var
  var __lexbau_postgres_pool: Sql | undefined;
  // eslint-disable-next-line no-var
  var __lexbau_drizzle_db: DrizzleClient | undefined;
}

function buildClient(): DrizzleClient {
  const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL (oder POSTGRES_URL) ist nicht gesetzt. " +
        "Lokal: in .env.local hinterlegen. Vercel: in Project Settings → Environment Variables."
    );
  }
  // Cached Pool aus globalThis — überlebt Hot-Reloads im Dev und Lambda-Wiederverwendung.
  const cachedPool = (globalThis as Record<string, unknown>)[POOL_GLOBAL_KEY] as
    | Sql
    | undefined;
  const pool =
    cachedPool ??
    postgres(url, {
      // Serverless: kleiner Pool, schneller Idle-Timeout.
      max: process.env.VERCEL ? 1 : 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  if (!cachedPool && process.env.NODE_ENV !== "production") {
    (globalThis as Record<string, unknown>)[POOL_GLOBAL_KEY] = pool;
  } else if (!cachedPool && process.env.VERCEL) {
    (globalThis as Record<string, unknown>)[POOL_GLOBAL_KEY] = pool;
  }
  return drizzle(pool, { schema });
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
