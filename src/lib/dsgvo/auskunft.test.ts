import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { genId } from "@/lib/utils";
import {
  exportPersonalData,
  exportPersonalDataPdf,
  loeschPersonalData,
} from "./auskunft";

const TEST_PREFIX = "test-dsgvo";

let workspaceId: string;
let projectId: string;
let nuId: string;
let contactId: string;
let maId: string;

beforeAll(async () => {
  workspaceId = `${TEST_PREFIX}-ws-${genId("ws")}`;
  await db.insert(schema.workspaces).values({
    id: workspaceId,
    name: "DSGVO-Test",
  });

  projectId = `${TEST_PREFIX}-p-${genId("p")}`;
  await db.insert(schema.projects).values({
    id: projectId,
    workspaceId,
    identifier: "DSGVO-001",
    name: "Test-Projekt",
    ag: "Test-AG",
    value: 100000,
  });

  nuId = `${TEST_PREFIX}-nu-${genId("nu")}`;
  await db.insert(schema.subcontractors).values({
    id: nuId,
    workspaceId,
    projectId,
    name: "Maxine Mustermann",
    organization: "Mustermann Bau GmbH",
    gewerk: "Trockenbau",
    email: "maxine.mustermann@example.com",
    phone: "+49 89 1234567",
  });

  contactId = `${TEST_PREFIX}-c-${genId("c")}`;
  await db.insert(schema.projectContacts).values({
    id: contactId,
    workspaceId,
    projectId,
    role: "ag_vertreter",
    name: "Maxine Mustermann",
    email: "maxine.mustermann@example.com",
    phone: "+49 89 1234567",
  });

  maId = `${TEST_PREFIX}-ma-${genId("ma")}`;
  await db.insert(schema.mitarbeiter).values({
    id: maId,
    workspaceId,
    name: "Hans Helfer",
    personalnummer: "P-4711",
  });
});

afterAll(async () => {
  await db.delete(schema.workspaces).where(eq(schema.workspaces.id, workspaceId));
});

describe("exportPersonalData", () => {
  it("findet Person über mehrere Tabellen via E-Mail", async () => {
    const bundle = await exportPersonalData(
      workspaceId,
      "maxine.mustermann@example.com"
    );
    const buckets = bundle.findings.map((f) => f.bucket);
    expect(buckets).toContain("subcontractors");
    expect(buckets).toContain("projectContacts");
    // Hans Helfer matcht E-Mail nicht — also kein mitarbeiter-Treffer.
    expect(buckets).not.toContain("mitarbeiter");
  });

  it("findet Person über Name", async () => {
    const bundle = await exportPersonalData(workspaceId, "Hans Helfer");
    expect(bundle.findings.some((f) => f.bucket === "mitarbeiter")).toBe(true);
  });

  it("hat Hinweise zu HinSchG/§147 AO", async () => {
    const bundle = await exportPersonalData(workspaceId, "Mustermann");
    expect(bundle.notes.length).toBeGreaterThan(0);
    expect(bundle.notes.join(" ")).toContain("HinSchG");
    expect(bundle.notes.join(" ")).toContain("147 AO");
  });

  it("rejectet leeren Identifier", async () => {
    await expect(
      exportPersonalData(workspaceId, "  ")
    ).rejects.toThrow();
  });
});

describe("exportPersonalDataPdf", () => {
  it("erzeugt ein PDF mit %PDF-Header", async () => {
    const bytes = await exportPersonalDataPdf(workspaceId, "Mustermann");
    expect(bytes.length).toBeGreaterThan(100);
    const head = String.fromCharCode(...bytes.slice(0, 5));
    expect(head).toBe("%PDF-");
  });
});

describe("loeschPersonalData", () => {
  it("verweigert ohne reason", async () => {
    await expect(
      loeschPersonalData({
        workspaceId,
        identifier: "Mustermann",
        reason: "",
      })
    ).rejects.toThrow();
  });

  it("anonymisiert NU + Kontakt, lässt MA bei except aus", async () => {
    const result = await loeschPersonalData({
      workspaceId,
      identifier: "Mustermann",
      reason: "Test-Antrag #001",
      except: ["mitarbeiter"],
    });
    const subBucket = result.buckets.find((b) => b.bucket === "subcontractors");
    expect(subBucket?.affected).toBeGreaterThanOrEqual(1);

    const [nuAfter] = await db
      .select()
      .from(schema.subcontractors)
      .where(eq(schema.subcontractors.id, nuId))
      .limit(1);
    expect(nuAfter.email).toBeNull();
    expect(nuAfter.phone).toBeNull();
    expect(nuAfter.name.startsWith("Anonymisiert")).toBe(true);

    const [contactAfter] = await db
      .select()
      .from(schema.projectContacts)
      .where(eq(schema.projectContacts.id, contactId))
      .limit(1);
    expect(contactAfter.email).toBeNull();
    expect(contactAfter.name.startsWith("Anonymisiert")).toBe(true);

    // mitarbeiter sollte unangetastet bleiben (except)
    const [maAfter] = await db
      .select()
      .from(schema.mitarbeiter)
      .where(eq(schema.mitarbeiter.id, maId))
      .limit(1);
    expect(maAfter.name).toBe("Hans Helfer");
  });

  it("schreibt audit_log-Eintrag für anonymisierte Subcontractors", async () => {
    const rows = await db
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.entityId, nuId));
    const anonRow = rows.find((r) =>
      r.reason?.includes("DSGVO-Anonymisierung")
    );
    expect(anonRow).toBeTruthy();
    expect(anonRow?.entityType).toBe("subcontractor");
    expect(anonRow?.action).toBe("update");
  });
});
