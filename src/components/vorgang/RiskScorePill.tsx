import { vorgangRiskTone } from "@/lib/vorgang";

export function RiskScorePill({
  score,
  reason,
  size = "sm",
}: {
  score: number;
  reason?: string;
  size?: "sm" | "md";
}) {
  const padding = size === "md" ? "px-2.5 py-1 text-[10px]" : "px-1.5 py-0.5 text-[9px]";
  return (
    <span
      title={reason}
      className={`inline-flex items-center justify-center font-mono uppercase tracking-[0.12em] border rounded-sm ${padding} ${vorgangRiskTone(score)}`}
    >
      {score}
    </span>
  );
}
