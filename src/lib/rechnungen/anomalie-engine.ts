/**
 * Backwards-Compat-Fassade. Die Logik ist in drei Module aufgeteilt:
 *
 *   anomaly-rules.ts    — pure (testbar ohne DB)
 *   anomaly-score.ts    — pure Aggregation
 *   anomaly-persist.ts  — DB-Side-Effects (server-only)
 *
 * Bevorzugt direkt aus den jeweiligen Modulen importieren. Diese Datei bleibt
 * bestehen, damit ältere Imports nicht brechen.
 */
export {
  findMathErrors,
  findPriceJumps,
  findPositionsNotInContract,
  type AnomalyFinding,
} from "./anomaly-rules";
export { aggregateAnomalyScore } from "./anomaly-score";
export { analyzeRechnung, type AnomalyReport } from "./anomaly-persist";
