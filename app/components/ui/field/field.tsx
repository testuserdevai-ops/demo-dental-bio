import * as React from "react";
import { cn } from "@/lib/utils";
import { FieldContext } from "./field-context";
import { FieldDescription } from "./field-description";
import { FieldError } from "./field-error";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string;
  invalid?: boolean;
}

function getFieldChildIds(children: React.ReactNode, fieldId: string) {
  let descriptionId: string | undefined;
  let errorId: string | undefined;

  const visit = (nodes: React.ReactNode) => {
    React.Children.forEach(nodes, (child) => {
      if (
        !React.isValidElement<{ children?: React.ReactNode; id?: string }>(
          child,
        )
      )
        return;

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

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ id, invalid = false, className, children, ...props }, ref) => {
    const generatedId = React.useId();
    const fieldId = id ?? generatedId;
    const { descriptionId, errorId } = getFieldChildIds(children, fieldId);
    return (
      <FieldContext.Provider
        value={{ id: fieldId, descriptionId, errorId, invalid }}
      >
        <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
          {children}
        </div>
      </FieldContext.Provider>
    );
  },
);
Field.displayName = "Field";
