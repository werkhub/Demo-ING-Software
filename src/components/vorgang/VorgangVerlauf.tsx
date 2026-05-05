import type { VorgangAuditEntry } from "@/db/schema";

const ACTION_LABEL: Record<string, string> = {
  created: "Vorgang angelegt",
  updated: "Metadaten geändert",
  status_changed: "Status geändert",
  document_uploaded: "Dokument hochgeladen",
  document_deleted: "Dokument entfernt",
  classified: "Auto-Klassifikation",
  draft_saved: "Entwurf gespeichert",
  draft_sent: "Entwurf versendet",
  draft_discarded: "Entwurf verworfen",
  link_added: "Verknüpfung hinzugefügt",
  link_removed: "Verknüpfung entfernt",
};

function summarizePayload(action: string, raw: string): string {
  try {
    const data = JSON.parse(raw);
    if (action === "status_changed" && data.from && data.to) {
      return `${data.from} → ${data.to}`;
    }
    if (action === "document_uploaded" && data.fileName) return String(data.fileName);
    if (action === "document_deleted" && data.fileName) return String(data.fileName);
    if (action === "draft_sent" && data.subject) return String(data.subject);
    if (action === "link_added" && data.targetKind) {
      return `${data.targetKind}: ${data.targetId}`;
    }
    if (action === "link_removed" && data.targetKind) {
      return `${data.targetKind}: ${data.targetId}`;
    }
    if (action === "classified" && data.category) {
      const conf = typeof data.confidence === "number" ? Math.round(data.confidence * 100) : null;
      return `${data.category}${conf !== null ? ` (${conf} %)` : ""}`;
    }
    if (action === "updated" && Array.isArray(data.changes)) {
      return data.changes.join(", ");
    }
    if (action === "created" && data.title) return String(data.title);
  } catch {
    /* ignore */
  }
  return "";
}

export function VorgangVerlauf({ entries }: { entries: VorgangAuditEntry[] }) {
  if (entries.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)] py-6 text-center border border-dashed border-[color:var(--color-border)] rounded-md">
        Kein Audit-Log vorhanden.
      </p>
    );
  }
  return (
    <ol className="relative border-l border-[color:var(--color-border)] ml-2 pl-5 space-y-4">
      {entries.map((e) => (
        <li key={e.id} className="relative">
          <span
            aria-hidden
            className="absolute -left-[27px] top-1 h-2 w-2 rounded-full bg-[color:var(--color-accent)] border border-[color:var(--color-bg)]"
          />
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <p className="text-sm font-medium text-[color:var(--color-fg)]">
              {ACTION_LABEL[e.action] ?? e.action}
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
              {e.createdAt.toLocaleString("de-DE")}
            </p>
          </div>
          {summarizePayload(e.action, e.payloadJson) ? (
            <p className="text-xs text-[color:var(--color-fg-muted)] mt-0.5">
              {summarizePayload(e.action, e.payloadJson)}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
