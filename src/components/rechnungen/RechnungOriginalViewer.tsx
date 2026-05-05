import { Link } from "@/i18n/navigation";

export function RechnungOriginalViewer({
  rechnungId,
  fileName,
  mimeType,
}: {
  rechnungId: string;
  fileName: string | null;
  mimeType?: string | null;
}) {
  if (!fileName) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)] py-8 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
        Keine Originaldatei hinterlegt.
      </p>
    );
  }
  const src = `/api/rechnungen/${rechnungId}/file`;
  if (mimeType && mimeType.startsWith("image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={fileName}
        className="w-full max-h-[80vh] object-contain rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)]"
      />
    );
  }
  return (
    <div>
      <iframe
        src={src}
        title={fileName}
        className="w-full h-[80vh] rounded-md border border-[color:var(--color-border)] bg-[color:var(--color-bg)]"
      />
      <Link
        href={src}
        target="_blank"
        className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-accent)] hover:underline"
      >
        In neuem Tab öffnen ↗
      </Link>
    </div>
  );
}
