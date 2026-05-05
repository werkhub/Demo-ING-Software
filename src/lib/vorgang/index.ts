/**
 * Domain-Bündel für Vorgänge. Zerlegt in:
 *
 *   risk-score.ts  — pure Heuristik (testbar)
 *   classifier.ts  — pure Schlagwort-Klassifikation (testbar)
 *   labels.ts      — UI-Konstanten (Labels, Toner)
 *   persist.ts     — DB-Side-Effects (Audit, Risk-Recompute) [server-only]
 *
 * Aus Backwards-Compat-Gründen werden die pure und UI-Module re-exportiert,
 * sodass `import { computeVorgangRiskScore } from "@/lib/vorgang"` weiterläuft.
 */
export * from "./risk-score";
export * from "./classifier";
export * from "./labels";
