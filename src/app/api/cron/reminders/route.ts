/**
 * Cron-Trigger für Reminder-Pipeline.
 *
 * Auth: Bearer-Token via ENV `CRON_SECRET`. Wenn ENV nicht gesetzt → 503
 * (kein Fail-Open). Wenn Header fehlt/falsch → 401.
 *
 * Aufruf-Beispiele:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://app/api/cron/reminders
 *   Vercel Cron via vercel.json (siehe README)
 *   GitHub Actions / system cron (curl)
 *
 * Idempotent: mehrfacher Aufruf am selben Tag erzeugt keine Duplikat-Vorgänge
 * (Marker-Pattern in den Reconcile-Helpern).
 */
import { NextResponse } from "next/server";
import { runRemindersJob } from "@/lib/cron/runner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Drizzle/better-sqlite3 braucht Node-Runtime

export async function GET(req: Request) {
  return handle(req);
}

export async function POST(req: Request) {
  return handle(req);
}

async function handle(req: Request): Promise<NextResponse> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "CRON_SECRET nicht gesetzt — API-Trigger ist deaktiviert. ENV-Variable in der Hosting-Konfiguration eintragen.",
      },
      { status: 503 }
    );
  }
  const authHeader = req.headers.get("authorization") ?? "";
  const provided = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  // Vercel-Cron schickt den Token auch als x-vercel-cron-signature header
  // (nicht hier — Vercel verschickt aktuell den Bearer-Header).
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const outcome = await runRemindersJob("api");
  return NextResponse.json({
    runId: outcome.runId,
    status: outcome.status,
    durationMs: outcome.durationMs,
    summary: outcome.summary,
  });
}
