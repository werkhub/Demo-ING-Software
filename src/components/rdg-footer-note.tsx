import { RDG_SHORT } from "@/lib/legal/rdg";

export function RdgFooterNote({ className }: { className?: string }) {
  return (
    <p
      className={
        "text-[11px] text-[color:var(--color-fg-muted)] italic leading-relaxed " +
        (className ?? "")
      }
    >
      {RDG_SHORT}
    </p>
  );
}
