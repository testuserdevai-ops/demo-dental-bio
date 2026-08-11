"use client";

import { WarningCircle } from "@phosphor-icons/react";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";

export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-8 lg:p-10">
      <Alert variant="destructive" role="alert">
        <WarningCircle aria-hidden="true" className="size-5" />
        <AlertTitle>Admin workspace could not be loaded</AlertTitle>
        <AlertDescription className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <span>An unexpected error interrupted this workspace.</span>
          <Button type="button" variant="outline" onClick={reset}>
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
}
