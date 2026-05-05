import { Link } from "@/i18n/navigation";
import { notFound, redirect } from "next/navigation";
import { Container } from "@/components/container";
import {
  getArPositionen,
  getAusgangsrechnung,
  getProjectById,
} from "@/db/queries";
import { isArEditable } from "@/lib/ausgangsrechnungen";
import { fmtMoney } from "@/lib/utils";
import {
  addArPositionVoid,
  deleteArPosition,
  updateArPosition,
  updateAusgangsrechnung,
} from "../../ar-actions";

export const dynamic = "force-dynamic";

export default async function ArEditPage({
  params,
}: {
  params: Promise<{ id: string; arId: string }>;
}) {
  const { id, arId } = await params;
  const project = await getProjectById(id);
  if (!project) notFound();
  const ar = await getAusgangsrechnung(arId);
  if (!ar || ar.projectId !== project.id) notFound();
  if (!isArEditable(ar.status)) {
    redirect(`/projekte/${id}/ausgangsrechnungen/${arId}`);
  }
  const positionen = await getArPositionen(arId);

  return (
    <Container>
      <section className="pt-14 pb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)]">
          {project.identifier} · {project.name} · {ar.number}
        </p>
        <h1 className="mt-3 text-2xl md:text-3xl font-semibold tracking-tighter">
          Rechnung bearbeiten
        </h1>
        <div className="mt-3">
          <Link
            href={`/projekte/${id}/ausgangsrechnungen/${arId}`}
            className="text-xs text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-fg)] transition-colors"
          >
            ← zurück zur Detail-Ansicht
          </Link>
        </div>
      </section>

      {/* Stammdaten-Form */}
      <section className="pb-10 max-w-3xl">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Stammdaten
        </p>
        <form action={updateAusgangsrechnung} className="space-y-4">
          <input type="hidden" name="id" value={ar.id} />

          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id="invoiceDate"
              label="Rechnungsdatum"
              type="date"
              required
              defaultValue={ar.invoiceDate}
              mono
            />
            <Input
              id="dueDate"
              label="Zahlungsziel"
              type="date"
              defaultValue={ar.dueDate ?? ""}
              mono
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id="serviceStart"
              label="Leistung von"
              type="date"
              defaultValue={ar.serviceStart ?? ""}
              mono
            />
            <Input
              id="serviceEnd"
              label="Leistung bis"
              type="date"
              defaultValue={ar.serviceEnd ?? ""}
              mono
            />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Input
              id="vatPercent"
              label="MwSt %"
              type="number"
              step="0.1"
              defaultValue={String(ar.vatPercent)}
              mono
            />
            <Input
              id="skontoPercent"
              label="Skonto %"
              type="number"
              step="0.1"
              defaultValue={ar.skontoPercent !== null ? String(ar.skontoPercent) : ""}
              mono
            />
            <Input
              id="skontoDays"
              label="Skonto-Tage"
              type="number"
              defaultValue={ar.skontoDays !== null ? String(ar.skontoDays) : ""}
              mono
            />
          </div>
          <Input
            id="subjectLine"
            label="Betreff"
            defaultValue={ar.subjectLine ?? ""}
          />
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              id="previousAbschlaegeNet"
              label="Vorherige Abschläge (€ netto)"
              type="number"
              step="0.01"
              defaultValue={String(ar.previousAbschlaegeNet)}
              mono
            />
            <Input
              id="securityRetentionPercent"
              label="Sicherheitseinbehalt %"
              type="number"
              step="0.1"
              defaultValue={
                ar.securityRetentionPercent !== null
                  ? String(ar.securityRetentionPercent)
                  : ""
              }
              mono
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Input id="partyAg" label="Auftraggeber" defaultValue={ar.partyAg ?? ""} />
            <Input
              id="partyAgAddress"
              label="AG-Anschrift"
              defaultValue={ar.partyAgAddress ?? ""}
            />
            <Input id="partyAn" label="Auftragnehmer" defaultValue={ar.partyAn ?? ""} />
            <Input
              id="partyAnAddress"
              label="AN-Anschrift"
              defaultValue={ar.partyAnAddress ?? ""}
            />
            <Input
              id="partyAnTaxId"
              label="Steuernummer"
              defaultValue={ar.partyAnTaxId ?? ""}
            />
            <Input
              id="partyAnVatId"
              label="USt-IdNr."
              defaultValue={ar.partyAnVatId ?? ""}
            />
            <Input
              id="buyerReference"
              label="Käufer-Referenz / Leitweg-ID (BT-10)"
              defaultValue={ar.buyerReference ?? ""}
              mono
            />
            <Input
              id="purchaseOrderRef"
              label="Bestellnummer AG (BT-13)"
              defaultValue={ar.purchaseOrderRef ?? ""}
              mono
            />
          </div>
          <div>
            <label
              htmlFor="schlusszahlungsVorbehalt"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Schlusszahlungs-Vorbehalt (§ 16 III S. 6 VOB/B, optional)
            </label>
            <textarea
              id="schlusszahlungsVorbehalt"
              name="schlusszahlungsVorbehalt"
              rows={2}
              maxLength={2000}
              defaultValue={ar.schlusszahlungsVorbehalt ?? ""}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="notes"
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
            >
              Interne Notizen
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              maxLength={2000}
              defaultValue={ar.notes ?? ""}
              className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] px-4 py-2 hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
            >
              Stammdaten speichern
            </button>
          </div>
        </form>
      </section>

      {/* Positionen-Liste mit Inline-Edit */}
      <section className="border-t border-[color:var(--color-border)] pt-8 pb-10">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-3">
          Positionen ({positionen.length})
        </p>

        {positionen.length === 0 ? null : (
          <ul className="space-y-3 mb-6">
            {positionen.map((p) => (
              <li
                key={p.id}
                className="border border-[color:var(--color-border)] rounded-md p-3"
              >
                <form
                  action={updateArPosition}
                  className="grid grid-cols-12 gap-2 items-end"
                >
                  <input type="hidden" name="id" value={p.id} />
                  <div className="col-span-2">
                    <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                      OZ
                    </label>
                    <input
                      name="oz"
                      defaultValue={p.oz ?? ""}
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-4">
                    <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                      Beschreibung
                    </label>
                    <input
                      name="description"
                      required
                      defaultValue={p.description}
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                      Menge
                    </label>
                    <input
                      name="quantity"
                      type="number"
                      step="0.001"
                      defaultValue={p.quantity ?? ""}
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                      EH
                    </label>
                    <input
                      name="unit"
                      defaultValue={p.unit ?? ""}
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                      EP
                    </label>
                    <input
                      name="unitPrice"
                      type="number"
                      step="0.01"
                      defaultValue={p.unitPrice ?? ""}
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="font-mono text-[9px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1">
                      MwSt %
                    </label>
                    <input
                      name="vatPercent"
                      type="number"
                      step="0.1"
                      defaultValue={p.vatPercent}
                      className="w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
                    />
                  </div>
                  <div className="col-span-1 text-right text-xs font-mono text-[color:var(--color-fg)] pb-1">
                    {p.totalPrice !== null ? fmtMoney(p.totalPrice) : "—"}
                  </div>
                  <div className="col-span-1 flex justify-end gap-1 pb-1">
                    <button
                      type="submit"
                      className="text-[10px] px-2 py-1 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] transition-colors"
                    >
                      ↻
                    </button>
                  </div>
                </form>
                <form action={deleteArPosition} className="mt-1 text-right">
                  <input type="hidden" name="id" value={p.id} />
                  <button
                    type="submit"
                    className="text-[10px] text-[color:var(--color-fg-muted)] hover:text-[color:var(--color-critical)] transition-colors"
                  >
                    Position löschen
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}

        {/* Position-Add-Form */}
        <form
          action={addArPositionVoid}
          className="border border-[color:var(--color-border)] rounded-md bg-[color:var(--color-bg-subtle)] p-4 space-y-3"
        >
          <input
            type="hidden"
            name="ausgangsrechnungId"
            value={ar.id}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
            + Neue Position
          </p>
          <div className="grid grid-cols-12 gap-2">
            <input
              name="oz"
              placeholder="OZ"
              className="col-span-2 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
            />
            <input
              name="description"
              required
              placeholder="Beschreibung"
              className="col-span-4 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs focus:border-[color:var(--color-accent)] focus:outline-none"
            />
            <input
              name="quantity"
              type="number"
              step="0.001"
              placeholder="Menge"
              className="col-span-1 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
            />
            <input
              name="unit"
              placeholder="EH"
              className="col-span-1 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
            />
            <input
              name="unitPrice"
              type="number"
              step="0.01"
              placeholder="EP"
              className="col-span-1 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
            />
            <input
              name="vatPercent"
              type="number"
              step="0.1"
              defaultValue={ar.vatPercent}
              placeholder="MwSt"
              className="col-span-1 bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-2 py-1 text-xs font-mono focus:border-[color:var(--color-accent)] focus:outline-none"
            />
            <div className="col-span-2 text-right">
              <button
                type="submit"
                className="text-xs px-3 py-1 rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white transition-colors"
              >
                + Hinzufügen
              </button>
            </div>
          </div>
        </form>
      </section>
    </Container>
  );
}

function Input({
  id,
  label,
  type = "text",
  step,
  required,
  defaultValue,
  mono,
}: {
  id: string;
  label: string;
  type?: string;
  step?: string;
  required?: boolean;
  defaultValue?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1"
      >
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        step={step}
        required={required}
        defaultValue={defaultValue}
        className={
          "w-full bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 text-sm focus:border-[color:var(--color-accent)] focus:outline-none " +
          (mono ? "font-mono" : "")
        }
      />
    </div>
  );
}
