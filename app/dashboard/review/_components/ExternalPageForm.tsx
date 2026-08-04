"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import type { ActionResult } from "@/lib/forms/action-result";
import type { ExternalReviewPageInput } from "../_lib/schemas";
import { externalReviewPageSchema } from "../_lib/schemas";

type Mutation<T> = { mutateAsync(input: T): Promise<ActionResult<unknown>> };

function ExternalPageForm({
  link,
  enabled,
  mutation,
  onComplete,
}: {
  link: string;
  enabled: boolean;
  mutation?: Mutation<ExternalReviewPageInput>;
  onComplete(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<ExternalReviewPageInput>({
    resolver: zodResolver(externalReviewPageSchema),
    defaultValues: { link },
  });
  useEffect(() => form.reset({ link }), [form, link]);
  const submit = async (values: ExternalReviewPageInput) => {
    const result = await mutation!.mutateAsync(values);
    if (!result.ok) {
      applyActionResult(result, form, ["link"]);
      setError(result.formError ?? "Could not save external review page");
      return;
    }
    setError("");
    onComplete();
  };
  return (
    <form
      onSubmit={form.handleSubmit(submit)}
      className="mt-8 space-y-3 rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
    >
      <div>
        <h3 className="text-lg font-semibold">External reviews page</h3>
        <p className="text-sm text-muted-foreground">
          Link to Google Reviews or another trusted reviews page.
        </p>
      </div>
      <Field invalid={Boolean(form.formState.errors.link)}>
        <FieldLabel>External reviews page URL (optional)</FieldLabel>
        <Input type="url" {...form.register("link")} />
        {form.formState.errors.link && (
          <FieldError assertive>
            {form.formState.errors.link.message}
          </FieldError>
        )}
      </Field>
      {error && <p role="alert">{error}</p>}
      <Button
        type="submit"
        disabled={!enabled}
        isPending={form.formState.isSubmitting}
      >
        Save external reviews page
      </Button>
    </form>
  );
}

export { ExternalPageForm };
