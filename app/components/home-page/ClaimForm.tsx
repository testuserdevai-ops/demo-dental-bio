"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "@phosphor-icons/react";
import { useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { useEffect, useId, useRef, useState } from "react";

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

import styles from "./ClaimForm.module.css";

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
  const claimFormId = useId();
  const formAlertRef = useRef<HTMLDivElement>(null);
  const [explicitSelectedDomain, setExplicitSelectedDomain] = useState<
    string | null
  >(null);
  const [formError, setFormError] = useState<string>();
  const form = useForm<ClaimInput>({
    resolver: zodResolver(claimSchema),
    defaultValues: { username: "" },
    mode: "onTouched",
  });
  const watchedUsername = useWatch({ control: form.control, name: "username" });

  const resolvedDomain = AVAILABLE_DOMAINS.includes(
    domainConfig.domain as (typeof AVAILABLE_DOMAINS)[number],
  )
    ? domainConfig.domain
    : "dental.bio";
  const selectedDomain = explicitSelectedDomain ?? resolvedDomain;

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
  const activeDomain = selectedDomain;

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(submit)}
      className={styles.claimForm}
    >
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.claimSurface}>
        <Field id={`${claimFormId}-domain`} className={styles.domainField}>
          <FieldLabel className={styles.fieldLabel}>Profile domain</FieldLabel>
          <Select
            value={selectedDomain}
            onValueChange={setExplicitSelectedDomain}
          >
            <SelectTrigger
              aria-label="Profile domain"
              className={styles.selectTrigger}
            >
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
        <Field
          id={`${claimFormId}-username`}
          invalid={Boolean(usernameError)}
          className={styles.usernameField}
        >
          <FieldLabel className={styles.fieldLabel}>Username</FieldLabel>
          <Input
            {...form.register("username")}
            placeholder="yourname"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            maxLength={30}
            data-1p-ignore="true"
            data-lpignore="true"
            className={styles.usernameInput}
          />
          {usernameError ? (
            <FieldError assertive className={styles.fieldError}>
              {usernameError}
            </FieldError>
          ) : null}
        </Field>
        <Button
          className={styles.claimButton}
          type="submit"
          isPending={form.formState.isSubmitting}
        >
          <span className={styles.claimVerb}>Claim</span>
          <span className={styles.claimAddress}>
            {activeDomain}/{watchedUsername || "yourname"}
          </span>
          <span className={styles.arrow} aria-hidden="true">
            <ArrowRight weight="bold" />
          </span>
        </Button>
      </div>
      {formError ? (
        <Alert
          ref={formAlertRef}
          tabIndex={-1}
          variant="destructive"
          role="alert"
          className={styles.formAlert}
        >
          <AlertTitle>Unable to continue</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
