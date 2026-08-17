"use client";
import type { ReviewViewModel } from "../_lib/queries";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import type { ActionResult } from "@/lib/forms/action-result";
import type { CreateReviewInput, UpdateReviewInput } from "../_lib/schemas";
import {
  removeReviewImages,
  reviewImagePath,
  uploadReviewImage,
} from "../_lib/uploads";

type Mutation<T> = { mutateAsync(input: T): Promise<ActionResult<unknown>> };
type ReviewMutations = {
  create?: Mutation<CreateReviewInput>;
  update?: Mutation<UpdateReviewInput>;
};
type ReviewFormValues = {
  reviewerName: string;
  content: string;
  stars: number;
  platform: string;
  createdAt: string;
  imageFile?: File;
};
const reviewFormSchema = z.object({
  reviewerName: z.string().trim().min(1, "Reviewer name is required").max(100),
  content: z.string().trim().min(1, "Review content is required").max(500),
  stars: z.number().int().min(1).max(5),
  platform: z.string().trim().min(1, "Platform is required").max(50),
  createdAt: z.string().min(1, "Review date is required"),
  imageFile: z
    .custom<File>(
      (value) =>
        value === undefined ||
        (typeof File !== "undefined" && value instanceof File),
      "Choose a valid image",
    )
    .optional(),
});

function localDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 16)
    : date.toISOString().slice(0, 16);
}

function ReviewForm({
  item,
  userId,
  mutations,
  onComplete,
}: {
  item?: ReviewViewModel;
  userId: string;
  mutations: ReviewMutations;
  onComplete(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: {
      reviewerName: item?.reviewerName ?? "",
      content: item?.content ?? "",
      stars: item?.stars ?? 5,
      platform: item?.platform ?? "",
      createdAt: localDateTime(item?.createdAt ?? new Date().toISOString()),
    },
  });

  const submit = async (values: ReviewFormValues) => {
    setError("");
    let uploaded = "";
    let imageUrl = item?.imageUrl ?? "";
    if (values.imageFile) {
      let upload: Awaited<ReturnType<typeof uploadReviewImage>>;
      try {
        upload = await uploadReviewImage(userId, values.imageFile);
      } catch {
        setError("Review image could not be uploaded");
        return;
      }
      if (!upload.ok) {
        setError(upload.formError ?? "Review image could not be uploaded");
        return;
      }
      uploaded = upload.data.objectPath;
      imageUrl = upload.data.publicUrl;
    }
    const common = {
      reviewerName: values.reviewerName,
      content: values.content,
      stars: values.stars,
      imageUrl,
      platform: values.platform,
      createdAt: new Date(values.createdAt).toISOString(),
    };
    let result: ActionResult<unknown>;
    try {
      result = item
        ? await mutations.update!.mutateAsync({
            ...common,
            id: item.id,
            enabled: item.enabled,
          })
        : await mutations.create!.mutateAsync(common);
    } catch {
      if (uploaded) await removeReviewImages([uploaded]);
      setError("Could not save review");
      return;
    }
    if (!result.ok) {
      if (uploaded) await removeReviewImages([uploaded]);
      applyActionResult(result, form, [
        "reviewerName",
        "content",
        "stars",
        "platform",
        "createdAt",
      ]);
      setError(result.formError ?? "Could not save review");
      return;
    }
    if (item && values.imageFile) {
      const stale = reviewImagePath(item.imageUrl, userId);
      if (stale) await removeReviewImages([stale]);
    }
    onComplete();
  };

  const errorField = (name: keyof ReviewFormValues) => {
    const message = form.formState.errors[name]?.message;
    return message ? (
      <FieldError assertive>{String(message)}</FieldError>
    ) : null;
  };
  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
      <Field invalid={Boolean(form.formState.errors.reviewerName)}>
        <FieldLabel>Reviewer name</FieldLabel>
        <Input {...form.register("reviewerName")} />
        {errorField("reviewerName")}
      </Field>
      <Field invalid={Boolean(form.formState.errors.content)}>
        <FieldLabel>Review content</FieldLabel>
        <Textarea {...form.register("content")} />
        {errorField("content")}
      </Field>
      <Field invalid={Boolean(form.formState.errors.stars)}>
        <FieldLabel>Rating</FieldLabel>
        <Input
          type="number"
          min="1"
          max="5"
          {...form.register("stars", { valueAsNumber: true })}
        />
        {errorField("stars")}
      </Field>
      <Field invalid={Boolean(form.formState.errors.platform)}>
        <FieldLabel>Review platform</FieldLabel>
        <Input {...form.register("platform")} />
        {errorField("platform")}
      </Field>
      <Field invalid={Boolean(form.formState.errors.createdAt)}>
        <FieldLabel>Review date</FieldLabel>
        <Input type="datetime-local" {...form.register("createdAt")} />
        {errorField("createdAt")}
      </Field>
      <Field invalid={Boolean(form.formState.errors.imageFile)}>
        <FieldLabel>
          {item
            ? "Replace reviewer image (optional)"
            : "Reviewer image (optional)"}
        </FieldLabel>
        <Input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(event) =>
            form.setValue("imageFile", event.target.files?.[0], {
              shouldValidate: true,
            })
          }
        />
        {errorField("imageFile")}
      </Field>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save review</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        {item ? "Update" : "Save"} review
      </Button>
    </form>
  );
}

export { ReviewForm };
