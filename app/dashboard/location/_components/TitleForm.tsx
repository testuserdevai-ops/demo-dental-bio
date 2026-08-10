"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { useLocationMutations } from "../_lib/hooks";
import { locationTitleSchema, type LocationTitleInput } from "../_lib/schemas";
type Mutations = ReturnType<typeof useLocationMutations>;
function TitleForm({
  title,
  mutations,
  onDone,
}: {
  title: string;
  mutations: Mutations;
  onDone(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<LocationTitleInput>({
    resolver: zodResolver(locationTitleSchema),
    defaultValues: { title },
  });
  const submit = async (value: LocationTitleInput) => {
    setError("");
    const result = await mutations.saveTitle.mutateAsync(value);
    if (!result.ok) {
      applyActionResult(result, form, ["title"]);
      setError(result.formError ?? "Could not save location title");
      return;
    }
    onDone();
  };
  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-3xl border bg-white p-4 shadow-sm"
      onSubmit={form.handleSubmit(submit)}
      noValidate
    >
      <Field className="flex-1" invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>Location title</FieldLabel>
        <Input {...form.register("title")} />
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      <Button type="submit" isPending={form.formState.isSubmitting}>
        Save title
      </Button>
      {error && (
        <Alert className="basis-full" variant="destructive" role="alert">
          <AlertTitle>Could not save title</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}

export { TitleForm };
