"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { useEffect, useRef, useState } from "react";

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
import { claimSchema, type ClaimInput } from "@/lib/auth/schemas";
import { buildRegistrationUrl } from "@/utils/registrationUrl";
import { useDomainConfig } from "@/utils/hooks/useDomainConfig";

const AVAILABLE_DOMAINS = [
  "coach.bio",
  "dental.bio",
  "doctors.bio",
  "injector.bio",
  "pharmacists.bio",
  "podcasts.bio",
  "specialist.bio",
  "therapists.bio",
] as const;

export default function ClaimForm() {
  const searchParams = useSearchParams();
  const referral = searchParams.get("referral");
  const domainConfig = useDomainConfig();
  const formAlertRef = useRef<HTMLDivElement>(null);
  const [selectedDomain, setSelectedDomain] = useState("dental.bio");
  const [formError, setFormError] = useState<string>();
  const form = useForm<ClaimInput>({
    resolver: zodResolver(claimSchema),
    defaultValues: { username: "" },
    mode: "onTouched",
  });
  const watchedUsername = useWatch({ control: form.control, name: "username" });

  useEffect(() => {
    if (
      AVAILABLE_DOMAINS.includes(
        domainConfig.domain as (typeof AVAILABLE_DOMAINS)[number],
      )
    ) {
      setSelectedDomain(domainConfig.domain);
    }
  }, [domainConfig.domain]);

  useEffect(() => {
    if (formError) formAlertRef.current?.focus();
  }, [formError]);

  const submit = async ({ username }: ClaimInput) => {
    setFormError(undefined);
    try {
      const response = await fetch(
        `/api/check-username?username=${encodeURIComponent(username)}`,
      );
      const availability = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error("Username availability request failed");
      }
      if (!availability?.unique) {
        form.setError("username", {
          type: "server",
          message: "That username is already taken.",
        });
        form.setFocus("username");
        return;
      }

      const destination = buildRegistrationUrl({
        currentOrigin: window.location.origin,
        currentHostname: window.location.hostname,
        selectedDomain,
        username,
        referral,
      });
      window.location.assign(destination);
    } catch {
      setFormError("We could not check that username. Please try again.");
    }
  };

  const usernameError = form.formState.errors.username?.message;
  const activeDomain = domainConfig.domain || selectedDomain;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit)}
      className="w-full max-w-xl space-y-3 rounded-[var(--radius-lg)] border border-border bg-card p-4 shadow-sm"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Field id="claim-domain">
          <FieldLabel>Profile domain</FieldLabel>
          <Select value={selectedDomain} onValueChange={setSelectedDomain}>
            <SelectTrigger aria-label="Profile domain">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_DOMAINS.map((domain) => (
                <SelectItem key={domain} value={domain}>
                  {domain}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field id="claim-username" invalid={Boolean(usernameError)}>
          <FieldLabel>Username</FieldLabel>
          <Input
            {...form.register("username")}
            placeholder="yourname"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="username"
          />
          {usernameError ? (
            <FieldError assertive>{usernameError}</FieldError>
          ) : null}
        </Field>
      </div>
      {formError ? (
        <Alert
          ref={formAlertRef}
          tabIndex={-1}
          variant="destructive"
          role="alert"
        >
          <AlertTitle>Unable to continue</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        className="w-full"
        type="submit"
        isPending={form.formState.isSubmitting}
      >
        Claim {activeDomain}/{watchedUsername || "yourname"}
      </Button>
    </form>
  );
}
