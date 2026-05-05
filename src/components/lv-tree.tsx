import { Link } from "@/i18n/navigation";
import {
  LV_ITEM_KIND_LABEL,
  isOptionalKind,
  type LvNode,
} from "@/lib/lv";
import { fmtMoney } from "@/lib/utils";

const KIND_TONE: Record<string, string> = {
  titel: "bg-[color:var(--color-bg-subtle)] font-semibold text-[color:var(--color-fg)]",
  untertitel: "bg-[color:var(--color-bg-subtle)]/50 font-medium",
  position: "",
  eventual: "italic text-[color:var(--color-fg-muted)]",
  bedarfsposition: "italic text-[color:var(--color-fg-muted)]",
  stundenlohn: "italic",
};

export function LvTree({
  nodes,
  projectId,
}: {
  nodes: LvNode[];
  projectId: string;
}) {
  if (nodes.length === 0) {
    return (
      <p className="text-sm text-[color:var(--color-fg-muted)] italic">
        Keine Positionen.
      </p>
    );
  }
  return (
    <div className="border border-[color:var(--color-border)] rounded-md overflow-hidden">
      <div className="grid grid-cols-12 gap-2 bg-[color:var(--color-bg-subtle)] border-b border-[color:var(--color-border)] py-2 px-3 font-mono text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-fg-muted)]">
        <div className="col-span-2">OZ</div>
        <div className="col-span-5">Bezeichnung</div>
        <div className="col-span-1 text-right">Menge</div>
        <div className="col-span-1">EH</div>
        <div className="col-span-1 text-right">EP</div>
        <div className="col-span-2 text-right">GP</div>
      </div>
      <div className="divide-y divide-[color:var(--color-border)]">
        {nodes.map((node) => (
          <Row
            key={node.id}
            node={node}
            depth={0}
            projectId={projectId}
          />
        ))}
      </div>
    </div>
  );
}

function Row({
  node,
  depth,
  projectId,
}: {
  node: LvNode;
  depth: number;
  projectId: string;
}) {
  const isStruct = node.kind === "titel" || node.kind === "untertitel";
  const optional = isOptionalKind(node.kind);
  const indent = depth * 16;

  return (
    <>
      <div
        className={`grid grid-cols-12 gap-2 py-2 px-3 text-sm ${KIND_TONE[node.kind] ?? ""}`}
      >
        <div className="col-span-2 font-mono text-xs">
          <span style={{ paddingLeft: indent }}>{node.oz ?? ""}</span>
        </div>
        <div className="col-span-5">
          {isStruct ? (
            <span>{node.shortText}</span>
          ) : (
            <Link
              href={`/projekte/${projectId}/lv/${node.id}/edit`}
              className="hover:text-[color:var(--color-accent)] transition-colors"
            >
              {node.shortText}
            </Link>
          )}
          {optional ? (
            <span className="ml-2 font-mono text-[9px] uppercase tracking-[0.12em] border rounded-sm px-1 py-0.5 bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)] border-[color:var(--color-warning-border)]">
              {LV_ITEM_KIND_LABEL[node.kind]}
            </span>
          ) : null}
          {node.longText ? (
            <details className="mt-1">
              <summary className="text-[10px] text-[color:var(--color-fg-muted)] cursor-pointer hover:text-[color:var(--color-accent)]">
                Langtext
              </summary>
              <pre className="mt-1 text-[11px] text-[color:var(--color-fg-muted)] whitespace-pre-wrap font-sans leading-relaxed">
                {node.longText}
              </pre>
            </details>
          ) : null}
        </div>
        <div className="col-span-1 text-right font-mono text-xs">
          {node.quantity !== null
            ? node.quantity.toLocaleString("de-DE")
            : ""}
        </div>
        <div className="col-span-1 font-mono text-xs">
          {node.unit ?? ""}
        </div>
        <div className="col-span-1 text-right font-mono text-xs">
          {node.unitPrice !== null ? fmtMoney(node.unitPrice) : ""}
        </div>
        <div className="col-span-2 text-right font-mono text-xs font-medium">
          {node.totalPrice !== null ? fmtMoney(node.totalPrice) : ""}
        </div>
      </div>
      {node.children.map((child) => (
        <Row
          key={child.id}
          node={child}
          depth={depth + 1}
          projectId={projectId}
        />
      ))}
    </>
  );
}
