import type { UseFormReturn } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import type { RegistrationInput } from "@/lib/auth/schemas";

import type { RegistrationFormValues } from "../_lib/registration-form-values";

export function TextField({
  form,
  name,
  label,
  type = "text",
  autoComplete,
}: {
  form: UseFormReturn<RegistrationFormValues, unknown, RegistrationInput>;
  name: keyof RegistrationFormValues;
  label: string;
  type?: string;
  autoComplete?: string;
}) {
  const error = form.formState.errors[name]?.message;

  return (
    <Field id={name} invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      <Input type={type} autoComplete={autoComplete} {...form.register(name)} />
      {error ? <FieldError assertive>{error}</FieldError> : null}
    </Field>
  );
}
