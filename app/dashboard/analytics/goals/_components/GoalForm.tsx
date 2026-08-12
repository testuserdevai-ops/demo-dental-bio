"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { applyActionResult } from "@/app/components/forms/action-result";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import { saveConversionGoal } from "../actions";
import {
  saveConversionGoalSchema,
  type SaveConversionGoalInput,
} from "../_lib/schemas";
import type { ConversionGoalEntityOption } from "../_lib/repository";

export function GoalForm({
  options,
  targetHint,
}: {
  options: ConversionGoalEntityOption[];
  targetHint?: string;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState("");
  const form = useForm<SaveConversionGoalInput>({
    resolver: zodResolver(saveConversionGoalSchema),
    defaultValues: {
      goalId: null,
      name: "",
      eventType: "link_click",
      entityUuid: null,
      entityBigint: null,
      isPrimary: false,
      attributionWindowDays: 30,
      enabled: true,
      valueMinor: null,
      currency: null,
    },
  });
  const eventType = useWatch({ control: form.control, name: "eventType" });
  const isPrimary = useWatch({ control: form.control, name: "isPrimary" });
  const enabled = useWatch({ control: form.control, name: "enabled" });
  const entityUuid = useWatch({ control: form.control, name: "entityUuid" });
  const entityBigint = useWatch({
    control: form.control,
    name: "entityBigint",
  });
  const filtered = options.filter((option) => option.entityType === eventType);

  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
        setFormError("");
        const result = await saveConversionGoal(targetHint, values);
        if (!result.ok) {
          applyActionResult(result, form, [
            "name",
            "eventType",
            "entityUuid",
            "entityBigint",
            "valueMinor",
            "currency",
          ]);
          setFormError(result.formError ?? "Unable to save goal");
          return;
        }
        form.reset();
        router.refresh();
      })}
      className="space-y-4 rounded-2xl border bg-white p-4 sm:p-5"
    >
      <h2 className="text-lg font-semibold">Add an item goal</h2>
      <p className="text-sm leading-5 text-muted-foreground">
        Custom goals can target only links, products, treatments, or services
        you own. New goals classify future events; they do not rewrite history.
      </p>
      <Field invalid={Boolean(form.formState.errors.name)}>
        <FieldLabel>Goal name</FieldLabel>
        <Input
          placeholder="Consultation link click"
          {...form.register("name")}
        />
        {form.formState.errors.name ? (
          <FieldError assertive>
            {form.formState.errors.name.message}
          </FieldError>
        ) : null}
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field invalid={Boolean(form.formState.errors.eventType)}>
          <FieldLabel>Event type</FieldLabel>
          <select
            className="flex min-h-11 w-full rounded-[var(--radius-md)] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring"
            {...form.register("eventType", {
              onChange: () => {
                form.setValue("entityUuid", null);
                form.setValue("entityBigint", null);
              },
            })}
          >
            <option value="link_click">Link click</option>
            <option value="product_click">Product click</option>
            <option value="treatment_cta_click">Treatment action</option>
            <option value="service_cta_click">Service action</option>
          </select>
        </Field>
        <Field
          invalid={Boolean(
            form.formState.errors.entityUuid ||
            form.formState.errors.entityBigint,
          )}
        >
          <FieldLabel>Profile item</FieldLabel>
          <select
            className="flex min-h-11 w-full rounded-[var(--radius-md)] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring"
            value={
              eventType === "product_click"
                ? (entityBigint?.toString() ?? "")
                : (entityUuid ?? "")
            }
            onChange={(event) => {
              if (eventType === "product_click") {
                form.setValue(
                  "entityBigint",
                  event.target.value ? Number(event.target.value) : null,
                  { shouldValidate: true },
                );
              } else {
                form.setValue("entityUuid", event.target.value || null, {
                  shouldValidate: true,
                });
              }
            }}
          >
            <option value="">Select an item</option>
            {filtered.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {form.formState.errors.entityUuid ||
          form.formState.errors.entityBigint ? (
            <FieldError assertive>
              {form.formState.errors.entityUuid?.message ??
                form.formState.errors.entityBigint?.message}
            </FieldError>
          ) : null}
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field>
          <FieldLabel>Attribution window</FieldLabel>
          <select
            className="flex min-h-11 w-full rounded-[var(--radius-md)] border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-[var(--focus-ring-width)] focus-visible:ring-ring"
            {...form.register("attributionWindowDays", { valueAsNumber: true })}
          >
            <option value={7}>7 days</option>
            <option value={30}>30 days</option>
            <option value={60}>60 days</option>
            <option value={90}>90 days</option>
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field invalid={Boolean(form.formState.errors.valueMinor)}>
            <FieldLabel>Value (optional)</FieldLabel>
            <Input
              type="number"
              min={0}
              step="0.01"
              placeholder="25.00"
              onChange={(event) =>
                form.setValue(
                  "valueMinor",
                  event.target.value
                    ? Math.round(Number(event.target.value) * 100)
                    : null,
                  { shouldValidate: true },
                )
              }
            />
          </Field>
          <Field invalid={Boolean(form.formState.errors.currency)}>
            <FieldLabel>Currency</FieldLabel>
            <Input
              maxLength={3}
              placeholder="GBP"
              {...form.register("currency", {
                setValueAs: (value) => value || null,
              })}
            />
          </Field>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex min-h-14 items-center justify-between gap-3 rounded-xl border p-3">
          <span className="text-sm font-medium">Enabled</span>
          <Switch
            checked={enabled}
            onCheckedChange={(checked) => form.setValue("enabled", checked)}
            aria-label="Goal enabled"
          />
        </label>
        <label className="flex min-h-14 items-center justify-between gap-3 rounded-xl border p-3">
          <span className="text-sm font-medium">Primary goal</span>
          <Switch
            checked={isPrimary}
            onCheckedChange={(checked) => form.setValue("isPrimary", checked)}
            aria-label="Primary goal"
          />
        </label>
      </div>
      {formError ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {formError}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" isPending={form.formState.isSubmitting}>
          Add goal
        </Button>
      </div>
    </form>
  );
}
