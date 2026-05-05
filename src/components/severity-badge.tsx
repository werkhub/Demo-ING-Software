// Backwards-Kompatibilität: alte Importe auf das neue Prioritaets-Badge umlenken.
// Mit Migration 0029 wurde `severity` (wesentlich/unwesentlich/optisch) durch
// `prioritaet` (niedrig/mittel/hoch/kritisch) ersetzt.
export { PrioritaetBadge as SeverityBadge } from "./prioritaet-badge";
