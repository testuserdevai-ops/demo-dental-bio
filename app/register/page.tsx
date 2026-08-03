"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Controller,
  useForm,
  useWatch,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";

import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  otpSchema,
  registrationSchema,
  type RegistrationInput,
} from "@/lib/auth/schemas";
import type { ActionResult } from "@/lib/forms/action-result";
import { getDomainConfigByHostname } from "@/utils/domainConfig";
import { getUserLocation } from "@/utils/functions/getUserIp";
import { useDeviceFingerprint } from "@/utils/hooks/useDeviceFingerprint";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { countries, titles } from "@/utils/global_constants";

import { DateOfBirthField } from "./_components/DateOfBirthField";
import { RegistrationOtpInput } from "./_components/RegistrationOtpInput";

const fieldOrder: (keyof RegistrationFormValues)[] = [
  "title",
  "email",
  "firstName",
  "lastName",
  "birthday",
  "position",
  "country",
  "offerCode",
  "password",
  "confirmPassword",
];

type RegistrationFormValues = z.input<typeof registrationSchema>;

async function postActionResult(
  url: string,
  body: unknown,
): Promise<ActionResult<{ redirectTo?: string }>> {
  const unavailable: ActionResult<{ redirectTo?: string }> = {
    ok: false,
    code: "NETWORK_ERROR",
    formError: "Unable to complete your request. Please try again.",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return response.json().catch(() => unavailable);
  } catch {
    return unavailable;
  }
}

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const username = searchParams.get("username");
  const referral = searchParams.get("referral") || "";
  const requestedDomain = searchParams.get("domain");
  const detectedDomain = useDomainConfig();
  const domainConfig = useMemo(() => {
    const requested = requestedDomain
      ? getDomainConfigByHostname(requestedDomain)
      : null;
    return requested?.domain === requestedDomain ? requested : detectedDomain;
  }, [detectedDomain, requestedDomain]);
  const fingerprint = useDeviceFingerprint();
  const formAlertRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<"details" | "otp">("details");
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [isVerifying, setIsVerifying] = useState(false);
  const [location, setLocation] = useState<string>();
  const [resendCooldown, setResendCooldown] = useState(0);

  const form = useForm<RegistrationFormValues, unknown, RegistrationInput>({
    resolver: zodResolver(registrationSchema),
    mode: "onTouched",
    defaultValues: {
      username: username || "",
      selectedDomain: requestedDomain || "dental.bio",
      referral,
      title: "",
      email: "",
      firstName: "",
      lastName: "",
      birthday: "",
      position: "",
      country: "",
      offerCode: "",
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    form.setValue("username", username || "", { shouldValidate: true });
    form.setValue("selectedDomain", requestedDomain || "dental.bio");
    form.setValue("referral", referral);
  }, [form, referral, requestedDomain, username]);

  useEffect(() => {
    void getUserLocation().then((country) => {
      setLocation(country);
      if (!form.getValues("country")) form.setValue("country", country);
    });
  }, [form]);

  useEffect(() => {
    if (!resendCooldown) return;
    const timer = window.setInterval(
      () => setResendCooldown((current) => Math.max(0, current - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [resendCooldown]);

  useEffect(() => {
    if (formError) formAlertRef.current?.focus();
  }, [formError]);

  const positions = domainConfig.positions;
  const birthday = useWatch({ control: form.control, name: "birthday" });
  const errors = form.formState.errors;
  const submitDetails = async (values: RegistrationFormValues) => {
    setFormError(undefined);
    const result = await postActionResult("/api/register/send-otp", {
      ...values,
      deviceFingerprint: fingerprint,
      location,
    });
    if (!result.ok) {
      applyActionResult(result, form, fieldOrder, formAlertRef);
      setFormError(result.formError);
      return;
    }
    setOtp("");
    setOtpError(undefined);
    setResendCooldown(60);
    setStep("otp");
  };

  const verifyOtp = async () => {
    const otpResult = otpSchema.safeParse({
      email: form.getValues("email"),
      otp,
    });
    if (!otpResult.success) {
      setOtpError(
        otpResult.error.issues[0]?.message || "Enter the 6-digit code.",
      );
      return;
    }
    setOtpError(undefined);
    setFormError(undefined);
    setIsVerifying(true);
    try {
      const result = await postActionResult("/api/register/verify-otp", {
        ...form.getValues(),
        otp,
        deviceFingerprint: fingerprint,
        location,
      });
      if (!result.ok) {
        const nextOtpError = result.fieldErrors?.otp?.[0];
        setOtpError(nextOtpError);
        setFormError(result.formError);
        queueMicrotask(() => {
          if (nextOtpError) {
            document.getElementById("registration-otp")?.focus();
          } else {
            formAlertRef.current?.focus();
          }
        });
        return;
      }
      form.reset();
      router.replace(result.data?.redirectTo || "/dashboard");
    } finally {
      setIsVerifying(false);
    }
  };

  const resendOtp = async () => {
    const valid = await form.trigger();
    if (!valid || resendCooldown) return;
    await submitDetails(form.getValues());
  };

  if (!username) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-6 px-5 text-center">
        <h1 className="text-3xl font-bold text-foreground">
          Choose your username
        </h1>
        <p className="text-muted-foreground">
          Start by claiming your public profile address.
        </p>
        <Link className="underline" href="/">
          Return home
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-5 py-12">
      <header className="space-y-2 text-center">
        <p className="text-sm text-muted-foreground">
          {domainConfig.domain}/{username}
        </p>
        <h1 className="text-3xl font-bold text-foreground">
          {step === "details" ? "Create your account" : "Verify your email"}
        </h1>
      </header>
      {formError ? (
        <Alert
          ref={formAlertRef}
          tabIndex={-1}
          variant="destructive"
          role="alert"
        >
          <AlertTitle>We could not continue</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      {step === "details" ? (
        <form
          noValidate
          className="space-y-4"
          onSubmit={form.handleSubmit(submitDetails)}
        >
          <RegistrationSelectField
            form={form}
            name="title"
            label="Title (optional)"
            placeholder="Select title"
            options={titles}
          />
          <TextField
            form={form}
            name="email"
            label="Email"
            type="email"
            autoComplete="email"
          />
          <TextField
            form={form}
            name="firstName"
            label="First name"
            autoComplete="given-name"
          />
          <TextField
            form={form}
            name="lastName"
            label="Last name"
            autoComplete="family-name"
          />
          <DateOfBirthField
            value={birthday}
            onChange={(value) =>
              form.setValue("birthday", value, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            onBlur={() => form.trigger("birthday")}
            error={errors.birthday?.message}
            disabled={form.formState.isSubmitting}
          />
          <RegistrationSelectField
            form={form}
            name="position"
            label="Position"
            placeholder="Select position"
            options={positions}
          />
          <RegistrationSelectField
            form={form}
            name="country"
            label="Country"
            placeholder="Select country"
            options={countries}
          />
          <TextField
            form={form}
            name="offerCode"
            label="Offer code (optional)"
            autoComplete="off"
          />
          <TextField
            form={form}
            name="password"
            label="Password"
            type="password"
            autoComplete="new-password"
          />
          <TextField
            form={form}
            name="confirmPassword"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
          />
          <Button
            className="w-full"
            type="submit"
            isPending={form.formState.isSubmitting}
          >
            Send verification code
          </Button>
        </form>
      ) : (
        <section
          className="space-y-4"
          aria-labelledby="registration-otp-heading"
        >
          <p
            id="registration-otp-heading"
            className="text-center text-muted-foreground"
          >
            We sent a code to {form.getValues("email")}.
          </p>
          <RegistrationOtpInput
            value={otp}
            onChange={setOtp}
            error={otpError}
          />
          <Button
            className="w-full"
            onClick={verifyOtp}
            disabled={otp.length !== 6 || isVerifying}
            isPending={isVerifying}
          >
            Verify and create account
          </Button>
          <Button
            className="w-full"
            variant="outline"
            onClick={resendOtp}
            disabled={
              resendCooldown > 0 || form.formState.isSubmitting || isVerifying
            }
          >
            {resendCooldown
              ? `Resend code in ${resendCooldown}s`
              : "Resend code"}
          </Button>
          <Button
            className="w-full"
            variant="ghost"
            onClick={() => setStep("details")}
          >
            Back to details
          </Button>
        </section>
      )}
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link className="underline" href="/login">
          Log in
        </Link>
      </p>
    </main>
  );
}

function TextField({
  form,
  name,
  label,
  type = "text",
  autoComplete,
}: {
  form: UseFormReturn<RegistrationFormValues, unknown, RegistrationInput>;
  name: keyof RegistrationFormValues;
  label: string;
  type?: string;
  autoComplete?: string;
}) {
  const error = form.formState.errors[name]?.message;
  return (
    <Field id={name} invalid={Boolean(error)}>
      <FieldLabel>{label}</FieldLabel>
      <Input type={type} autoComplete={autoComplete} {...form.register(name)} />
      {error ? <FieldError assertive>{error}</FieldError> : null}
    </Field>
  );
}

function RegistrationSelectField({
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
            <SelectTrigger ref={field.ref} onBlur={field.onBlur}>
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
