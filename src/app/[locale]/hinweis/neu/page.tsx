import { Link } from "@/i18n/navigation";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { MeldungForm } from "./meldung-form";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Meldung einreichen",
};

export default async function NeueMeldungPage({
  searchParams,
}: {
  searchParams: Promise<{ ws?: string }>;
}) {
  const { ws } = await searchParams;
  if (!ws) redirect("/hinweis");

  const [workspace] = await db
    .select({
      id: schema.workspaces.id,
      name: schema.workspaces.name,
      enabled: schema.workspaces.hinschgEnabled,
    })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.id, ws))
    .limit(1);

  if (!workspace || !workspace.enabled) redirect("/hinweis");

  return (
    <div className="min-h-screen bg-[color:var(--color-bg)] text-[color:var(--color-fg)]">
      <header className="border-b border-[color:var(--color-border)] py-6">
        <div className="max-w-3xl mx-auto px-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
            Meldestelle · {workspace.name}
          </p>
          <p className="text-base font-semibold mt-1">
            Neue Meldung einreichen
          </p>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <p className="text-sm text-[color:var(--color-fg-muted)] mb-8 max-w-2xl leading-relaxed">
          Bitte geben Sie nur Tatsachen an, die Sie selbst beobachtet haben oder
          aus verlässlicher Quelle kennen. Falsche Verdächtigungen können
          rechtliche Konsequenzen haben (§ 38 HinSchG i. V. m. § 164 StGB).
        </p>

        <MeldungForm workspaceId={workspace.id} />

        <div className="mt-8">
          <Link
            href="/hinweis"
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück
          </Link>
        </div>
      </main>
    </div>
  );
}
