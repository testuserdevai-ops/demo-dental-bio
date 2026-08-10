import * as React from "react";

export type FieldContextValue = {
  id: string;
  descriptionId?: string;
  errorId?: string;
  invalid: boolean;
};

export const FieldContext = React.createContext<FieldContextValue | null>(null);

export function useField() {
  const context = React.useContext(FieldContext);
  if (!context)
    throw new Error("Field subcomponents must be used within Field.");
  return context;
}

export function useFieldControlProps<
  T extends {
    id?: string;
    "aria-invalid"?: React.AriaAttributes["aria-invalid"];
    "aria-describedby"?: string;
  },
>(props: T) {
  const field = React.useContext(FieldContext);
  if (!field) return props;
  const describedBy = Array.from(
    new Set(
      [
        ...(props["aria-describedby"]?.split(/\s+/) ?? []),
        field.descriptionId,
        field.invalid ? field.errorId : undefined,
      ].filter((value): value is string => Boolean(value)),
    ),
  ).join(" ");
  return {
    ...props,
    id: props.id ?? field.id,
    "aria-invalid": props["aria-invalid"] ?? (field.invalid || undefined),
    "aria-describedby": describedBy || undefined,
  };
}
