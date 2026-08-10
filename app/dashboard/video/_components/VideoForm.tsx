"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import {
  editorSchema,
  type VideoEditor,
  type VideoMutations,
  type VideoValues,
} from "./video-manager-shared";

export function VideoForm({
  editor,
  mutations,
  onDone,
}: {
  editor: Extract<VideoEditor, { kind: "video" }>;
  mutations: VideoMutations;
  onDone(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<VideoValues>({
    resolver: zodResolver(editorSchema),
    defaultValues: {
      title: editor.video?.title ?? "",
      link: editor.video?.link ?? "",
    },
  });
  const submit = async (value: VideoValues) => {
    setError("");
    const result = editor.video
      ? await mutations.updateVideo.mutateAsync({
          id: editor.video.id,
          groupId: editor.group.id,
          title: value.title,
          link: value.link,
          enabled: editor.video.enabled,
        })
      : await mutations.createVideo.mutateAsync({
          groupId: editor.group.id,
          title: value.title,
          link: value.link,
          enabled: true,
        });
    if (!result.ok) {
      applyActionResult(result, form, ["title", "link"]);
      setError(result.formError ?? "Could not save video");
      return;
    }
    onDone();
  };
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(submit)} noValidate>
      <Field invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>Video title</FieldLabel>
        <Input {...form.register("title", { onChange: () => setError("") })} />
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.link)}>
        <FieldLabel>Video URL</FieldLabel>
        <Input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          {...form.register("link", { onChange: () => setError("") })}
        />
        {form.formState.errors.link && (
          <FieldError assertive>
            {form.formState.errors.link.message}
          </FieldError>
        )}
      </Field>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save video</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        {editor.video ? "Update" : "Add"} video
      </Button>
    </form>
  );
}
