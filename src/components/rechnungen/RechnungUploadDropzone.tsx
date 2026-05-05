"use client";

import { useRef, useState, useTransition } from "react";
import { createRechnungWithUpload } from "@/app/[locale]/rechnungen/actions";

type ProjectOption = { id: string; identifier: string; name: string };

export function RechnungUploadDropzone({
  projects,
}: {
  projects: ProjectOption[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [supplierName, setSupplierName] = useState("");
  const [projectId, setProjectId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalNet, setTotalNet] = useState("");
  const [totalGross, setTotalGross] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function pickFile(f: File) {
    setFile(f);
    if (!supplierName) {
      const stem = f.name.replace(/\.[^.]+$/, "");
      setSupplierName(stem.split(/[_\-]/)[0]?.slice(0, 100) ?? "");
    }
  }

  function submit() {
    if (!supplierName) {
      setError("Bitte den Lieferantennamen erfassen.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        if (file) fd.set("file", file);
        fd.set("supplierName", supplierName);
        if (projectId) fd.set("projectId", projectId);
        if (invoiceDate) fd.set("invoiceDate", invoiceDate);
        if (dueDate) fd.set("dueDate", dueDate);
        if (totalNet) fd.set("totalNet", totalNet);
        if (totalGross) fd.set("totalGross", totalGross);
        await createRechnungWithUpload(fd);
      } catch (e) {
        if (e instanceof Error && e.message.includes("NEXT_REDIRECT")) return;
        setError(e instanceof Error ? e.message : "Anlage fehlgeschlagen.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f) pickFile(f);
        }}
        className={`block rounded-md border-2 border-dashed p-10 text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-[color:var(--color-accent)] bg-[color:var(--color-accent-soft)]"
            : "border-[color:var(--color-border)] bg-[color:var(--color-bg)] hover:border-[color:var(--color-accent)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept=".pdf,.xml,application/pdf,text/xml,application/xml"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) pickFile(f);
          }}
        />
        {file ? (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-accent)] mb-1">
              Datei bereit
            </p>
            <p className="text-base font-medium text-[color:var(--color-fg)] break-all">
              {file.name}
            </p>
            <p className="text-xs text-[color:var(--color-fg-muted)] mt-1">
              {Math.round(file.size / 1024)} KB · {file.type || "unbekannter Typ"}
            </p>
          </div>
        ) : (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[color:var(--color-fg-muted)] mb-2">
              Eingangsrechnung ablegen
            </p>
            <p className="text-base text-[color:var(--color-fg)]">
              PDF, ZUGFeRD-XML oder XRechnung
            </p>
            <p className="text-xs text-[color:var(--color-fg-muted)] mt-2">
              Drag-and-Drop oder klicken zum Auswählen
            </p>
          </div>
        )}
      </label>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Lieferant *" value={supplierName} onChange={setSupplierName} />
        <SelectField label="Projekt" value={projectId} onChange={setProjectId}>
          <option value="">— ohne Projekt —</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.identifier} · {p.name}
            </option>
          ))}
        </SelectField>
        <Field
          label="Rechnungsdatum (YYYY-MM-DD)"
          value={invoiceDate}
          onChange={setInvoiceDate}
          placeholder="2026-04-30"
        />
        <Field
          label="Fälligkeit (YYYY-MM-DD)"
          value={dueDate}
          onChange={setDueDate}
          placeholder="2026-05-30"
        />
        <Field
          label="Netto (EUR)"
          value={totalNet}
          onChange={setTotalNet}
          placeholder="12500.00"
        />
        <Field
          label="Brutto (EUR)"
          value={totalGross}
          onChange={setTotalGross}
          placeholder="14875.00"
        />
      </div>

      {error ? (
        <p className="text-sm text-[color:var(--color-critical)]">{error}</p>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="text-sm rounded-full bg-[color:var(--color-fg)] text-[color:var(--color-bg)] hover:bg-[color:var(--color-accent)] hover:text-white px-5 py-2.5 transition-colors disabled:opacity-50"
        >
          {isPending ? "Lege an…" : "Rechnung anlegen"}
        </button>
        <p className="text-[11px] text-[color:var(--color-fg-muted)]">
          Positionen werden im Detail manuell erfasst (oder durch späteren ZUGFeRD-Parser).
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 focus:outline-none focus:border-[color:var(--color-accent)]"
      />
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)] block mb-1.5">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm bg-[color:var(--color-bg)] border border-[color:var(--color-border)] rounded-md px-3 py-2 focus:outline-none focus:border-[color:var(--color-accent)]"
      >
        {children}
      </select>
    </label>
  );
}
