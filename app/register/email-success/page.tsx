"use client";

import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Link from "next/link";
import Image from "@/app/components/Image/SafeImage";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { type LoginInput, loginSchema } from "@/lib/auth/schemas";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { login } from "@/app/register/email-success/actions";

type LoginFormValues = z.input<typeof loginSchema>;

export default function EmailSuccessPage() {
  const domainConfig = useDomainConfig();
  const alertRef = useRef<HTMLDivElement>(null);
  const form = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", deviceFingerprint: "" },
  });
  const { errors, isSubmitting } = form.formState;

  async function onSubmit(values: LoginInput) {
    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    const result = await login(formData);
    if (result.ok) {
      form.reset();
      return;
    }
    applyActionResult(result, form, ["email", "password"], alertRef);
    if (result.formError) {
      form.setError("root", { message: result.formError });
      window.setTimeout(() => alertRef.current?.focus());
    }
  }

  return (
    <main className="flex flex-col items-center justify-center gap-5 py-10 text-center">
      <h1 className="mt-20 w-full max-w-screen-md bg-gradient-to-r from-primary-1 via-primary-2 to-primary-orange-1 bg-clip-text text-2xl font-semibold text-transparent md:text-3xl">
        Email successfully verified. <br />
        You can now log in.
      </h1>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full max-w-md space-y-5"
      >
        <Field
          className="mx-auto mt-5 w-full max-w-lg px-5 text-left"
          invalid={Boolean(errors.email)}
        >
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            autoComplete="username"
            placeholder="Enter your email"
            className="h-auto rounded-[30px] border-neutral-300 px-7 py-4"
            {...form.register("email")}
          />
          {errors.email && (
            <FieldError assertive>{errors.email.message}</FieldError>
          )}
        </Field>
        <Field
          className="mx-auto mt-5 w-full max-w-lg px-5 text-left"
          invalid={Boolean(errors.password)}
        >
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="h-auto rounded-[30px] border-neutral-300 px-7 py-4"
            {...form.register("password")}
          />
          {errors.password && (
            <FieldError assertive>{errors.password.message}</FieldError>
          )}
        </Field>
        {errors.root?.message && (
          <Alert
            ref={alertRef}
            role="alert"
            tabIndex={-1}
            variant="destructive"
            className="mx-auto max-w-lg text-left"
          >
            <AlertTitle>Unable to log in</AlertTitle>
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
        <div className="mx-auto mt-5 w-full max-w-lg px-5">
          <Button
            type="submit"
            size="lg"
            isPending={isSubmitting}
            className="h-auto w-full rounded-[30px] bg-gradient-to-r from-btn-gradient-rose via-btn-gradient-rose to-btn-gradient-peach py-4 text-lg text-white"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </Button>
        </div>
      </form>
      <Link href="/">
        <Image
          src={domainConfig.logoPath}
          width={150}
          height={25}
          alt={`${domainConfig.brandName} navigation bar logo`}
          className="px-4 pt-20"
        />
      </Link>
    </main>
  );
}
