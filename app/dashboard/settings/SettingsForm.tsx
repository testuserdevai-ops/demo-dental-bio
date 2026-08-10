"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
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
import { usePreview } from "@/app/contexts/PreviewContext";
import type { Database } from "@/lib/supabase/database.types";
import { saveDashboardSettings } from "./actions";
import {
  dashboardSettingsSchema,
  type DashboardSettingsInput,
  settingsTitles,
} from "./_lib/schemas";

type DashboardSettingsUser = Partial<
  Database["public"]["Tables"]["users"]["Row"]
>;

export default function SettingsForm({
  user,
  targetUserId,
}: {
  user: DashboardSettingsUser;
  targetUserId?: string;
}) {
  const router = useRouter();
  const { triggerReload } = usePreview();
  const form = useForm<DashboardSettingsInput>({
    resolver: zodResolver(dashboardSettingsSchema),
    defaultValues: {
      title: settingsTitles.includes(
        user.title as (typeof settingsTitles)[number],
      )
        ? (user.title as DashboardSettingsInput["title"])
        : "N/A",
      username: user.username ?? "",
      first_name: user.first_name ?? "",
      middle_name: user.middle_name ?? "",
      last_name: user.last_name ?? "",
      birthday: user.birthday ?? "",
    },
  });
  const rootError = form.formState.errors.root?.message;

  const submit = form.handleSubmit(async (values) => {
    const result = await saveDashboardSettings(targetUserId, values);
    if (!result.ok) {
      applyActionResult(result, form, [
        "title",
        "username",
        "first_name",
        "middle_name",
        "last_name",
        "birthday",
      ]);
      if (!result.fieldErrors)
        form.setError("root", {
          message: result.formError ?? "Settings could not be saved",
        });
      return;
    }
    toast.success("Settings saved");
    triggerReload();
    router.refresh();
  });

  const field = (
    name: "username" | "first_name" | "middle_name" | "last_name" | "birthday",
    label: string,
    props?: React.ComponentProps<typeof Input>,
  ) => {
    const error = form.formState.errors[name];
    return (
      <Field id={`settings-${name.replace("_", "-")}`} invalid={Boolean(error)}>
        <FieldLabel>{label}</FieldLabel>
        <Input {...props} {...form.register(name)} />
        {error && <FieldError assertive>{error.message}</FieldError>}
      </Field>
    );
  };

  return (
    <form
      noValidate
      onSubmit={submit}
      className="space-y-5 rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
    >
      <div>
        <h3 className="text-lg font-semibold text-dark">Profile identity</h3>
        <p className="text-sm text-muted-foreground">
          Update the name and username shown on your public bio.
        </p>
      </div>
      <Controller
        control={form.control}
        name="title"
        render={({ field: control, fieldState }) => (
          <Field id="settings-title" invalid={Boolean(fieldState.error)}>
            <FieldLabel>Title</FieldLabel>
            <Select value={control.value} onValueChange={control.onChange}>
              <SelectTrigger ref={control.ref}>
                <SelectValue placeholder="Choose a title" />
              </SelectTrigger>
              <SelectContent>
                {settingsTitles.map((title) => (
                  <SelectItem key={title} value={title}>
                    {title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {fieldState.error && (
              <FieldError assertive>{fieldState.error.message}</FieldError>
            )}
          </Field>
        )}
      />
      {field("username", "Username", {
        autoComplete: "username",
        placeholder: "your-username",
      })}
      <div className="grid gap-5 sm:grid-cols-2">
        {field("first_name", "First Name", { autoComplete: "given-name" })}
        {field("middle_name", "Middle Name (optional)", {
          autoComplete: "additional-name",
        })}
      </div>
      {field("last_name", "Last Name", { autoComplete: "family-name" })}
      {field("birthday", "Birthday", { type: "date" })}
      {rootError && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Settings were not saved</AlertTitle>
          <AlertDescription>{rootError}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end">
        <Button type="submit" isPending={form.formState.isSubmitting}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
