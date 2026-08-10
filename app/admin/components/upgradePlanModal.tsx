"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, useWatch } from "react-hook-form";
import { useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  planChangeSchema,
  resolvePlanEndDate,
  type AdminPlanUser,
  type PlanChangeInput,
} from "./user-management-schema";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (
    id: string,
    subscription_status: string,
    current_period_end: Date | null,
  ) => void;
  user: AdminPlanUser | null;
};

const plans = ["FREE", "PRO", "PREMIUM PRO"] as const;

function getPlanDefaults(user: AdminPlanUser | null): PlanChangeInput {
  return {
    plan: plans.includes(user?.subscription_status as (typeof plans)[number])
      ? (user?.subscription_status as PlanChangeInput["plan"])
      : "FREE",
    period_end: "",
  };
}

export default function UpgradePlanModal({
  isOpen,
  onClose,
  onSuccess,
  user,
}: ModalProps) {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [mutationError, setMutationError] = useState("");
  const form = useForm<PlanChangeInput>({
    resolver: zodResolver(planChangeSchema),
    defaultValues: getPlanDefaults(user),
  });
  const resetForm = form.reset;
  const selectedPlan = useWatch({ control: form.control, name: "plan" });
  const previousOpenRef = useRef(isOpen);
  const previousUserIdRef = useRef(user?.id);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    const shouldReset =
      hasMountedRef.current &&
      isOpen &&
      (!previousOpenRef.current || previousUserIdRef.current !== user?.id);
    previousOpenRef.current = isOpen;
    previousUserIdRef.current = user?.id;
    hasMountedRef.current = true;
    if (!shouldReset) return;

    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      resetForm(getPlanDefaults(user));
      setMutationError("");
      setConfirmationOpen(false);
    });
    return () => {
      active = false;
    };
  }, [isOpen, resetForm, user]);

  const requestConfirmation = form.handleSubmit(() => {
    setMutationError("");
    setConfirmationOpen(true);
  });

  const applyPlanChange = async () => {
    if (!user) return;
    const values = form.getValues();
    const endDate = resolvePlanEndDate(values);
    setMutationError("");

    try {
      const response = await fetch("/api/subscription", {
        method: "POST",
        body: JSON.stringify({
          id: user.id,
          subscription_status: values.plan,
          current_period_end: endDate,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.error) {
        throw new Error(body?.error || "Plan could not be changed");
      }

      onSuccess(user.id, values.plan, endDate);
      setConfirmationOpen(false);
      onClose();
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : "Plan could not be changed",
      );
      setConfirmationOpen(false);
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !confirmationOpen && !form.formState.isSubmitting)
          onClose();
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Change plan</DialogTitle>
          <DialogDescription>
            Review this user&apos;s identity and choose the subscription state
            to apply.
          </DialogDescription>
        </DialogHeader>

        <form noValidate onSubmit={requestConfirmation} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="plan-first-name">
              <FieldLabel>First Name</FieldLabel>
              <Input value={user?.first_name ?? ""} readOnly />
            </Field>
            <Field id="plan-last-name">
              <FieldLabel>Last Name</FieldLabel>
              <Input value={user?.last_name ?? ""} readOnly />
            </Field>
          </div>
          <Field id="plan-email">
            <FieldLabel>Email</FieldLabel>
            <Input value={user?.email ?? ""} readOnly />
          </Field>
          <Field id="plan-current">
            <FieldLabel>Current Plan</FieldLabel>
            <Input value={user?.subscription_status ?? "FREE"} readOnly />
          </Field>
          <Controller
            control={form.control}
            name="plan"
            render={({ field, fieldState }) => (
              <Field id="plan-selection" invalid={Boolean(fieldState.error)}>
                <FieldLabel>New plan</FieldLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger ref={field.ref}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan} value={plan}>
                        {plan}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldState.error && (
                  <FieldError assertive>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />
          <Field
            id="plan-period-end"
            invalid={Boolean(form.formState.errors.period_end)}
          >
            <FieldLabel>Period End Date</FieldLabel>
            <Input
              type="date"
              disabled={selectedPlan === "FREE"}
              {...form.register("period_end")}
            />
            {form.formState.errors.period_end && (
              <FieldError assertive>
                {form.formState.errors.period_end.message}
              </FieldError>
            )}
          </Field>

          {mutationError && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Plan was not changed</AlertTitle>
              <AlertDescription>{mutationError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Close
            </Button>
            <Button type="submit">Review plan change</Button>
          </DialogFooter>
        </form>

        <AlertDialog
          open={confirmationOpen}
          onOpenChange={(open) => {
            if (!open && !form.formState.isSubmitting)
              setConfirmationOpen(false);
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Apply this plan change?</AlertDialogTitle>
              <AlertDialogDescription>
                Change {user?.email ?? "this user"} to {selectedPlan}? This may
                affect the user&apos;s subscription provider state.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Go back</AlertDialogCancel>
              <AlertDialogAction
                disabled={form.formState.isSubmitting}
                onClick={(event) => {
                  event.preventDefault();
                  void form.handleSubmit(applyPlanChange)();
                }}
              >
                {form.formState.isSubmitting
                  ? "Applying…"
                  : "Apply plan change"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
