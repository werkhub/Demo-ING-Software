import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // server-only wirft im Browser/Vitest. Im Test-Kontext ist das harmlos —
      // wir aliasen auf einen No-Op, damit Server-Module testbar bleiben.
      "server-only": path.resolve(__dirname, "./src/test/server-only-noop.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration-Tests, die eine Postgres-Verbindung brauchen, werden
    // ausgeschlossen, wenn DATABASE_URL fehlt. So bleibt der Default-Run
    // (Unit-Tests) auf Vercel/CI ohne DB grün.
    exclude:
      !process.env.DATABASE_URL && !process.env.POSTGRES_URL
        ? [
            "**/node_modules/**",
            "src/lib/audit/log.test.ts",
            "src/lib/auth/permissions.test.ts",
            "src/lib/cron/freistellung-bauabzug.test.ts",
            "src/lib/cron/reminders.test.ts",
            "src/lib/dsgvo/auskunft.test.ts",
          ]
        : ["**/node_modules/**"],
    globals: false,
    // Integration-Tests gegen die geteilte DB serialisieren — kein File-Parallelismus.
    fileParallelism: false,
  },
});
