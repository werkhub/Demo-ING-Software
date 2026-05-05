import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { Container } from "@/components/container";
import { getMangel, getProjectById } from "@/db/queries";
import { mangelTitle } from "@/lib/maengel";
import { createMangelAnzeige } from "../../../actions";

export const dynamic = "force-dynamic";

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function MangelAnzeigeNewPage({
  params,
}: {
  params: Promise<{ id: string; mangelId: string }>;
}) {
  const { id, mangelId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const m = await getMangel(mangelId);
  if (!m || m.projectId !== project.id) notFound();

  return (
    <Container>
      <section className="pt-14 pb-8">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name}
        </p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tighter">
          Anzeige erfassen
        </h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Mangel: {mangelTitle(m)}
        </p>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/maengel/${m.id}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zum Mangel
          </Link>
        </div>
      </section>

      <section className="pb-16">
        <form
          action={createMangelAnzeige}
          className="border border-[color:var(--color-border)] rounded-md p-6 space-y-5 max-w-3xl"
        >
          <input type="hidden" name="mangelId" value={m.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <Field
              name="anzeigeAnExtern"
              label="Adressat (Name + Organisation)"
              placeholder="z. B. Bauleiter Müller, Baufirma XY GmbH"
            />
            <DateField
              name="versendetAm"
              label="Versendet am"
              defaultValue={isoToday()}
              required
            />
          </div>

          <Select
            name="versandweg"
            label="Versandweg"
            defaultValue="email"
            options={[
              { value: "email", label: "E-Mail" },
              { value: "brief", label: "Brief" },
              { value: "einschreiben", label: "Einschreiben" },
              { value: "uebergabe", label: "Persönliche Übergabe" },
            ]}
          />

          <div>
            <Label htmlFor="inhaltText">Inhalt</Label>
            <textarea
              id="inhaltText"
              name="inhaltText"
              rows={8}
              required
              minLength={10}
              maxLength={10_000}
              placeholder="Wortlaut der Mängelrüge — als Beweismittel später vorlegbar."
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notizen (intern)</Label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              maxLength={2000}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <Link
              href={`/projekte/${id}/maengel/${m.id}`}
              className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] px-3 py-1.5 transition-colors"
            >
              Abbrechen
            </Link>
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-full bg-[color:var(--color-fg)] px-5 py-2 text-sm text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Anzeige speichern
            </button>
          </div>
        </form>
      </section>
    </Container>
  );
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
    >
      {children}
    </label>
  );
}

function Field({
  name,
  label,
  placeholder,
}: {
  name: string;
  label: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <input
        id={name}
        name={name}
        type="text"
        placeholder={placeholder}
        className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
      />
    </div>
  );
}

function DateField({
  name,
  label,
  defaultValue,
  required,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <input
        id={name}
        name={name}
        type="date"
        required={required}
        defaultValue={defaultValue}
        className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
      />
    </div>
  );
}

function Select({
  name,
  label,
  defaultValue,
  options,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <select
        id={name}
        name={name}
        defaultValue={defaultValue}
        className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
