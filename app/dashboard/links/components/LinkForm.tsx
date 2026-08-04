"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import type { LinkViewModel } from "../_lib/queries";
import { createLinkInputSchema, type CreateLinkInput } from "../_lib/schemas";
import { ErrorAlert } from "./ErrorAlert";
import type { LinkMutations } from "./links-manager-shared";

export function LinkForm({
  groupId,
  link,
  mutations,
  afterSuccess,
  onCancel,
}: {
  groupId: string;
  link?: LinkViewModel;
  mutations: LinkMutations;
  afterSuccess(): void;
  onCancel?(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<Omit<CreateLinkInput, "linkGroupId">>({
    resolver: zodResolver(createLinkInputSchema.omit({ linkGroupId: true })),
    defaultValues: {
      title: link?.title ?? "",
      url: link?.url ?? "https://",
      isActive: link?.isActive ?? true,
    },
  });
  const mutation = link ? mutations.updateLink : mutations.createLink;
  const submit = async (values: Omit<CreateLinkInput, "linkGroupId">) => {
    setError("");
    const result = link
      ? await mutations.updateLink.mutateAsync({
          linkGroupId: groupId,
          linkId: link.id,
          ...values,
        })
      : await mutations.createLink.mutateAsync({
          linkGroupId: groupId,
          ...values,
        });
    if (!result.ok) {
      applyActionResult(result, form, ["title", "url"]);
      setError(result.formError ?? "Unable to save link");
      return;
    }
    form.reset({ title: "", url: "https://", isActive: true });
    afterSuccess();
  };
  return (
    <form onSubmit={form.handleSubmit(submit)} className="flex-col-gap">
      <Field invalid={Boolean(form.formState.errors.title)}>
        <FieldLabel>{link ? "Link title" : "New link title"}</FieldLabel>
        <Input {...form.register("title", { onChange: () => setError("") })} />
        {form.formState.errors.title && (
          <FieldError assertive>
            {form.formState.errors.title.message}
          </FieldError>
        )}
      </Field>
      <Field invalid={Boolean(form.formState.errors.url)}>
        <FieldLabel>URL</FieldLabel>
        <Input
          type="text"
          inputMode="url"
          {...form.register("url", { onChange: () => setError("") })}
        />
        {form.formState.errors.url && (
          <FieldError assertive>{form.formState.errors.url.message}</FieldError>
        )}
      </Field>
      <ErrorAlert title="Could not save link" message={error} />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isPending={mutation.isPending}>
          {link ? "Update link" : "Add link"}
        </Button>
      </div>
    </form>
  );
}
