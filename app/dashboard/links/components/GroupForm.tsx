"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import type { LinkGroupViewModel } from "../_lib/queries";
import {
  createLinkGroupInputSchema,
  type CreateLinkGroupInput,
} from "../_lib/schemas";
import { ErrorAlert } from "./ErrorAlert";
import type { LinkMutations } from "./links-manager-shared";

export function GroupForm({
  group,
  mutations,
  afterSuccess,
  onCancel,
}: {
  group?: LinkGroupViewModel;
  mutations: LinkMutations;
  afterSuccess(): void;
  onCancel?(): void;
}) {
  const [error, setError] = useState("");
  const form = useForm<CreateLinkGroupInput>({
    resolver: zodResolver(createLinkGroupInputSchema),
    defaultValues: { heading: group?.heading ?? "" },
  });
  const mutation = group ? mutations.updateGroup : mutations.createGroup;
  const submit = async (values: CreateLinkGroupInput) => {
    setError("");
    const result = group
      ? await mutations.updateGroup.mutateAsync({
          linkGroupId: group.id,
          ...values,
        })
      : await mutations.createGroup.mutateAsync(values);
    if (!result.ok) {
      applyActionResult(result, form, ["heading"]);
      setError(result.formError ?? "Unable to save link group");
      return;
    }
    form.reset();
    afterSuccess();
  };
  return (
    <form onSubmit={form.handleSubmit(submit)} className="flex-col-gap">
      <Field invalid={Boolean(form.formState.errors.heading)}>
        <FieldLabel>{group ? "Group heading" : "New group heading"}</FieldLabel>
        <Input
          {...form.register("heading", { onChange: () => setError("") })}
        />
        {form.formState.errors.heading && (
          <FieldError assertive>
            {form.formState.errors.heading.message}
          </FieldError>
        )}
      </Field>
      <ErrorAlert title="Could not save group" message={error} />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isPending={mutation.isPending}>
          {group ? "Update group" : "Add group"}
        </Button>
      </div>
    </form>
  );
}
