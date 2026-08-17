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
  externalReviewSectionTitleSchema,
  type ExternalReviewSectionTitleInput,
} from "../_lib/schemas";

type SavedTitle = { externalReviewSectionTitle: string | null };

export default function ExternalReviewSectionTitleForm({
  title,
  enabled,
  onSave,
  onSaved,
}: {
  title: string | null;
  enabled: boolean;
  onSave(
    input: ExternalReviewSectionTitleInput,
  ): Promise<ActionResult<SavedTitle>>;
  onSaved(): void;
}) {
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const lastTitle = useRef(title);
  const form = useForm<ExternalReviewSectionTitleInput>({
    resolver: zodResolver(externalReviewSectionTitleSchema),
    defaultValues: { externalReviewSectionTitle: title ?? "" },
  });
  const isDirty = form.formState.isDirty;

  useEffect(() => {
    if (lastTitle.current === title) return;
    lastTitle.current = title;
    if (!isDirty) {
      form.reset({ externalReviewSectionTitle: title ?? "" });
    }
  }, [form, isDirty, title]);

  const submit = async (input: ExternalReviewSectionTitleInput) => {
    setNotice("");
    setError("");
    let result: ActionResult<SavedTitle>;
    try {
      result = await onSave(input);
    } catch {
      setError("Could not save the external review section title");
      return;
    }
    if (!result.ok) {
      applyActionResult(result, form, ["externalReviewSectionTitle"]);
      setError(
        result.formError ?? "Could not save the external review section title",
      );
      return;
    }
    const saved = result.data.externalReviewSectionTitle ?? "";
    form.reset({ externalReviewSectionTitle: saved });
    setNotice(
      saved
        ? "External review section title saved."
        : "External review section title removed.",
    );
    onSaved();
  };

  return (
    <section
      className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm"
      data-testid="external-review-section-title-form"
    >
      <div>
        <h3 className="font-semibold">External review section heading</h3>
        <p className="text-sm text-muted-foreground">
          This heading appears above your external review links. Leave it blank
          to show the links without a heading.
        </p>
      </div>
      <form
        className="space-y-4"
        noValidate
        onSubmit={(event) => void form.handleSubmit(submit)(event)}
      >
        <Field
          invalid={Boolean(form.formState.errors.externalReviewSectionTitle)}
        >
          <FieldLabel>External review section title</FieldLabel>
          <Input
            {...form.register("externalReviewSectionTitle", {
              onChange: () => {
                setNotice("");
                setError("");
              },
            })}
            disabled={!enabled}
            maxLength={100}
          />
          {form.formState.errors.externalReviewSectionTitle ? (
            <FieldError assertive>
              {form.formState.errors.externalReviewSectionTitle.message}
            </FieldError>
          ) : null}
        </Field>
        <div className="flex items-center gap-3">
          <Button
            disabled={!enabled}
            isPending={form.formState.isSubmitting}
            type="submit"
          >
            Save external review heading
          </Button>
          {notice ? (
            <p className="text-sm text-muted-foreground" role="status">
              {notice}
            </p>
          ) : null}
        </div>
        {error ? (
          <Alert variant="destructive" role="alert">
            <AlertTitle>Could not save heading</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
      </form>
    </section>
  );
}
