import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import { diffFields, logChange, logRead } from "./log";

/**
 * Integration-Test gegen ./data/lexbau.db. Räumt nach jedem Lauf wieder auf.
 */
const TEST_PREFIX = "test-audit";

let workspaceId: string;
let userId: string;

beforeAll(async () => {
  workspaceId = `${TEST_PREFIX}-ws-${genId("ws")}`;
  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: "Audit-Test-Workspace",
  });
  userId = `${TEST_PREFIX}-u-${genId("u")}`;
  await db.insert(schema.users).values({
    id: userId,
    workspaceId,
    name: "Audit-Tester",
    email: `${userId}@test.local`,
    role: "admin",
  });
});

afterAll(async () => {
  // FK-cascade räumt audit_log + users automatisch auf.
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));
});

describe("diffFields", () => {
  it("liefert leere Liste bei identischen Snapshots", () => {
    expect(diffFields({ a: 1, b: "x" }, { a: 1, b: "x" })).toEqual([]);
  });

  it("erkennt Änderungen", () => {
    expect(diffFields({ a: 1, b: "x" }, { a: 2, b: "x" })).toEqual(["a"]);
  });

  it("erkennt nullable-Übergänge", () => {
    expect(diffFields({ a: null }, { a: "neu" })).toEqual(["a"]);
  });

  it("ignoriert null↔undefined als gleich", () => {
    expect(
      diffFields(
        { a: null, b: 1 },
        { a: undefined, b: 1 }
      )
    ).toEqual([]);
  });

  it("vergleicht Date-Objekte über getTime()", () => {
    const t = new Date("2026-04-01T12:00:00Z");
    expect(
      diffFields({ d: t }, { d: new Date("2026-04-01T12:00:00Z") })
    ).toEqual([]);
    expect(
      diffFields({ d: t }, { d: new Date("2026-04-02T12:00:00Z") })
    ).toEqual(["d"]);
  });
});

describe("logChange", () => {
  it("schreibt create-Eintrag mit after-Snapshot, ohne before/fields", async () => {
    const entityId = `${TEST_PREFIX}-vg-${genId("vg")}`;
    await logChange({
      workspaceId,
      entityType: "vorgang",
      entityId,
      action: "create",
      after: { id: entityId, title: "Neu" },
      ctx: { userId, ipAddr: "1.2.3.4", userAgent: "vitest" },
    });
    const [row] = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.workspaceId, workspaceId),
          eq(schema.auditLog.entityId, entityId)
        )
      )
      .orderBy(asc(schema.auditLog.createdAt))
      .limit(1);
    expect(row).toBeTruthy();
    expect(row.action).toBe("create");
    expect(row.beforeJson).toBeNull();
    expect(row.afterJson).toContain('"title":"Neu"');
    expect(row.fieldsChangedJson).toBeNull();
    expect(row.ipAddr).toBe("1.2.3.4");
    expect(row.userAgent).toBe("vitest");
    expect(row.userId).toBe(userId);
  });

  it("schreibt update-Eintrag mit fields_changed_json", async () => {
    const entityId = `${TEST_PREFIX}-vg-${genId("vg")}`;
    await logChange({
      workspaceId,
      entityType: "vorgang",
      entityId,
      action: "update",
      before: { id: entityId, title: "Alt", riskScore: 10 },
      after: { id: entityId, title: "Neu", riskScore: 10 },
      ctx: { userId, ipAddr: null, userAgent: null },
    });
    const [row] = await db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.workspaceId, workspaceId),
          eq(schema.auditLog.entityId, entityId)
        )
      )
      .limit(1);
    expect(row.fieldsChangedJson).toBe('["title"]');
    expect(row.beforeJson).toContain('"title":"Alt"');
    expect(row.afterJson).toContain('"title":"Neu"');
  });

  it("schreibt delete-Eintrag ohne after-Snapshot", async () => {
    const entityId = `${TEST_PREFIX}-vg-${genId("vg")}`;
    await logChange({
      workspaceId,
      entityType: "vorgang",
      entityId,
      action: "delete",
      before: { id: entityId, title: "Zum Löschen" },
      ctx: null,
    });
    const [row] = await db
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.entityId, entityId))
      .limit(1);
    expect(row.action).toBe("delete");
    expect(row.afterJson).toBeNull();
    expect(row.beforeJson).toContain("Zum Löschen");
    expect(row.userId).toBeNull();
  });
});

describe("logRead", () => {
  it("schreibt read_sensitive ohne before/after", async () => {
    const entityId = `${TEST_PREFIX}-prj-${genId("p")}`;
    await logRead({
      workspaceId,
      entityType: "project",
      entityId,
      ctx: { userId, ipAddr: null, userAgent: null },
      reason: "Vertrauliches Projekt",
    });
    const [row] = await db
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.entityId, entityId))
      .limit(1);
    expect(row.action).toBe("read_sensitive");
    expect(row.beforeJson).toBeNull();
    expect(row.afterJson).toBeNull();
    expect(row.reason).toBe("Vertrauliches Projekt");
  });
});
