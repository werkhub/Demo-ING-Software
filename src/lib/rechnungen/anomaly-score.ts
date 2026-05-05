import type { AnomalieSeverity } from "@/db/schema";
import type { AnomalyFinding } from "./anomaly-rules";

/**
 * Pure-Funktion: Score-Aggregation aus Findings.
 *   critical = 30
 *   warning  = 12
 *   info     = 4
 * Score wird auf 100 gedeckelt.
 */
export function aggregateAnomalyScore(findings: AnomalyFinding[]): number {
  const weight: Record<AnomalieSeverity, number> = {
    critical: 30,
    warning: 12,
    info: 4,
  };
  const raw = findings.reduce((s, f) => s + weight[f.severity], 0);
  return Math.min(100, raw);
}
