"use client";

import { ShieldCheck } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { apiClient } from "@/services/apiClient";
import { verificationSessionResponseSchema } from "../_lib/schemas";

type VerifyButtonProps = {
  text?: string;
  enabled?: boolean;
};

export default function VerifyButton({ text, enabled }: VerifyButtonProps) {
  const [error, setError] = useState("");
  const start = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<unknown>(
        "/api/veriff/create-session",
      );
      const parsed = verificationSessionResponseSchema.safeParse(response);
      if (!parsed.success)
        throw new Error("Invalid verification response from server");
      return parsed.data;
    },
    retry: false,
    onSuccess: (data) => window.location.assign(data.verification.url),
    onError: (reason) =>
      setError(
        reason instanceof Error
          ? reason.message
          : "Verification could not be started",
      ),
  });

  return (
    <div className="flex flex-col items-end gap-3">
      {error && (
        <Alert variant="destructive" role="alert" className="w-full">
          <AlertTitle>Verification could not be started</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button
        type="button"
        isPending={start.isPending}
        onClick={() => {
          setError("");
          start.mutate();
        }}
        disabled={!enabled}
      >
        <ShieldCheck aria-hidden="true" className="size-5" />
        {text || "Start now"}
      </Button>
    </div>
  );
}
