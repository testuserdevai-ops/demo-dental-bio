import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cn } from "@/lib/utils";

type FieldContextValue = {
  id: string;
  descriptionId?: string;
  errorId?: string;
  invalid: boolean;
};
const FieldContext = React.createContext<FieldContextValue | null>(null);

function useField() {
  const context = React.useContext(FieldContext);
  if (!context)
    throw new Error("Field subcomponents must be used within Field.");
  return context;
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
  invalid?: boolean;
}

function getFieldChildIds(children: React.ReactNode, fieldId: string) {
  let descriptionId: string | undefined;
  let errorId: string | undefined;

  const visit = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (!React.isValidElement(child)) return;

      if (child.type === React.Fragment) {
        visit(child.props.children);
      } else if (child.type === FieldDescription) {
        descriptionId = child.props.id ?? `${fieldId}-description`;
      } else if (child.type === FieldError) {
        errorId = child.props.id ?? `${fieldId}-error`;
      }
    });
  };

  visit(children);
  return { descriptionId, errorId };
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ id, invalid = false, className, children, ...props }, ref) => {
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    const { descriptionId, errorId } = getFieldChildIds(children, fieldId);
    return (
      <FieldContext.Provider
        value={{
          id: fieldId,
          descriptionId,
          errorId,
          invalid,
        }}
      >
        <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
          {children}
        </div>
      </FieldContext.Provider>
    );
  },
);
Field.displayName = "Field";

const FieldLabel = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, htmlFor, ...props }, ref) => {
  const field = useField();
  return (
    <LabelPrimitive.Root
      ref={ref}
      htmlFor={htmlFor ?? field.id}
      className={cn("text-sm font-semibold text-foreground", className)}
      {...props}
    />
  );
});
FieldLabel.displayName = "FieldLabel";

const FieldDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<"p">
>(({ className, id, ...props }, ref) => {
  const field = useField();
  return (
    <p
      ref={ref}
      id={id ?? field.descriptionId}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});
FieldDescription.displayName = "FieldDescription";

export interface FieldErrorProps extends React.ComponentPropsWithoutRef<"p"> {
  assertive?: boolean;
}

const FieldError = React.forwardRef<HTMLParagraphElement, FieldErrorProps>(
  ({ className, id, assertive = false, ...props }, ref) => {
    const field = useField();
    return (
      <p
        ref={ref}
        id={id ?? field.errorId}
        role={assertive ? "alert" : undefined}
        className={cn("text-sm text-destructive", className)}
        {...props}
      />
    );
  },
);
FieldError.displayName = "FieldError";

function useFieldControlProps<
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

export {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
  useFieldControlProps,
};
