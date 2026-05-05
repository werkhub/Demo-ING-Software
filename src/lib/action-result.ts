export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; formError?: string; fieldErrors?: Record<string, string[]> };

export const ok = <T>(data: T): ActionResult<T> => ({ ok: true, data });

export const fail = (
  formError: string,
  fieldErrors?: Record<string, string[]>
): ActionResult<never> => ({ ok: false, formError, fieldErrors });

export const fieldFail = (
  fieldErrors: Record<string, string[]>
): ActionResult<never> => ({ ok: false, fieldErrors });
