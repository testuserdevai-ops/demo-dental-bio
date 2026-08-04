"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Textarea } from "@/app/components/ui/textarea";
import type { ActionResult } from "@/lib/forms/action-result";
import {
  blogImagePath,
  removeBlogImages,
  uploadBlogImage,
} from "../_lib/uploads";
import {
  blogFormSchema,
  type BlogEditor,
  type BlogMutations,
  type BlogValues,
} from "./blog-manager-shared";

export function BlogForm({
  editor,
  userId,
  mutations,
  onDone,
}: {
  editor: Extract<BlogEditor, { kind: "blog" }>;
  userId: string;
  mutations: BlogMutations;
  onDone(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<BlogValues>({
    resolver: zodResolver(blogFormSchema),
    defaultValues: {
      title: editor.blog?.title ?? "",
      slug: editor.blog?.slug ?? "",
      content: editor.blog?.content ?? "",
      metaTitle: editor.blog?.metaTitle ?? "",
      metaDescription: editor.blog?.metaDescription ?? "",
    },
  });
  const submit = async (value: BlogValues) => {
    setError("");
    const uploaded: string[] = [];
    try {
      let imageUrl = editor.blog?.imageUrl ?? "";
      if (value.imageFile) {
        const uploadedImage = await uploadBlogImage(userId, value.imageFile);
        if (!uploadedImage.ok) throw uploadedImage;
        uploaded.push(uploadedImage.data.objectPath);
        imageUrl = uploadedImage.data.publicUrl;
      }
      const result: ActionResult<unknown> = editor.blog
        ? await mutations.updateBlog.mutateAsync({
            id: editor.blog.id,
            title: value.title,
            slug: value.slug,
            content: value.content,
            metaTitle: value.metaTitle,
            metaDescription: value.metaDescription,
            imageUrl,
            enabled: editor.blog.enabled,
          })
        : await mutations.createBlog.mutateAsync({
            groupId: editor.group.id,
            title: value.title,
            slug: value.slug,
            content: value.content,
            metaTitle: value.metaTitle,
            metaDescription: value.metaDescription,
            imageUrl,
            enabled: true,
          });
      if (!result.ok) {
        await removeBlogImages(uploaded);
        applyActionResult(result, form, [
          "title",
          "slug",
          "content",
          "metaTitle",
          "metaDescription",
        ]);
        setError(result.formError ?? "Could not save blog");
        return;
      }
      if (editor.blog && value.imageFile) {
        const stale = blogImagePath(editor.blog.imageUrl, userId);
        if (stale) await removeBlogImages([stale]);
      }
      onDone();
    } catch (failure) {
      await removeBlogImages(uploaded);
      const result = failure as ActionResult<unknown>;
      setError(
        !result.ok && result.formError
          ? result.formError
          : "Blog image could not be uploaded",
      );
    }
  };
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(submit)} noValidate>
      <Field invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>Blog title</FieldLabel>
        <Input {...form.register("title", { onChange: () => setError("") })} />
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.slug)}>
        <FieldLabel>URL slug (optional)</FieldLabel>
        <Input placeholder="my-blog-post" {...form.register("slug")} />
        {form.formState.errors.slug && (
          <FieldError assertive>
            {form.formState.errors.slug.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.content)}>
        <FieldLabel>Content</FieldLabel>
        <Textarea className="min-h-40" {...form.register("content")} />
        {form.formState.errors.content && (
          <FieldError assertive>
            {form.formState.errors.content.message}
          </FieldError>
        )}
      </Field>
      <Field>
        <FieldLabel>Search title (optional)</FieldLabel>
        <Input {...form.register("metaTitle")} />
      </Field>
      <Field>
        <FieldLabel>Search description (optional)</FieldLabel>
        <Textarea {...form.register("metaDescription")} />
      </Field>
      <Field invalid={Boolean(form.formState.errors.imageFile)}>
        <FieldLabel>
          {editor.blog
            ? "Replace cover image (optional)"
            : "Cover image (optional)"}
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
        {form.formState.errors.imageFile && (
          <FieldError assertive>
            {form.formState.errors.imageFile.message as string}
          </FieldError>
        )}
      </Field>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save blog</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        {editor.blog ? "Update" : "Save"} blog
      </Button>
    </form>
  );
}
