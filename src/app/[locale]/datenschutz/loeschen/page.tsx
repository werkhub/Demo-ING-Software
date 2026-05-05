import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Container } from "@/components/container";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { LoeschForm } from "./form";

export const dynamic = "force-dynamic";

export default async function LoeschenPage() {
  const userId = await getCurrentUserId();
  const workspaceId = await getCurrentWorkspaceId();
  void workspaceId;
  const [me] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .limit(1);
  if (!me || me.role !== "admin") {
    redirect("/datenschutz");
  }

  return (
    <Container size="narrow">
      <header className="pt-8 pb-4">
        <h1 className="text-2xl font-medium">DSGVO-L&ouml;schung (Art. 17)</h1>
        <p className="text-sm text-[color:var(--color-muted-foreground)] mt-2">
          Anonymisiert personenbezogene Daten in den ausgew&auml;hlten Tabellen.
          Statt Hard-Delete werden Name, E-Mail, Telefon und freie Notizen mit
          Platzhaltern &uuml;berschrieben — Foreign-Keys (NU-Auftr&auml;ge,
          Rechnungen, Audit-Log) bleiben intakt.
        </p>
        <p className="text-xs text-[color:var(--color-muted-foreground)] mt-2">
          Stammdaten in Ausgangsrechnungen unterliegen &sect; 147 AO
          (10 J. Aufbewahrung) und werden NICHT &uuml;berschrieben.
          HinSchG-Meldungen folgen einem separaten Verfahren nach &sect; 11 HinSchG.
        </p>
      </header>

      <LoeschForm />
    </Container>
  );
}
