"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import type { ActionResult } from "@/lib/forms/action-result";
import type {
  DentalGalleryViewModel,
  GeneralGalleryViewModel,
} from "../_lib/queries";
import type {
  CreateDentalGalleryInput,
  CreateGeneralGalleryInput,
  UpdateDentalGalleryInput,
  UpdateGeneralGalleryInput,
} from "../_lib/schemas";
import {
  galleryImagePath,
  removeGalleryImages,
  uploadGalleryImage,
} from "../_lib/uploads";

type Mutation<T> = { mutateAsync(input: T): Promise<ActionResult<unknown>> };
type GalleryMutations = {
  createDental?: Mutation<CreateDentalGalleryInput>;
  updateDental?: Mutation<UpdateDentalGalleryInput>;
  createGeneral?: Mutation<CreateGeneralGalleryInput>;
  updateGeneral?: Mutation<UpdateGeneralGalleryInput>;
};
type Editor =
  | { kind: "dental"; item?: DentalGalleryViewModel }
  | { kind: "general"; item?: GeneralGalleryViewModel };
type GalleryFormValues = {
  title: string;
  beforeLabel: string;
  afterLabel: string;
  beforeFile?: File;
  afterFile?: File;
  imageFile?: File;
};

const optionalFile = z.custom<File>(
  (value) =>
    value === undefined ||
    (typeof File !== "undefined" && value instanceof File),
  "Choose a valid image",
);
function galleryFormSchema(editor: Editor) {
  return z
    .object({
      title: z.string().trim().min(1, "Title is required").max(100),
      beforeLabel: z.string().trim().max(50),
      afterLabel: z.string().trim().max(50),
      beforeFile: optionalFile.optional(),
      afterFile: optionalFile.optional(),
      imageFile: optionalFile.optional(),
    })
    .superRefine((value, context) => {
      if (editor.item) return;
      const required =
        editor.kind === "dental"
          ? (["beforeFile", "afterFile"] as const)
          : (["imageFile"] as const);
      for (const field of required)
        if (!value[field])
          context.addIssue({
            code: "custom",
            path: [field],
            message: "Image is required",
          });
    });
}

function GalleryForm({
  editor,
  userId,
  mutations,
  onComplete,
}: {
  editor: Editor;
  userId: string;
  mutations: GalleryMutations;
  onComplete(): void;
}) {
  const [error, setError] = useState("");
  const item = editor.item;
  const dentalItem = editor.kind === "dental" ? editor.item : undefined;
  const form = useForm<GalleryFormValues>({
    resolver: zodResolver(galleryFormSchema(editor)),
    defaultValues: {
      title: item?.title ?? "",
      beforeLabel: dentalItem?.beforeLabel ?? "",
      afterLabel: dentalItem?.afterLabel ?? "",
    },
  });

  const upload = async (file: File | undefined, uploaded: string[]) => {
    if (!file) return null;
    const result = await uploadGalleryImage(userId, file);
    if (!result.ok) throw result;
    uploaded.push(result.data.objectPath);
    return result.data.publicUrl;
  };

  const submit = async (values: GalleryFormValues) => {
    setError("");
    const uploaded: string[] = [];
    try {
      let result: ActionResult<unknown>;
      const stale: string[] = [];
      if (editor.kind === "dental") {
        const current = item as DentalGalleryViewModel | undefined;
        const before =
          (await upload(values.beforeFile, uploaded)) ??
          current?.beforeImageUrl ??
          "";
        const after =
          (await upload(values.afterFile, uploaded)) ??
          current?.afterImageUrl ??
          "";
        result = current
          ? await mutations.updateDental!.mutateAsync({
              id: current.id,
              title: values.title,
              beforeImageUrl: before,
              afterImageUrl: after,
              beforeLabel: values.beforeLabel,
              afterLabel: values.afterLabel,
              enabled: current.enabled,
            })
          : await mutations.createDental!.mutateAsync({
              title: values.title,
              beforeImageUrl: before,
              afterImageUrl: after,
              beforeLabel: values.beforeLabel,
              afterLabel: values.afterLabel,
            });
        if (current && result.ok) {
          if (values.beforeFile) {
            const path = galleryImagePath(current.beforeImageUrl, userId);
            if (path) stale.push(path);
          }
          if (values.afterFile) {
            const path = galleryImagePath(current.afterImageUrl, userId);
            if (path) stale.push(path);
          }
        }
      } else {
        const current = item as GeneralGalleryViewModel | undefined;
        const image =
          (await upload(values.imageFile, uploaded)) ?? current?.imageUrl ?? "";
        result = current
          ? await mutations.updateGeneral!.mutateAsync({
              id: current.id,
              title: values.title,
              imageUrl: image,
              enabled: current.enabled,
            })
          : await mutations.createGeneral!.mutateAsync({
              title: values.title,
              imageUrl: image,
            });
        if (current && values.imageFile && result.ok) {
          const path = galleryImagePath(current.imageUrl, userId);
          if (path) stale.push(path);
        }
      }
      if (!result.ok) {
        await removeGalleryImages(uploaded);
        applyActionResult(result, form, ["title", "beforeLabel", "afterLabel"]);
        setError(result.formError ?? "Could not save gallery");
        return;
      }
      await removeGalleryImages(stale);
      onComplete();
    } catch (failure) {
      await removeGalleryImages(uploaded);
      const result = failure as ActionResult<unknown>;
      setError(
        !result.ok && result.formError
          ? result.formError
          : "Gallery image could not be uploaded",
      );
    }
  };

  const file = (
    name: "beforeFile" | "afterFile" | "imageFile",
    label: string,
  ) => (
    <Field invalid={Boolean(form.formState.errors[name])}>
      <FieldLabel>{label}</FieldLabel>
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(event) =>
          form.setValue(name, event.target.files?.[0], { shouldValidate: true })
        }
      />
      {form.formState.errors[name] && (
        <FieldError assertive>
          {form.formState.errors[name]?.message as string}
        </FieldError>
      )}
    </Field>
  );

  return (
    <form onSubmit={form.handleSubmit(submit)} className="space-y-3">
      <Field invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>Gallery title</FieldLabel>
        <Input {...form.register("title", { onChange: () => setError("") })} />
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      {editor.kind === "dental" ? (
        <>
          <Field invalid={Boolean(form.formState.errors.beforeLabel)}>
            <FieldLabel>Before image label</FieldLabel>
            <Input {...form.register("beforeLabel")} />
            {form.formState.errors.beforeLabel && (
              <FieldError assertive>
                {form.formState.errors.beforeLabel.message}
              </FieldError>
            )}
          </Field>
          {file(
            "beforeFile",
            item ? "Replace before image (optional)" : "Before image",
          )}
          <Field invalid={Boolean(form.formState.errors.afterLabel)}>
            <FieldLabel>After image label</FieldLabel>
            <Input {...form.register("afterLabel")} />
            {form.formState.errors.afterLabel && (
              <FieldError assertive>
                {form.formState.errors.afterLabel.message}
              </FieldError>
            )}
          </Field>
          {file(
            "afterFile",
            item ? "Replace after image (optional)" : "After image",
          )}
        </>
      ) : (
        file(
          "imageFile",
          item ? "Replace gallery image (optional)" : "Gallery image",
        )
      )}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save gallery</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        {item ? "Update" : "Save"} gallery
      </Button>
    </form>
  );
}

export { GalleryForm };
