"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { forwardRef, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import OtpInput from "@/app/components/OtpInput";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import {
  otpSchema,
  recoveryRequestSchema,
  resetPasswordSchema,
  type OtpInput as OtpValues,
  type RecoveryRequestInput,
  type ResetPasswordInput,
} from "@/lib/auth/schemas";
import {
  requestPasswordReset,
  updateRecoveryPassword,
  verifyRecoveryOtp,
} from "./actions";

type RecoveryStep = "request" | "verify" | "reset";
type RecoveryActions = {
  requestPasswordReset: typeof requestPasswordReset;
  verifyRecoveryOtp: typeof verifyRecoveryOtp;
  updateRecoveryPassword: typeof updateRecoveryPassword;
};

const FormAlert = forwardRef<HTMLDivElement, { message: string | null }>(
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

export default function ForgotPasswordPage({
  actions = {
    requestPasswordReset,
    verifyRecoveryOtp,
    updateRecoveryPassword,
  },
}: {
  actions?: RecoveryActions;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") ?? "";
  const [step, setStep] = useState<RecoveryStep>(
    initialEmail && searchParams.get("recovery") === "sent"
      ? "verify"
      : "request",
  );
  const [recoveryEmail, setRecoveryEmail] = useState(initialEmail);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const requestAlertRef = useRef<HTMLDivElement>(null);
  const otpAlertRef = useRef<HTMLDivElement>(null);
  const passwordAlertRef = useRef<HTMLDivElement>(null);

  const requestForm = useForm<RecoveryRequestInput>({
    resolver: zodResolver(recoveryRequestSchema),
    defaultValues: { email: initialEmail },
  });
  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { email: initialEmail, otp: "" },
  });
  const passwordForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });
  const otp = useWatch({ control: otpForm.control, name: "otp" });

  const submitRequest = requestForm.handleSubmit(async (values) => {
    setRequestError(null);
    try {
      const result = await actions.requestPasswordReset(values);
      if (!result.ok) {
        setRequestError(result.formError ?? null);
        applyActionResult(result, requestForm, ["email"], requestAlertRef);
        return;
      }

      setRecoveryEmail(values.email);
      otpForm.reset({ email: values.email, otp: "" });
      setStep("verify");
      toast.success(
        "If an account exists with this email, you will receive a recovery code.",
      );
    } catch {
      setRequestError("We couldn't send a recovery email. Please try again.");
      requestAlertRef.current?.focus();
    }
  });

  const submitOtp = otpForm.handleSubmit(async (values) => {
    setOtpError(null);
    try {
      const result = await actions.verifyRecoveryOtp(values);
      if (!result.ok) {
        setOtpError(result.formError ?? null);
        applyActionResult(result, otpForm, ["otp"], otpAlertRef);
        return;
      }

      setStep("reset");
    } catch {
      setOtpError("We couldn't verify that code. Please try again.");
      otpAlertRef.current?.focus();
    }
  });

  const submitPassword = passwordForm.handleSubmit(async (values) => {
    setPasswordError(null);
    try {
      const result = await actions.updateRecoveryPassword(values);
      if (!result.ok) {
        setPasswordError(result.formError ?? null);
        applyActionResult(
          result,
          passwordForm,
          ["password", "confirmPassword"],
          passwordAlertRef,
        );
        return;
      }

      passwordForm.reset();
      toast.success("Your password has been updated.");
      router.push("/login");
    } catch {
      setPasswordError("We couldn't update your password. Please try again.");
      passwordAlertRef.current?.focus();
    }
  });

  async function resendCode() {
    setOtpError(null);
    setIsResending(true);
    try {
      const result = await actions.requestPasswordReset({
        email: recoveryEmail,
      });
      if (!result.ok) {
        setOtpError(result.formError ?? "We couldn't resend the code.");
        queueMicrotask(() => otpAlertRef.current?.focus());
        return;
      }
      otpForm.setValue("otp", "");
      toast.success("A new recovery code has been sent.");
    } catch {
      setOtpError("We couldn't resend the code. Please try again.");
      queueMicrotask(() => otpAlertRef.current?.focus());
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-5 py-10">
      <div>
        <h1 className="text-3xl font-extrabold text-dark">
          {step === "reset" ? "Set a new password" : "Reset your password"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "request"
            ? "Enter your email and we’ll send a recovery code."
            : step === "verify"
              ? `Enter the code sent to ${recoveryEmail}.`
              : "Choose a new password for your account."}
        </p>
      </div>

      {step === "request" && (
        <form noValidate onSubmit={submitRequest} className="space-y-5">
          <Field
            id="recovery-email"
            invalid={Boolean(requestForm.formState.errors.email)}
          >
            <FieldLabel>Email address</FieldLabel>
            <Input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              {...requestForm.register("email", {
                onChange: () => setRequestError(null),
              })}
            />
            {requestForm.formState.errors.email && (
              <FieldError assertive>
                {requestForm.formState.errors.email.message}
              </FieldError>
            )}
          </Field>
          <FormAlert ref={requestAlertRef} message={requestError} />
          <Button
            type="submit"
            className="w-full"
            isPending={requestForm.formState.isSubmitting}
          >
            Send recovery code
          </Button>
        </form>
      )}

      {step === "verify" && (
        <form noValidate onSubmit={submitOtp} className="space-y-5">
          <Field
            id="recovery-otp"
            invalid={Boolean(otpForm.formState.errors.otp)}
          >
            <FieldLabel>Verification code</FieldLabel>
            <OtpInput
              value={otp}
              onChange={(otp) => {
                otpForm.setValue("otp", otp, { shouldValidate: true });
                setOtpError(null);
              }}
              invalid={Boolean(otpForm.formState.errors.otp)}
              describedBy={
                otpForm.formState.errors.otp ? "recovery-otp-error" : undefined
              }
              autoFocus
            />
            {otpForm.formState.errors.otp && (
              <FieldError id="recovery-otp-error" assertive>
                {otpForm.formState.errors.otp.message}
              </FieldError>
            )}
          </Field>
          <FormAlert ref={otpAlertRef} message={otpError} />
          <Button
            type="submit"
            className="w-full"
            isPending={otpForm.formState.isSubmitting}
          >
            Verify code
          </Button>
          <Button
            type="button"
            variant="outline"
            isPending={isResending}
            onClick={resendCode}
          >
            Resend recovery code
          </Button>
          <Button
            type="button"
            variant="link"
            onClick={() => {
              requestForm.setValue("email", recoveryEmail);
              setStep("request");
            }}
          >
            Use a different email address
          </Button>
        </form>
      )}

      {step === "reset" && (
        <form noValidate onSubmit={submitPassword} className="space-y-5">
          <Field
            id="recovery-password"
            invalid={Boolean(passwordForm.formState.errors.password)}
          >
            <FieldLabel>New password</FieldLabel>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                {...passwordForm.register("password", {
                  onChange: () => setPasswordError(null),
                })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                aria-label={
                  showPassword ? "Hide new password" : "Show new password"
                }
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? (
                  <EyeSlash aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </Button>
            </div>
            {passwordForm.formState.errors.password && (
              <FieldError assertive>
                {passwordForm.formState.errors.password.message}
              </FieldError>
            )}
          </Field>
          <Field
            id="recovery-confirm-password"
            invalid={Boolean(passwordForm.formState.errors.confirmPassword)}
          >
            <FieldLabel>Confirm new password</FieldLabel>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                {...passwordForm.register("confirmPassword", {
                  onChange: () => setPasswordError(null),
                })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirmation password"
                    : "Show confirmation password"
                }
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? (
                  <EyeSlash aria-hidden="true" />
                ) : (
                  <Eye aria-hidden="true" />
                )}
              </Button>
            </div>
            {passwordForm.formState.errors.confirmPassword && (
              <FieldError assertive>
                {passwordForm.formState.errors.confirmPassword.message}
              </FieldError>
            )}
          </Field>
          <FormAlert ref={passwordAlertRef} message={passwordError} />
          <Button
            type="submit"
            className="w-full"
            isPending={passwordForm.formState.isSubmitting}
          >
            Update password
          </Button>
        </form>
      )}
    </main>
  );
}
