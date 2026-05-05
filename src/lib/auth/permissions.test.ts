import { describe as describeBase, expect, it, beforeAll, afterAll } from "vitest";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import {

// Integration-Suite: braucht eine Postgres-Verbindung. Wird automatisch
// übersprungen, wenn DATABASE_URL nicht gesetzt ist.
const describe = describeBase.skipIf(
  !process.env.DATABASE_URL && !process.env.POSTGRES_URL
);
  DEFAULT_MATRIX,
  MEMBER_ROLES,
  PERMISSION_ACTIONS,
  PERMISSION_RESOURCES,
  can,
  loadWorkspaceMatrix,
  parseOverrides,
  permKey,
  resolvePermission,
  serializeOverrides,
} from "./permissions";
import type {
  MemberRole,
  PermissionAction,
  PermissionOverride,
  PermissionResource,
  User,
} from "@/db/schema";
import { genId } from "@/lib/utils";

/**
 * Integration-Test: läuft gegen die echte ./data/lexbau.db.
 * Erstellt einen ephemeren Test-Workspace + User, räumt nach jedem Lauf wieder auf.
 */
const TEST_WS_PREFIX = "test-perm-ws";

async function createTestWorkspace(name: string) {
  const id = `${TEST_WS_PREFIX}-${genId("ws")}`;
  await db.insert(schema.workspaces).values({
    id,
    name: `Permissions-Test ${name}`,
  });
  return id;
}

async function createTestUser(
  workspaceId: string,
  memberRole: MemberRole,
  override?: PermissionOverride[]
) {
  const id = genId("u");
  await db.insert(schema.users).values({
    id,
    workspaceId,
    name: `Test ${memberRole}`,
    email: `${id}@example.test`,
    memberRole,
    permissionsOverrideJson: override
      ? serializeOverrides(override)
      : null,
  });
  const [u] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, id))
    .limit(1);
  return u as User;
}

let createdWorkspaceIds: string[] = [];
let createdUserIds: string[] = [];

