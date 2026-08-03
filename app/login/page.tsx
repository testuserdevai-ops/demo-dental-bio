"use client";

import { useEffect, useRef, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Manrope } from "next/font/google";
import Link from "next/link";
import Image from "@/app/components/Image/SafeImage";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { type LoginInput, loginSchema } from "@/lib/auth/schemas";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";
import { useDeviceFingerprint } from "@/utils/hooks/useDeviceFingerprint";
import { login } from "@/app/login/actions";

const manrope = Manrope({ subsets: ["latin"] });
const MAX_ATTEMPTS = 3;
const LOCKOUT_TIME = 60_000;
type LoginFormValues = z.input<typeof loginSchema>;

export default function LoginPage() {
  const domainConfig = useDomainConfig();
  const deviceFingerprint = useDeviceFingerprint();
  const alertRef = useRef<HTMLDivElement>(null);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);
  const form = useForm<LoginFormValues, unknown, LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", deviceFingerprint: "" },
  });
  const { errors, isSubmitting } = form.formState;

  useEffect(() => {
    form.setValue("deviceFingerprint", deviceFingerprint ?? "", {
      shouldDirty: false,
    });
  }, [deviceFingerprint, form]);

  useEffect(() => {
    const savedAttempts = localStorage.getItem("loginAttempts");
    const savedLockoutEndTime = localStorage.getItem("lockoutEndTime");
    if (savedAttempts) setAttempts(Number(savedAttempts));
    if (savedLockoutEndTime) {
      const lockoutEnd = Number(savedLockoutEndTime);
      if (lockoutEnd > Date.now()) {
        setIsLocked(true);
        setLockoutEndTime(lockoutEnd);
      }
    }
  }, []);

  useEffect(() => {
    if (!isLocked || !lockoutEndTime) return;
    const timer = window.setTimeout(
      () => {
        setIsLocked(false);
        setAttempts(0);
        localStorage.removeItem("lockoutEndTime");
        localStorage.removeItem("loginAttempts");
      },
      Math.max(0, lockoutEndTime - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [isLocked, lockoutEndTime]);

  async function onSubmit(values: LoginInput) {
    if (isLocked) {
      form.setError("root", {
        message: "Too many unsuccessful attempts. Please wait a few minutes.",
      });
      queueMicrotask(() => alertRef.current?.focus());
      return;
    }

    const formData = new FormData();
    formData.set("email", values.email);
    formData.set("password", values.password);
    formData.set("deviceFingerprint", values.deviceFingerprint ?? "");
    const result = await login(formData);
    if (result.ok) {
      form.reset();
      localStorage.removeItem("loginAttempts");
      localStorage.removeItem("lockoutEndTime");
      setAttempts(0);
      return;
    }

    applyActionResult(result, form, ["email", "password"], alertRef);
    if (result.formError) {
      form.setError("root", { message: result.formError });
      window.setTimeout(() => alertRef.current?.focus());
    }
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    localStorage.setItem("loginAttempts", String(nextAttempts));
    if (nextAttempts >= MAX_ATTEMPTS) {
      const lockoutEnd = Date.now() + LOCKOUT_TIME;
      setIsLocked(true);
      setLockoutEndTime(lockoutEnd);
      localStorage.setItem("lockoutEndTime", String(lockoutEnd));
    }
  }

  return (
    <main
      className={`${manrope.className} flex h-screen flex-col items-center justify-center gap-5 py-20 text-center`}
    >
      <span className="-mb-2 text-sm font-medium text-dark">Welcome back!</span>
      <h1 className="bg-gradient-to-r from-gradient-purple via-gradient-coral to-gradient-orange bg-clip-text pb-2 text-3xl font-extrabold text-transparent">
        Login
      </h1>
      <form
        noValidate
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full max-w-xl space-y-5"
      >
        <Field
          className="mx-auto mt-5 w-full max-w-xl px-5 text-left"
          invalid={Boolean(errors.email)}
        >
          <FieldLabel>Email</FieldLabel>
          <Input
            type="email"
            autoComplete="username"
            placeholder="Enter your email"
            className="h-auto rounded-[40px] border-neutral-300 px-7 py-5 text-2xl"
            {...form.register("email")}
          />
          {errors.email && (
            <FieldError assertive>{errors.email.message}</FieldError>
          )}
        </Field>
        <Field
          className="mx-auto mt-5 w-full max-w-xl px-5 text-left"
          invalid={Boolean(errors.password)}
        >
          <FieldLabel>Password</FieldLabel>
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="Enter your password"
            className="h-auto rounded-[40px] border-neutral-300 px-7 py-5 text-2xl"
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
            className="mx-auto max-w-xl text-left"
          >
            <AlertTitle>Unable to log in</AlertTitle>
            <AlertDescription>{errors.root.message}</AlertDescription>
          </Alert>
        )}
        <div className="mx-auto mt-5 w-full max-w-xl px-5">
          <Button
            type="submit"
            size="lg"
            isPending={isSubmitting}
            disabled={isLocked}
            className="h-auto w-full rounded-[40px] bg-gradient-to-r from-btn-gradient-rose via-btn-gradient-rose to-btn-gradient-peach py-5 text-2xl text-white"
          >
            {isSubmitting ? "Logging in..." : "Log In"}
          </Button>
        </div>
      </form>
      <span className="mt-10">
        No account yet?{" "}
        <Link href="/register" className="underline">
          Sign up
        </Link>
        <br />
        <Link href="/forgot-password" className="underline">
          Reset password
        </Link>
      </span>
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
