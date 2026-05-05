import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db, schema } from "@/db";
import type { Workspace } from "@/db/schema";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function getCurrentWorkspaceId(): Promise<string> {
  const user = await requireUser();
  if (!user.workspaceId) {
    throw new Error("User ohne Workspace-Zuordnung — Datenbank-Inkonsistenz.");
  }
  return user.workspaceId;
}

export async function getCurrentUserId(): Promise<string> {
  const user = await requireUser();
  return user.id;
}

export async function getCurrentWorkspace(): Promise<Workspace> {
  const id = await getCurrentWorkspaceId();
  const [ws] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, id))
    .limit(1);
  if (!ws) {
    throw new Error("Workspace nicht gefunden.");
  }
  return ws;
}
