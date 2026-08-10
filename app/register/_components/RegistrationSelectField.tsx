import { Controller, type UseFormReturn } from "react-hook-form";

import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import type { RegistrationInput } from "@/lib/auth/schemas";

import type { RegistrationFormValues } from "../_lib/registration-form-values";

export function RegistrationSelectField({
  form,
  name,
  label,
  placeholder,
  options,
}: {
  form: UseFormReturn<RegistrationFormValues, unknown, RegistrationInput>;
  name: "title" | "position" | "country";
  label: string;
  placeholder: string;
  options: readonly string[];
}) {
  const error = form.formState.errors[name]?.message;

  return (
    <Field id={name} invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      <Controller
        control={form.control}
        name={name}
        render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger
              ref={field.ref}
              className="data-[placeholder]:text-foreground"
              onBlur={field.onBlur}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error ? <FieldError assertive>{error}</FieldError> : null}
    </Field>
  );
}