async function cleanup() {
  if (createdUserIds.length > 0) {
    await db
      .delete(schema.permissionsMatrix)
      .where(inArray(schema.permissionsMatrix.workspaceId, createdWorkspaceIds));
    await db.delete(schema.users).where(inArray(schema.users.id, createdUserIds));
  }
  if (createdWorkspaceIds.length > 0) {
    await db
      .delete(schema.workspaces)
      .where(inArray(schema.workspaces.id, createdWorkspaceIds));
  }
  createdUserIds = [];
  createdWorkspaceIds = [];
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

describe("DEFAULT_MATRIX — Vollständigkeit & Konsistenz", () => {
  it("kennt alle 10 MemberRoles (Bauunternehmer- + Ingenieurbüro-Set)", () => {
    expect(MEMBER_ROLES).toHaveLength(10);
    for (const role of MEMBER_ROLES) {
      expect(DEFAULT_MATRIX[role]).toBeDefined();
    }
  });

  it("jede Role × Resource × Action ist deterministisch resolvbar", () => {
    for (const role of MEMBER_ROLES) {
      for (const resource of PERMISSION_RESOURCES) {
        for (const action of PERMISSION_ACTIONS) {
          const v = DEFAULT_MATRIX[role].has(permKey(resource, action));
          expect(typeof v).toBe("boolean");
        }
      }
    }
  });

  it("gf und admin haben volle Rechte (alle 17×2 = 34)", () => {
    const total = PERMISSION_RESOURCES.length * PERMISSION_ACTIONS.length;
    expect(DEFAULT_MATRIX.gf.size).toBe(total);
    expect(DEFAULT_MATRIX.admin.size).toBe(total);
  });

  it("viewer hat nur read-Permissions, nie write", () => {
    for (const r of PERMISSION_RESOURCES) {
      expect(DEFAULT_MATRIX.viewer.has(permKey(r, "write"))).toBe(false);
    }
  });

  it("polier darf bautagebuch:write aber NICHT ausgangsrechnungen:read", () => {
    expect(DEFAULT_MATRIX.polier.has(permKey("bautagebuch", "write"))).toBe(true);
    expect(DEFAULT_MATRIX.polier.has(permKey("ausgangsrechnungen", "read"))).toBe(
      false
    );
    expect(DEFAULT_MATRIX.polier.has(permKey("nu_eingang" as PermissionResource, "read")) || false).toBe(false);
    expect(DEFAULT_MATRIX.polier.has(permKey("finanzen", "read"))).toBe(false);
  });

  it("buchhaltung darf ausgangsrechnungen:write aber NICHT bautagebuch:write", () => {
    expect(
      DEFAULT_MATRIX.buchhaltung.has(permKey("ausgangsrechnungen", "write"))
    ).toBe(true);
    expect(
      DEFAULT_MATRIX.buchhaltung.has(permKey("bautagebuch", "write"))
    ).toBe(false);
  });

  it("kalkulator darf lv:write, nicht aber stunden:write", () => {
    expect(DEFAULT_MATRIX.kalkulator.has(permKey("lv", "write"))).toBe(true);
    expect(DEFAULT_MATRIX.kalkulator.has(permKey("stunden", "write"))).toBe(false);
  });
});

describe("resolvePermission — Vererbung & Override", () => {
  const emptyMatrix = new Map<ReturnType<typeof permKey>, boolean>();

  it("default deny ohne Matrix + Default-Set", () => {
    const polier = {
      memberRole: "polier" as MemberRole,
      permissionsOverrideJson: null,
    };
    expect(resolvePermission(polier, "ausgangsrechnungen", "write", emptyMatrix)).toBe(
      false
    );
  });

  it("default allow ohne Matrix, wenn DEFAULT_MATRIX erlaubt", () => {
    const polier = {
      memberRole: "polier" as MemberRole,
      permissionsOverrideJson: null,
    };
    expect(resolvePermission(polier, "bautagebuch", "write", emptyMatrix)).toBe(true);
  });

  it("Workspace-Matrix-Eintrag schlägt Default", () => {
    const polier = {
      memberRole: "polier" as MemberRole,
      permissionsOverrideJson: null,
    };
    const m = new Map([
      [permKey("ausgangsrechnungen", "read"), true],
      [permKey("bautagebuch", "write"), false],
    ]);
    expect(resolvePermission(polier, "ausgangsrechnungen", "read", m)).toBe(true);
    expect(resolvePermission(polier, "bautagebuch", "write", m)).toBe(false);
  });

  it("User-Override schlägt Workspace-Matrix UND Default", () => {
    const viewer: Pick<User, "memberRole" | "permissionsOverrideJson"> = {
      memberRole: "viewer" as MemberRole,
      permissionsOverrideJson: serializeOverrides([
        { resource: "bautagebuch", action: "write", allowed: true },
      ]),
    };
    const m = new Map([[permKey("bautagebuch", "write"), false]]);
    expect(resolvePermission(viewer, "bautagebuch", "write", m)).toBe(true);
  });

  it("Negativer User-Override entzieht eine Default-Erlaubnis", () => {
    const gf = {
      memberRole: "gf" as MemberRole,
      permissionsOverrideJson: serializeOverrides([
        { resource: "datev", action: "write", allowed: false },
      ]),
    };
    expect(resolvePermission(gf, "datev", "write", emptyMatrix)).toBe(false);
    // andere Resourcen bleiben erlaubt
    expect(resolvePermission(gf, "datev", "read", emptyMatrix)).toBe(true);
    expect(resolvePermission(gf, "ausgangsrechnungen", "write", emptyMatrix)).toBe(true);
  });
});

describe("parseOverrides", () => {
  it("liefert leeres Array bei null/undefined/leer", () => {
    expect(parseOverrides(null)).toEqual([]);
    expect(parseOverrides(undefined)).toEqual([]);
    expect(parseOverrides("")).toEqual([]);
  });

  it("filtert ungültige Einträge raus", () => {
    const json = JSON.stringify([
      { resource: "lv", action: "read", allowed: true },
      { resource: "lv" }, // unvollständig
      "string",
      null,
    ]);
    const parsed = parseOverrides(json);
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      resource: "lv",
      action: "read",
      allowed: true,
    });
  });

  it("toleriert kaputtes JSON", () => {
    expect(parseOverrides("not-json")).toEqual([]);
  });
});

