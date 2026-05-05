/**
 * Seed-Test-Users — fügt zusätzliche Login-fähige User mit unterschiedlichen
 * memberRoles zum bestehenden Müller-Bau-Demo-Workspace hinzu, damit man die
 * App aus jeder Mitarbeiter-Perspektive ansehen kann.
 *
 * Idempotent: vorhandene User (nach E-Mail) werden übersprungen.
 *
 * Login-Flow: Credentials-Provider akzeptiert nur die E-Mail, kein Passwort
 * (siehe src/auth.ts) — kopiere die E-Mail aus der Output-Liste in die
 * Login-Maske.
 *
 * Aufruf: npm run db:seed-test-users
 */
import { eq } from "drizzle-orm";
import { db, schema } from "../src/db";

const WS_ID = "ws_mueller_bau";

type TestUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer" | "guest";
  memberRole:
    | "gf"
    | "kalkulator"
    | "polier"
    | "buchhaltung"
    | "ingenieur"
    | "bauleiter"
    | "verwaltung"
    | "zeichner"
    | "viewer"
    | "admin";
  roleLabel: string;
};

const TEST_USERS: TestUser[] = [
  {
    id: "u_test_kalkulator",
    name: "Anna Berger",
    email: "kalkulator@demo.de",
    role: "user",
    memberRole: "kalkulator",
    roleLabel: "Kalkulator",
  },
  {
    id: "u_test_bauleiter",
    name: "Frank Hartmann",
    email: "bauleiter@demo.de",
    role: "user",
    memberRole: "bauleiter",
    roleLabel: "Bauleiter",
  },
  {
    id: "u_test_polier",
    name: "Jens Krause",
    email: "polier2@demo.de",
    role: "user",
    memberRole: "polier",
    roleLabel: "Polier · Demo",
  },
  {
    id: "u_test_ingenieur",
    name: "Dr. Lena Weber",
    email: "ingenieur@demo.de",
    role: "user",
    memberRole: "ingenieur",
    roleLabel: "Ingenieurin",
  },
  {
    id: "u_test_verwaltung",
    name: "Petra Wolf",
    email: "verwaltung@demo.de",
    role: "user",
    memberRole: "verwaltung",
    roleLabel: "Verwaltung",
  },
  {
    id: "u_test_zeichner",
    name: "Tobias Lang",
    email: "zeichner@demo.de",
    role: "user",
    memberRole: "zeichner",
    roleLabel: "CAD-Zeichner",
  },
  {
    id: "u_test_viewer",
    name: "Markus Sauer",
    email: "viewer@demo.de",
    role: "viewer",
    memberRole: "viewer",
    roleLabel: "Read-Only-Gast",
  },
  {
    id: "u_test_admin",
    name: "Sabine Reich",
    email: "admin@demo.de",
    role: "admin",
    memberRole: "admin",
    roleLabel: "Workspace-Admin",
  },
];

async function main(): Promise<void> {
  // Workspace muss existieren — sonst zeigt das Script auf einen
  // fehlenden Demo-Stand hin.
  const [ws] = await db
    .select({ id: schema.workspaces.id, name: schema.workspaces.name })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, WS_ID))
    .limit(1);

  if (!ws) {
    console.error(
      `❌ Demo-Workspace '${WS_ID}' nicht gefunden. Erst 'npm run db:seed' laufen lassen.`
    );
    process.exit(1);
  }

  console.log(`🌱 Test-User für Workspace '${ws.name}' anlegen …\n`);

  let inserted = 0;
  let skipped = 0;

  for (const u of TEST_USERS) {
    const [existing] = await db
      .select({ id: schema.users.id, email: schema.users.email })
      .from(schema.users)
      .where(eq(schema.users.email, u.email))
      .limit(1);

    if (existing) {
      console.log(`  · ${u.email.padEnd(28)} ${u.memberRole.padEnd(12)} (skip — existiert)`);
      skipped++;
      continue;
    }

    await db.insert(schema.users).values({
      id: u.id,
      workspaceId: WS_ID,
      name: u.name,
      email: u.email,
      role: u.role,
      memberRole: u.memberRole,
      roleLabel: u.roleLabel,
      hasLicense: true,
      status: "active",
    });

    console.log(`  ✓ ${u.email.padEnd(28)} ${u.memberRole.padEnd(12)} ${u.name}`);
    inserted++;
  }

  console.log(`\n✅ Fertig — ${inserted} angelegt, ${skipped} übersprungen.\n`);
  console.log("Login-Hinweis: nur E-Mail eingeben (kein Passwort), siehe src/auth.ts.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seed fehlgeschlagen:", err);
  process.exit(1);
});
