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
  groupFormSchema,
  type GroupValues,
  type VideoEditor,
  type VideoMutations,
} from "./video-manager-shared";

export function GroupForm({
  editor,
  mutations,
  onDone,
}: {
  editor: Extract<VideoEditor, { kind: "group" }>;
  mutations: VideoMutations;
  onDone(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<GroupValues>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: editor.group?.name ?? "" },
  });
  const submit = async (value: GroupValues) => {
    setError("");
    const result = editor.group
      ? await mutations.updateGroup.mutateAsync({
          id: editor.group.id,
          name: value.name,
          enabled: editor.group.enabled,
        })
      : await mutations.createGroup.mutateAsync(value);
    if (!result.ok) {
      applyActionResult(result, form, ["name"]);
      setError(result.formError ?? "Could not save video group");
      return;
    }
    onDone();
  };
  return (
    <form className="space-y-3" onSubmit={form.handleSubmit(submit)} noValidate>
      <Field invalid={Boolean(form.formState.errors.name)}>
        <FieldLabel>Group name</FieldLabel>
        <Input {...form.register("name", { onChange: () => setError("") })} />
        {form.formState.errors.name && (
          <FieldError assertive>
            {form.formState.errors.name.message}
          </FieldError>
        )}
      </Field>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not save group</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" isPending={form.formState.isSubmitting}>
        {editor.group ? "Update" : "Add"} group
      </Button>
    </form>
  );
}
