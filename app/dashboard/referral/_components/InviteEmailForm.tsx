"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PaperPlane } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { sendReferralInvite } from "../_lib/actions";
import {
  referralInviteSchema,
  type ReferralInviteInput,
} from "../_lib/schemas";

export function InviteEmailForm({ targetHint }: { targetHint?: string }) {
  const form = useForm<ReferralInviteInput>({
    resolver: zodResolver(referralInviteSchema),
    defaultValues: { email: "" },
  });
  const error = form.formState.errors.root?.message;

  const submit = async (values: ReferralInviteInput) => {
    form.clearErrors("root");
    const result = await sendReferralInvite(targetHint, values);
    if (!result.ok) {
      applyActionResult(result, form, ["email"]);
      if (!result.fieldErrors)
        form.setError("root", {
          message: result.formError ?? "The invitation could not be sent",
        });
      return;
    }
    form.reset();
    toast.success("Referral invitation sent");
  };

  return (
    <form
      className="space-y-4 rounded-3xl border bg-white p-5 shadow-sm"
      onSubmit={form.handleSubmit(submit)}
      noValidate
    >
      <div>
        <h3 className="font-semibold">Send an invite</h3>
        <p className="text-sm text-muted-foreground">
          We’ll send your personal referral link to your friend.
        </p>
      </div>
      <Field invalid={Boolean(form.formState.errors.email)}>
        <FieldLabel>Email</FieldLabel>
        <Input type="email" autoComplete="email" {...form.register("email")} />
        {form.formState.errors.email && (
          <FieldError assertive>
            {form.formState.errors.email.message}
          </FieldError>
        )}
      </Field>
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Could not send invitation</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex justify-end">
        <Button type="submit" isPending={form.formState.isSubmitting}>
          <PaperPlane aria-hidden="true" className="size-5" />
          Send referral link
        </Button>
      </div>
    </form>
  );
}
