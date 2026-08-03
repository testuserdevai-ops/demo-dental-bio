"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
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
import { usePreview } from "@/app/contexts/PreviewContext";
import { TREATMENT_DESCRIPTION_MAX_LENGTH } from "@/lib/treatmentDescription";
import { treatmentSchema } from "@/lib/validation";
import { apiClient } from "@/services/apiClient";

type TreatmentFormValues = { title: string; description: string };

function fieldError(message: string | undefined, label: string) {
  return message
    ?.replace("Title", `${label} title`)
    .replace("Description", `${label} description`);
}

interface TreatmentItem {
  treatment_id: string;
  title: string;
  description: string;
  rank: number;
}

interface AddTreatmentFormProps {
  dentistryId: string;
  onNewTreatment?: (treatment: TreatmentItem) => void;
  onNewService?: (service: TreatmentItem) => void;
}

function toCapitalFirst(sentence: string): string {
  return sentence
    .toLowerCase()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

export default function AddTreatmentForm({
  dentistryId,
  onNewTreatment,
  onNewService,
}: AddTreatmentFormProps) {
  const [isService, setIsService] = useState(false);
  const [formError, setFormError] = useState("");
  const { triggerReload } = usePreview();
  const form = useForm<TreatmentFormValues>({
    resolver: zodResolver(treatmentSchema),
    defaultValues: { title: "", description: "" },
  });
  const description = form.watch("description") ?? "";
  const label = isService ? "Service" : "Treatment";
  const descriptionOverLimit =
    description.length > TREATMENT_DESCRIPTION_MAX_LENGTH;

  useEffect(() => {
    const saved = window.localStorage.getItem("isService");
    if (saved !== null) setIsService(JSON.parse(saved));
  }, []);

  const toggleIsService = (checked: boolean) => {
    setIsService(checked);
    window.localStorage.setItem("isService", JSON.stringify(checked));
  };

  const submit = async () => {
    setFormError("");
    // Keep the legacy payload behavior: Zod validates, but values are not silently
    // normalized before transport (create title capitalization remains intentional).
    const values = form.getValues();
    try {
      const item = await apiClient.post<TreatmentItem>("/api/treatments", {
        dentistryId,
        title: toCapitalFirst(values.title),
        description: values.description,
        isService,
      });
      if (isService) onNewService?.(item);
      else onNewTreatment?.(item);
      triggerReload();
      form.reset();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : `Unable to save ${label.toLowerCase()}`,
      );
    }
  };

  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="flex-col-gap mb-6 mt-10"
    >
      <div className="flex-col-gap pb-2 sm:flex-row sm:items-center sm:justify-between sm:pb-0">
        <h2 className="text-lg font-semibold">Add new {label.toLowerCase()}</h2>
        <div className="flex items-center gap-2">
          <label
            htmlFor="treatment-service-switcher"
            className="text-sm font-medium"
          >
            Treatment
          </label>
          <Switch
            id="treatment-service-switcher"
            checked={isService}
            onCheckedChange={toggleIsService}
            aria-label="Add a service instead of a treatment"
          />
          <span className="text-sm font-medium">Service</span>
        </div>
      </div>

      <Field
        id="treatment-title"
        invalid={Boolean(form.formState.errors.title)}
      >
        <FieldLabel>{label} title</FieldLabel>
        <Input
          placeholder={`${label} title`}
          {...form.register("title", { onChange: () => setFormError("") })}
        />
        <FieldDescription>
          Use a clear name for this {label.toLowerCase()}.
        </FieldDescription>
        {form.formState.errors.title && (
          <FieldError assertive>
            {fieldError(form.formState.errors.title.message, label)}
          </FieldError>
        )}
      </Field>

      <Field
        id="treatment-description"
        invalid={
          descriptionOverLimit || Boolean(form.formState.errors.description)
        }
      >
        <FieldLabel>{label} description</FieldLabel>
        <Textarea
          placeholder={`${label} description`}
          {...form.register("description", {
            onChange: () => setFormError(""),
          })}
        />
        <FieldDescription
          className={`text-right text-sm ${descriptionOverLimit ? "text-destructive" : "text-muted-foreground"}`}
        >
          {description.length}/{TREATMENT_DESCRIPTION_MAX_LENGTH}
        </FieldDescription>
        {descriptionOverLimit ? (
          <FieldError assertive className="text-right">
            Character limit exceeded by{" "}
            {description.length - TREATMENT_DESCRIPTION_MAX_LENGTH}
          </FieldError>
        ) : form.formState.errors.description ? (
          <FieldError assertive>
            {fieldError(form.formState.errors.description.message, label)}
          </FieldError>
        ) : null}
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
