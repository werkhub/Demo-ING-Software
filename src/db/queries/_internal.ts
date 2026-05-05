import "server-only";
import { daysUntilDeadline, urgencyFromDays } from "@/lib/utils";

export const URGENCY_RANK = { critical: 0, warning: 1, info: 2 } as const;

/**
 * Reichert ein Frist-artiges Row-Objekt um abgeleitete Felder an
 * (daysRemaining, urgency). Wird in mehreren Domain-Queries verwendet.
 */
export function withDerivedFields<T extends { deadline: string }>(row: T) {
  const days = daysUntilDeadline(row.deadline);
  const urgency = urgencyFromDays(days);
  return { ...row, daysRemaining: days, urgency };
}
