import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/container";
import { getPlan, getProjectById, getVersionsByPlan } from "@/db/queries";
import { recordPlanVersand } from "../../../actions";

export const dynamic = "force-dynamic";

const labelClass =
  "font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]";
const inputClass =
  "mt-1 w-full rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)] px-3 py-2 text-sm text-[color:var(--color-fg)] focus:outline-none focus:border-[color:var(--color-accent)]";

async function recordRedirect(formData: FormData): Promise<void> {
  "use server";
  const result = await recordPlanVersand(null, formData);
  const projektId = String(formData.get("_projektId") ?? "");
  const planId = String(formData.get("_planId") ?? "");
  if (!result.ok) {
    redirect(
      `/projekte/${projektId}/plaene/${planId}/versand/new?error=${encodeURIComponent(result.formError ?? "Fehler")}`
    );
  }
  redirect(`/projekte/${projektId}/plaene/${planId}?versand=${result.data.id}`);
}

type SearchParams = Promise<{ versionId?: string; error?: string }>;

export default async function PlanVersandNewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; planId: string }>;
  searchParams: SearchParams;
}) {
  const { id, planId } = await params;
  const sp = await searchParams;
  const project = await getProjectById(id);
  if (!project) notFound();
  const plan = await getPlan(planId);
  if (!plan || plan.projektId !== id) notFound();

  const versionen = await getVersionsByPlan(planId);
  if (versionen.length === 0) {
    return (
      <Container size="narrow">
        <div className="pt-14 pb-16">
          <p className="text-sm text-[color:var(--color-fg-muted)]">
            Plan hat keine Versionen — kein Versand möglich.
          </p>
        </div>
      </Container>
    );
  }

  // Pre-Auswahl: aus URL oder aktuelle Version
  const preSelectVersionId =
    sp.versionId && versionen.find((v) => v.id === sp.versionId)
      ? sp.versionId
      : (plan.aktuelleVersionId ?? versionen[versionen.length - 1].id);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <Container size="narrow">
      <div className="pt-14 pb-16">
        <Link
          href={`/projekte/${id}/plaene/${plan.id}`}
          className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-accent)] transition-colors inline-flex items-center gap-1 mb-7"
        >
          ← Zurück zum Plan
        </Link>

        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          Plan-Versand · {plan.planNr}
        </p>
        <h1 className="mt-4 text-3xl md:text-4xl font-semibold tracking-tighter">
          Versand erfassen
        </h1>
        <p className="mt-3 text-sm text-[color:var(--color-fg-muted)]">
          Beweissichere Doku, wer welche Version wann erhalten hat. Wichtig
          bei Honorarstreit und Mängelhaftung.
        </p>

        {sp.error ? (
          <div className="mt-6 rounded-md border border-[color:var(--color-critical-border)] bg-[color:var(--color-critical-soft)] px-4 py-3 text-sm text-[color:var(--color-critical)]">
            {sp.error}
          </div>
        ) : null}

        <form action={recordRedirect} className="mt-10 space-y-5">
          <input type="hidden" name="_projektId" value={id} />
          <input type="hidden" name="_planId" value={plan.id} />

          <div>
            <label className={labelClass}>Plan-Version *</label>
            <select
              name="planVersionId"
              required
              defaultValue={preSelectVersionId}
              className={inputClass}
            >
              {versionen.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.indexLabel ?? `v${v.versionNr}`} ·{" "}
                  {v.datum ?? "kein Datum"}
                  {v.id === plan.aktuelleVersionId ? " (aktuell)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Empfänger-Name *</label>
              <input
                name="empfaengerName"
                required
                minLength={2}
                maxLength={200}
                placeholder="z.B. Müller GmbH (Bauherr)"
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Empfänger-Rolle</label>
              <input
                name="empfaengerRolle"
                maxLength={80}
                placeholder="Bauherr, Statiker, GU, Polier"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>E-Mail (optional)</label>
            <input
              name="empfaengerEmail"
              type="email"
              maxLength={200}
              placeholder="kontakt@..."
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Versand-Datum *</label>
              <input
                name="versandDatum"
                type="date"
                required
                defaultValue={today}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Versandweg *</label>
              <select
                name="versandweg"
                defaultValue="email"
                className={inputClass}
                required
              >
                <option value="email">E-Mail</option>
                <option value="brief">Brief</option>
                <option value="einschreiben">Einschreiben</option>
                <option value="uebergabe">Übergabe</option>
                <option value="upload">Cloud-Upload</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Betreff</label>
            <input
              name="betreff"
              maxLength={200}
              placeholder='z.B. Plan A.01 Index 4 zur Freigabe'
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Kommentar / Notiz</label>
            <textarea
              name="kommentar"
              rows={3}
              maxLength={2000}
              className={inputClass}
            />
          </div>

          <div className="flex items-center gap-3 pt-3">
            <button
              type="submit"
              className="rounded-full bg-[color:var(--color-fg)] px-5 py-2.5 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Versand erfassen
            </button>
            <Link
              href={`/projekte/${id}/plaene/${plan.id}`}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)]"
            >
              Abbrechen
            </Link>
          </div>
        </form>
      </div>
    </Container>
  );
}