describe("can() — DB-Integration & Workspace-Isolation", () => {
  it("can() lädt User + Matrix und resolved korrekt", async () => {
    const wsA = await createTestWorkspace("A");
    createdWorkspaceIds.push(wsA);

    const polier = await createTestUser(wsA, "polier");
    createdUserIds.push(polier.id);

    expect(await can(polier.id, "bautagebuch", "write")).toBe(true);
    expect(await can(polier.id, "ausgangsrechnungen", "write")).toBe(false);
  });

  it("liefert false für unbekannten User", async () => {
    expect(await can("u_does_not_exist_xyz", "lv", "read")).toBe(false);
  });

  it("Workspace-Matrix-Override wirkt nur im eigenen Workspace", async () => {
    const wsA = await createTestWorkspace("isol-A");
    const wsB = await createTestWorkspace("isol-B");
    createdWorkspaceIds.push(wsA, wsB);

    const polierA = await createTestUser(wsA, "polier");
    const polierB = await createTestUser(wsB, "polier");
    createdUserIds.push(polierA.id, polierB.id);

    // In WS-A erlauben wir polier ausnahmsweise ausgangsrechnungen:read
    await db.insert(schema.permissionsMatrix).values({
      id: genId("pm"),
      workspaceId: wsA,
      role: "polier",
      resource: "ausgangsrechnungen",
      action: "read",
      allowed: true,
      updatedAt: new Date(),
    });

    expect(await can(polierA.id, "ausgangsrechnungen", "read")).toBe(true);
    expect(await can(polierB.id, "ausgangsrechnungen", "read")).toBe(false);
  });

  it("loadWorkspaceMatrix liefert nur Zeilen der angefragten Rolle", async () => {
    const ws = await createTestWorkspace("loadtest");
    createdWorkspaceIds.push(ws);

    await db.insert(schema.permissionsMatrix).values([
      {
        id: genId("pm"),
        workspaceId: ws,
        role: "polier",
        resource: "lv",
        action: "write",
        allowed: true,
        updatedAt: new Date(),
      },
      {
        id: genId("pm"),
        workspaceId: ws,
        role: "viewer",
        resource: "lv",
        action: "write",
        allowed: true,
        updatedAt: new Date(),
      },
    ]);

    const m = await loadWorkspaceMatrix(ws, "polier");
    expect(m.get(permKey("lv", "write"))).toBe(true);
    expect(m.size).toBe(1);
  });

  it("User-Override schlägt Workspace-Matrix in DB-Pfad", async () => {
    const ws = await createTestWorkspace("override-vs-matrix");
    createdWorkspaceIds.push(ws);

    // Matrix verbietet bautagebuch:write für polier (gegen Default)
    await db.insert(schema.permissionsMatrix).values({
      id: genId("pm"),
      workspaceId: ws,
      role: "polier",
      resource: "bautagebuch",
      action: "write",
      allowed: false,
      updatedAt: new Date(),
    });

    // Override erlaubt es trotzdem
    const polier = await createTestUser(ws, "polier", [
      { resource: "bautagebuch", action: "write", allowed: true },
    ]);
    createdUserIds.push(polier.id);

    expect(await can(polier.id, "bautagebuch", "write")).toBe(true);
  });
});
