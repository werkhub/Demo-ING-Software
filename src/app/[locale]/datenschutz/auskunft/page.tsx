import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Container } from "@/components/container";
import {
  getCurrentUserId,
  getCurrentWorkspaceId,
} from "@/lib/session";
import { AuskunftForm } from "./form";

export const dynamic = "force-dynamic";

export default async function AuskunftPage() {
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
        <h1 className="text-2xl font-medium">DSGVO-Auskunft (Art. 15)</h1>
        <p className="text-sm text-[color:var(--color-muted-foreground)] mt-2">
          Personenbezogene Daten zu einer E-Mail, einem Namen oder einer
          Telefonnummer aus dem Workspace zusammenstellen. Die Auskunft umfasst
          User, NU-Stamm, Projekt-Kontakte und Mitarbeiterstamm.
        </p>
        <p className="text-xs text-[color:var(--color-muted-foreground)] mt-2">
          HinSchG-Meldungen sind aus &sect; 11 HinSchG ausgenommen.
          Ausgangsrechnungs-Stammdaten unterliegen der 10-J-Aufbewahrungs-Pflicht
          nach &sect; 147 AO und werden hier dokumentiert, bleiben aber bei
          Anonymisierung unber&uuml;hrt.
        </p>
      </header>

      <AuskunftForm />
    </Container>
  );
}
