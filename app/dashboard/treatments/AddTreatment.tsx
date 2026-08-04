"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
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
import { Switch } from "@/app/components/ui/switch";
import { Textarea } from "@/app/components/ui/textarea";
import { applyActionResult } from "@/app/components/forms/action-result";
import type { ActionResult } from "@/lib/forms/action-result";
import { TREATMENT_DESCRIPTION_MAX_LENGTH } from "@/lib/treatmentDescription";
import {
  createTreatmentInputSchema,
  type CreateTreatmentInput,
} from "./_lib/schemas";

export default function AddTreatment({
  onCreate,
}: {
  onCreate(input: CreateTreatmentInput): Promise<ActionResult<unknown>>;
}) {
  const [isService, setIsService] = useState(false);
  const [formError, setFormError] = useState("");
  const form = useForm<Omit<CreateTreatmentInput, "kind">>({
    resolver: zodResolver(createTreatmentInputSchema.omit({ kind: true })),
    defaultValues: { title: "", description: "" },
  });
  const description =
    useWatch({ control: form.control, name: "description" }) ?? "";
  const label = isService ? "Service" : "Treatment";

  async function submit(values: Omit<CreateTreatmentInput, "kind">) {
    setFormError("");
    const result = await onCreate({
      ...values,
      kind: isService ? "service" : "treatment",
    });
    if (result.ok) {
      form.reset();
      return;
    }
    applyActionResult(result, form, ["title", "description"]);
    setFormError(result.formError ?? `Unable to save ${label.toLowerCase()}`);
  }

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="flex-col-gap mb-6 mt-10"
    >
      <div className="flex-col-gap pb-2 sm:flex-row sm:items-center sm:justify-between sm:pb-0">
        <h2 className="text-lg font-semibold">Add new {label.toLowerCase()}</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Treatment</span>
          <Switch
            checked={isService}
            onCheckedChange={setIsService}
            aria-label="Add a service instead of a treatment"
          />
          <span className="text-sm font-medium">Service</span>
        </div>
      </div>
      <Field invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>{label} title</FieldLabel>
        <Input
          {...form.register("title", { onChange: () => setFormError("") })}
        />
        <FieldDescription>
          Use a clear name for this {label.toLowerCase()}.
        </FieldDescription>
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.description)}>
        <FieldLabel>{label} description</FieldLabel>
        <Textarea
          {...form.register("description", {
            onChange: () => setFormError(""),
          })}
        />
        <FieldDescription className="text-right">
          {description.length}/{TREATMENT_DESCRIPTION_MAX_LENGTH}
        </FieldDescription>
        {form.formState.errors.description && (
          <FieldError assertive>
            {form.formState.errors.description.message}
          </FieldError>
        )}
      </Field>
      {formError && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save {label.toLowerCase()}</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}
      <div className="flex w-full justify-end">
        <Button type="submit" isPending={form.formState.isSubmitting}>
          Add {label.toLowerCase()}
        </Button>
      </div>
    </form>
  );
}
