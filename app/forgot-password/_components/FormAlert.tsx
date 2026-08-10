import { forwardRef } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";

export const FormAlert = forwardRef<HTMLDivElement, { message: string | null }>(
  function FormAlert({ message }, ref) {
    if (!message) return null;

    return (
      <Alert ref={ref} variant="destructive" role="alert" tabIndex={-1}>
        <AlertTitle>We couldn&apos;t continue</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
      </Alert>
    );
  },
);

FormAlert.displayName = "FormAlert";
