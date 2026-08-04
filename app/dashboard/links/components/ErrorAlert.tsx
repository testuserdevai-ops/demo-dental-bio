"use client";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";

export function ErrorAlert({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  if (!message) return null;
  return (
    <Alert variant="destructive" role="alert">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
