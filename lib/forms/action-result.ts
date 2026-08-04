import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | {
      ok: false;
      code: string;
      formError?: string;
      fieldErrors?: Record<string, string[]>;
    };

export function zodActionError(
  error: ZodError,
  code = "VALIDATION_ERROR",
): ActionResult<never> {
  return {
    ok: false,
    code,
    fieldErrors: error.flatten().fieldErrors as Record<string, string[]>,
  };
}

export function actionError(
  code: string,
  formError: string,
): ActionResult<never> {
  return { ok: false, code, formError };
}
