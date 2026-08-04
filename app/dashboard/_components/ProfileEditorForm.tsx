"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/textarea";
import { applyActionResult } from "@/app/components/forms/action-result";
import type { ActionResult } from "@/lib/forms/action-result";
import { positions } from "@/utils/global_constants";
import { profileInputSchema, type ProfileInput } from "../_lib/profile/schemas";
import type { ProfileViewModel } from "../_lib/profile/queries";

const order: (keyof ProfileInput)[] = [
  "aboutTitle",
  "aboutText",
  "title",
  "position",
  "gdcNo",
  "qualification",
  "phone",
  "contactEmail",
  "website",
  "bookingLink",
  "bookingEnabled",
];

export default function ProfileEditorForm({
  value,
  save,
  afterSuccess,
}: {
  value: ProfileViewModel;
  save(input: ProfileInput): Promise<ActionResult<ProfileViewModel>>;
  afterSuccess(): void;
}) {
  const [error, setError] = useState("");
  const alertRef = useRef<HTMLDivElement>(null);
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileInputSchema),
    defaultValues: { ...value.user, ...value.dentistry },
  });
  const field = (name: keyof ProfileInput, label: string, type = "text") => (
    <Field invalid={Boolean(form.formState.errors[name])}>
      <FieldLabel>{label}</FieldLabel>
      <Input type={type} {...form.register(name)} />
      {form.formState.errors[name]?.message && (
        <FieldError assertive>
          {form.formState.errors[name]?.message}
        </FieldError>
      )}
    </Field>
  );
  async function submit(input: ProfileInput) {
    setError("");
    const result = await save(input);
    if (!result.ok) {
      applyActionResult(result, form, order, alertRef);
      setError(result.formError ?? "Profile could not be saved");
      return;
    }
    afterSuccess();
  }
  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="flex-col-gap"
      noValidate
    >
      <h2 className="text-lg font-semibold">Profile and bio</h2>
      {field("aboutTitle", "Profile title")}
      <Field invalid={Boolean(form.formState.errors.aboutText)}>
        <FieldLabel>Bio</FieldLabel>
        <Textarea {...form.register("aboutText")} />
        {form.formState.errors.aboutText?.message && (
          <FieldError assertive>
            {form.formState.errors.aboutText.message}
          </FieldError>
        )}
      </Field>
      {field("title", "Professional title (optional)")}
      <Controller
        control={form.control}
        name="position"
        render={({ field: controlled }) => (
          <Field invalid={Boolean(form.formState.errors.position)}>
            <FieldLabel>Position</FieldLabel>
            <Select
              value={controlled.value}
              onValueChange={controlled.onChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a position" />
              </SelectTrigger>
              <SelectContent>
                {positions.map((position) => (
                  <SelectItem key={position} value={position}>
                    {position}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      />
      {field("gdcNo", "GDC / Professional Body Reg No. (optional)")}
      {field("qualification", "Qualification (optional)")}
      {field("phone", "Contact phone (optional)")}
      {field("contactEmail", "Contact email (optional)", "email")}
      {field("website", "Website (optional)", "url")}
      {field("bookingLink", "Booking link (optional)", "url")}
      <Controller
        control={form.control}
        name="bookingEnabled"
        render={({ field: controlled }) => (
          <Field className="flex-row items-center gap-3">
            <Switch
              checked={controlled.value}
              onCheckedChange={controlled.onChange}
              aria-label="Show booking link on profile"
            />
            <FieldLabel>Show booking link on profile</FieldLabel>
          </Field>
        )}
      />
      {error && (
        <Alert ref={alertRef} tabIndex={-1} variant="destructive" role="alert">
          <AlertTitle>Could not save profile</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end">
        <Button type="submit" isPending={form.formState.isSubmitting}>
          Save profile
        </Button>
      </div>
    </form>
  );
}
