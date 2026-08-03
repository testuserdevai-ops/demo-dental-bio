"use client";

import type { RefObject } from "react";
import type {
  FieldValues,
  Path,
  UseFormClearErrors,
  UseFormSetError,
  UseFormSetFocus,
} from "react-hook-form";
import type { ActionResult } from "@/lib/forms/action-result";

type ActionResultFormApi<TValues extends FieldValues> = {
  clearErrors: UseFormClearErrors<TValues>;
  setError: UseFormSetError<TValues>;
  setFocus: UseFormSetFocus<TValues>;
};

export function applyActionResult<TValues extends FieldValues>(
  result: ActionResult<unknown>,
  form: ActionResultFormApi<TValues>,
  fieldOrder: readonly Path<TValues>[],
  formAlertRef?: RefObject<HTMLDivElement | null>,
) {
  form.clearErrors();
  if (result.ok) return;

  for (const [field, messages] of Object.entries(result.fieldErrors ?? {})) {
    if (messages[0]) {
      form.setError(field as Path<TValues>, {
        type: "server",
        message: messages[0],
      });
    }
  }

  const firstInvalid = fieldOrder.find(
    (field) => result.fieldErrors?.[field]?.length,
  );
  if (firstInvalid) {
    queueMicrotask(() => form.setFocus(firstInvalid));
  } else if (result.formError) {
    queueMicrotask(() => formAlertRef?.current?.focus());
  }
}
