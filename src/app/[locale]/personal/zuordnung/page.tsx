/**
 * Mitarbeiter ↔ Projekt-Zuordnung — Stamm-/Planbasis ergänzend zur
 * tagesgenauen Stunden-Buchung. Aktuell minimal: Liste + Formular + Löschen.
 */
import { getTranslations } from "next-intl/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/container";
import { db, schema } from "@/db";
import { getCurrentWorkspaceId } from "@/lib/session";
import { createZuordnung, deleteZuordnung } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = await getTranslations("modules.personal.zuordnung");
  return { title: t("title") };
}

type SearchParams = Promise<{
  error?: string;
  created?: string;
  deleted?: string;
}>;

export default async function ZuordnungPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const workspaceId = await getCurrentWorkspaceId();
  const t = await getTranslations("modules.personal.zuordnung");

  const [mitarbeiterRows, projekteRows, zuordnungRows] = await Promise.all([
    db
      .select({
        id: schema.mitarbeiter.id,
        name: schema.mitarbeiter.name,
        gewerk: schema.mitarbeiter.gewerk,
      })
      .from(schema.mitarbeiter)
      .where(
        and(
          eq(schema.mitarbeiter.workspaceId, workspaceId),
          eq(schema.mitarbeiter.aktiv, true)
        )
      )
      .orderBy(asc(schema.mitarbeiter.name)),
    db
      .select({
        id: schema.projects.id,
        identifier: schema.projects.identifier,
        name: schema.projects.name,
      })
      .from(schema.projects)
      .where(eq(schema.projects.workspaceId, workspaceId))
      .orderBy(asc(schema.projects.name)),
    db
      .select({
        id: schema.mitarbeiterProjekte.id,
        mitarbeiterId: schema.mitarbeiterProjekte.mitarbeiterId,
        projektId: schema.mitarbeiterProjekte.projektId,
        rolle: schema.mitarbeiterProjekte.rolle,
        startDatum: schema.mitarbeiterProjekte.startDatum,
        endDatum: schema.mitarbeiterProjekte.endDatum,
        allokation: schema.mitarbeiterProjekte.allokation,
        notes: schema.mitarbeiterProjekte.notes,
        createdAt: schema.mitarbeiterProjekte.createdAt,
        maName: schema.mitarbeiter.name,
        maGewerk: schema.mitarbeiter.gewerk,
        projName: schema.projects.name,
        projIdentifier: schema.projects.identifier,
      })
      .from(schema.mitarbeiterProjekte)
      .leftJoin(
        schema.mitarbeiter,
        eq(schema.mitarbeiterProjekte.mitarbeiterId, schema.mitarbeiter.id)
      )
      .leftJoin(
        schema.projects,
        eq(schema.mitarbeiterProjekte.projektId, schema.projects.id)
      )
      .where(eq(schema.mitarbeiterProjekte.workspaceId, workspaceId))
      .orderBy(desc(schema.mitarbeiterProjekte.createdAt)),
  ]);

  const canCreate = mitarbeiterRows.length > 0 && projekteRows.length > 0;

  return (
    <Container>
      <section className="pt-14 pb-10">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {t("kicker")}
        </p>
        <h1 className="mt-4 text-4xl md:text-5xl font-semibold tracking-tighter">
          {t("title")}
        </h1>
        <p className="mt-4 max-w-2xl text-base text-[color:var(--color-fg-muted)]">
          {t("intro")}
        </p>
      </section>

      {sp.error ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
          {sp.error}
        </div>
      ) : null}
      {sp.created === "1" ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-success-border)] bg-[color:var(--color-success-soft)] px-4 py-3 text-sm text-[color:var(--color-success)]">
          {t("toastCreated")}
        </div>
      ) : null}
      {sp.deleted === "1" ? (
        <div className="mb-6 rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg-subtle)] px-4 py-3 text-sm text-[color:var(--color-fg-muted)]">
          {t("toastDeleted")}
        </div>
      ) : null}

      <section className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href="/personal"
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          ← {t("backToHub")}
        </Link>
        <Link
          href="/stunden/mitarbeiter"
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          {t("manageEmployees")}
        </Link>
        <Link
          href="/projekte"
          className="rounded-full border border-[color:var(--color-border)] px-4 py-1.5 text-xs hover:bg-[color:var(--color-bg-subtle)] transition-colors"
        >
          {t("manageProjects")}
        </Link>
      </section>

      <section className="mb-10 border border-[color:var(--color-border)] p-6">
        <h2 className="text-sm font-semibold tracking-tight mb-4">
          {t("form.title")}
        </h2>
        {!canCreate ? (
          <p className="text-xs text-[color:var(--color-fg-muted)]">
            {t("form.requirementsHint")}
          </p>
        ) : (
          <form action={createZuordnung} className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                {t("form.fields.mitarbeiter")} *
              </span>
              <select
                name="mitarbeiterId"
                required
                className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm rounded-sm"
              >
                {mitarbeiterRows.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                    {m.gewerk ? ` · ${m.gewerk}` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                {t("form.fields.projekt")} *
              </span>
              <select
                name="projektId"
                required
                className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm rounded-sm"
              >
                {projekteRows.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.identifier} · {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                {t("form.fields.rolle")}
              </span>
              <input
                type="text"
                name="rolle"
                placeholder={t("form.placeholders.rolle")}
                className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm rounded-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                {t("form.fields.allokation")}
              </span>
              <input
                type="number"
                name="allokation"
                step="0.05"
                min="0.05"
                max="1"
                defaultValue="1"
                className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm rounded-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                {t("form.fields.startDatum")}
              </span>
              <input
                type="date"
                name="startDatum"
                className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm rounded-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs">
              <span className="font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                {t("form.fields.endDatum")}
              </span>
              <input
                type="date"
                name="endDatum"
                className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm rounded-sm"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs md:col-span-2">
              <span className="font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)]">
                {t("form.fields.notes")}
              </span>
              <input
                type="text"
                name="notes"
                placeholder={t("form.placeholders.notes")}
                className="border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm rounded-sm"
              />
            </label>
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                className="rounded-full bg-[color:var(--color-fg)] px-5 py-1.5 text-xs text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                {t("form.submit")}
              </button>
            </div>
          </form>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold tracking-tight mb-4">
          {t("list.title", { n: zuordnungRows.length })}
        </h2>
        {zuordnungRows.length === 0 ? (
          <div className="border border-dashed border-[color:var(--color-border)] rounded-md p-12 text-center">
            <p className="text-sm text-[color:var(--color-fg-muted)]">
              {t("list.empty")}
            </p>
          </div>
        ) : (
          <div className="border border-[color:var(--color-border)] overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[color:var(--color-bg-subtle)] text-[color:var(--color-fg-muted)] font-mono text-[10px] uppercase tracking-[0.18em]">
                <tr>
                  <th className="px-3 py-3 text-left">
                    {t("list.headers.mitarbeiter")}
                  </th>
                  <th className="px-3 py-3 text-left">
                    {t("list.headers.projekt")}
                  </th>
                  <th className="px-3 py-3 text-left">
                    {t("list.headers.rolle")}
                  </th>
                  <th className="px-3 py-3 text-right">
                    {t("list.headers.allokation")}
                  </th>
                  <th className="px-3 py-3 text-left">
                    {t("list.headers.zeitraum")}
                  </th>
                  <th className="px-3 py-3 text-right" />
                </tr>
              </thead>
              <tbody>
                {zuordnungRows.map((z) => (
                  <tr
                    key={z.id}
                    className="border-t border-[color:var(--color-border)] hover:bg-[color:var(--color-bg-subtle)] transition-colors"
                  >
                    <td className="px-3 py-2.5">
                      <span className="text-[color:var(--color-fg)]">
                        {z.maName ?? "—"}
                      </span>
                      {z.maGewerk ? (
                        <span className="ml-2 font-mono text-[10px] text-[color:var(--color-fg-muted)] uppercase tracking-wider">
                          {z.maGewerk}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="font-mono text-[11px] text-[color:var(--color-fg-muted)]">
                        {z.projIdentifier ?? "—"}
                      </span>
                      <span className="ml-2 text-[color:var(--color-fg)]">
                        {z.projName ?? "—"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[color:var(--color-fg-muted)]">
                      {z.rolle ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums">
                      {z.allokation != null
                        ? `${Math.round((z.allokation ?? 0) * 100)} %`
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-[color:var(--color-fg-muted)] font-mono text-xs">
                      {z.startDatum ?? "—"}
                      {z.endDatum ? ` → ${z.endDatum}` : ""}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <form action={deleteZuordnung}>
                        <input type="hidden" name="id" value={z.id} />
                        <button
                          type="submit"
                          className="text-[10px] font-mono uppercase tracking-wider text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                        >
                          {t("list.delete")}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </Container>
  );
}
