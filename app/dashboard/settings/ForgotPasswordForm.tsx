"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { requestPasswordReset } from "@/app/forgot-password/actions";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import {
  recoveryRequestSchema,
  type RecoveryRequestInput,
} from "@/lib/auth/schemas";

interface ForgotPasswordFormProps {
  defaultEmail: string;
  requestReset?: typeof requestPasswordReset;
}

export default function ForgotPasswordForm({
  defaultEmail,
  requestReset = requestPasswordReset,
}: ForgotPasswordFormProps) {
  const router = useRouter();
  const alertRef = useRef<HTMLDivElement>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<RecoveryRequestInput>({
    resolver: zodResolver(recoveryRequestSchema),
    defaultValues: { email: defaultEmail },
  });

  async function submit(values: RecoveryRequestInput) {
    setFormError(null);
    try {
      const result = await requestReset(values);
      if (!result.ok) {
        setFormError(result.formError ?? null);
        applyActionResult(result, form, ["email"], alertRef);
        return;
      }

      toast.success(
        "If an account exists with this email, you will receive a recovery code.",
      );
      router.push(
        `/forgot-password?email=${encodeURIComponent(values.email)}&recovery=sent`,
      );
    } catch {
      setFormError("We couldn't send a recovery email. Please try again.");
      alertRef.current?.focus();
    }
  }

  return (
    <form
      noValidate
      onSubmit={(event) => void form.handleSubmit(submit)(event)}
      className="flex w-full flex-col items-end gap-3"
    >
      <div className="w-full">
        <h2 className="text-lg font-semibold text-dark">Reset password</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll send a recovery code to your account email.
        </p>
      </div>
      <Field id="dashboard-recovery-email" className="w-full">
        <FieldLabel>Email address</FieldLabel>
        <Input
          type="email"
          autoComplete="email"
          readOnly
          {...form.register("email")}
        />
      </Field>
      {formError && (
        <Alert
          ref={alertRef}
          tabIndex={-1}
          className="w-full"
          variant="destructive"
          role="alert"
        >
          <AlertTitle>We couldn&apos;t send your recovery code</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        Send recovery code
      </Button>
    </form>
  );
}
