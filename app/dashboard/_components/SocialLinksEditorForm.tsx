"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { applyActionResult } from "@/app/components/forms/action-result";
import type { ActionResult } from "@/lib/forms/action-result";
import {
  socialPlatforms,
  socialProfileConfigs,
} from "@/utils/functions/socialMediaProfiles";
import SocialProfileVisitButton from "../components/SocialProfileVisitButton";
import {
  socialLinksInputSchema,
  type SocialLinksInput,
} from "../_lib/profile/schemas";
import type { ProfileViewModel } from "../_lib/profile/queries";

const order: (keyof SocialLinksInput)[] = [
  "linkedin",
  "twitter",
  "instagram",
  "facebook",
  "tiktok",
  "other",
];

export default function SocialLinksEditorForm({
  value,
  save,
  afterSuccess,
}: {
  value: ProfileViewModel["socials"];
  save(
    input: SocialLinksInput,
  ): Promise<ActionResult<ProfileViewModel["socials"]>>;
  afterSuccess(): void;
}) {
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const alertRef = useRef<HTMLDivElement>(null);
  const form = useForm<SocialLinksInput>({
    resolver: zodResolver(socialLinksInputSchema),
    values: value,
  });
  const values = useWatch({ control: form.control });
  async function submit(input: SocialLinksInput) {
    setError("");
    setStatus("");
    const result = await save(input);
    if (!result.ok) {
      applyActionResult(result, form, order, alertRef);
      setError(result.formError ?? "Social links could not be saved");
      return;
    }
    setStatus("Social links saved");
    afterSuccess();
  }
  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="flex-col-gap"
      noValidate
    >
      <h2 className="text-lg font-semibold">Social links</h2>
      <p className="text-sm text-muted-foreground">
        Enter an @username or complete profile URL. All fields are optional.
      </p>
      {socialPlatforms.map((platform) => {
        const config = socialProfileConfigs[platform];
        const current = values[platform] ?? "";
        return (
          <Field
            key={platform}
            invalid={Boolean(form.formState.errors[platform])}
          >
            <FieldLabel>{config.label}</FieldLabel>
            <div className="flex gap-2">
              <Input
                {...form.register(platform)}
                placeholder={config.placeholder}
              />
              <SocialProfileVisitButton platform={platform} value={current} />
            </div>
            <FieldDescription>{config.helperText}</FieldDescription>
            {form.formState.errors[platform]?.message && (
              <FieldError assertive>
                {form.formState.errors[platform]?.message}
              </FieldError>
            )}
          </Field>
        );
      })}
      <Field invalid={Boolean(form.formState.errors.other)}>
        <FieldLabel>Other link</FieldLabel>
        <Input type="url" {...form.register("other")} />
        {form.formState.errors.other?.message && (
          <FieldError assertive>
            {form.formState.errors.other.message}
          </FieldError>
        )}
      </Field>
      {error && (
        <Alert ref={alertRef} tabIndex={-1} variant="destructive" role="alert">
          <AlertTitle>Could not save social links</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {status && <p role="status">{status}</p>}
      <div className="flex justify-end">
        <Button type="submit" isPending={form.formState.isSubmitting}>
          Save social links
        </Button>
      </div>
    </form>
  );
}
