"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import type { ActionResult } from "@/lib/forms/action-result";
import {
  treatmentServiceSectionTitlesSchema,
  type TreatmentServiceSectionTitlesInput,
} from "./_lib/schemas";

export default function SectionTitleForm({
  titles,
  onSave,
  onSaved,
}: {
  titles: TreatmentServiceSectionTitlesInput;
  onSave(
    input: TreatmentServiceSectionTitlesInput,
  ): Promise<ActionResult<TreatmentServiceSectionTitlesInput>>;
  onSaved(): void;
}) {
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const form = useForm<TreatmentServiceSectionTitlesInput>({
    resolver: zodResolver(treatmentServiceSectionTitlesSchema),
    defaultValues: titles,
  });
  const isDirty = form.formState.isDirty;
  const lastTitles = useRef(titles);
  const pendingTitles = useRef<TreatmentServiceSectionTitlesInput | null>(null);

  useEffect(() => {
    const titlesAreCurrent =
      lastTitles.current.treatmentSectionTitle ===
        titles.treatmentSectionTitle &&
      lastTitles.current.serviceSectionTitle === titles.serviceSectionTitle;
    if (!titlesAreCurrent) {
      lastTitles.current = titles;
      if (isDirty) {
        pendingTitles.current = titles;
        return;
      }
      pendingTitles.current = null;
      form.reset(titles);
      setError("");
      setSaved(false);
      return;
    }
    if (!isDirty && pendingTitles.current) {
      const pending = pendingTitles.current;
      pendingTitles.current = null;
      form.reset(pending);
      setError("");
      setSaved(false);
    }
  }, [form, isDirty, titles]);

  const submit = async (input: TreatmentServiceSectionTitlesInput) => {
    setError("");
    setSaved(false);
    let result: ActionResult<TreatmentServiceSectionTitlesInput>;
    try {
      result = await onSave(input);
    } catch {
      setError("Could not save treatment and service section titles");
      return;
    }
    if (!result.ok) {
      applyActionResult(result, form, [
        "treatmentSectionTitle",
        "serviceSectionTitle",
      ]);
      setError(
        result.formError ??
          "Could not save treatment and service section titles",
      );
      return;
    }
    pendingTitles.current = null;
    form.reset(result.data);
    setSaved(true);
    onSaved();
  };

  return (
    <section
      className="mb-6 space-y-4 rounded-3xl border bg-white p-5 shadow-sm"
      data-testid="treatment-service-section-titles"
    >
      <div>
        <h3 className="font-semibold">Public section titles</h3>
        <p className="text-sm text-muted-foreground">
          These headings appear above treatments and services on your public
          profile.
        </p>
      </div>
      <form
        className="grid gap-4 md:grid-cols-2"
        onSubmit={form.handleSubmit(submit)}
        noValidate
      >
        <Field invalid={Boolean(form.formState.errors.treatmentSectionTitle)}>
          <FieldLabel>Treatment section title</FieldLabel>
          <Input
            {...form.register("treatmentSectionTitle", {
              onChange: () => setSaved(false),
            })}
          />
          {form.formState.errors.treatmentSectionTitle && (
            <FieldError assertive>
              {form.formState.errors.treatmentSectionTitle.message}
            </FieldError>
          )}
        </Field>
        <Field invalid={Boolean(form.formState.errors.serviceSectionTitle)}>
          <FieldLabel>Service section title</FieldLabel>
          <Input
            {...form.register("serviceSectionTitle", {
              onChange: () => setSaved(false),
            })}
          />
          {form.formState.errors.serviceSectionTitle && (
            <FieldError assertive>
              {form.formState.errors.serviceSectionTitle.message}
            </FieldError>
          )}
        </Field>
        <div className="flex items-center gap-3 md:col-span-2">
          <Button type="submit" isPending={form.formState.isSubmitting}>
            Save section titles
          </Button>
          {saved && !isDirty && (
            <p className="text-sm text-muted-foreground" role="status">
              Section titles saved.
            </p>
          )}
        </div>
        {error && (
          <Alert className="md:col-span-2" variant="destructive" role="alert">
            <AlertTitle>Could not save section titles</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </form>
    </section>
  );
}
