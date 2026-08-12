"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Field, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import { Switch } from "@/app/components/ui/switch";
import type { OwnerConversionGoal } from "@/lib/analytics/repository";
import { saveConversionGoal } from "../actions";

const EVENT_LABELS: Record<string, string> = {
  booking_click: "Booking click",
  phone_click: "Phone click",
  email_click: "Email click",
  directions_click: "Directions click",
  enquiry_submit: "Enquiry submitted",
  link_click: "Link click",
  product_click: "Product click",
  treatment_cta_click: "Treatment action",
  service_cta_click: "Service action",
};

export function GoalRow({
  goal,
  targetHint,
}: {
  goal: OwnerConversionGoal;
  targetHint?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(goal.name);
  const [windowDays, setWindowDays] = useState(goal.attributionWindowDays);
  const [value, setValue] = useState(
    goal.valueMinor === null ? "" : (goal.valueMinor / 100).toFixed(2),
  );
  const [currency, setCurrency] = useState(goal.currency ?? "");
  const update = async (changes: {
    enabled?: boolean;
    isPrimary?: boolean;
    edit?: boolean;
  }) => {
    setPending(true);
    setError("");
    const enabled = changes.enabled ?? goal.enabled;
    const result = await saveConversionGoal(targetHint, {
      goalId: goal.goalId,
      name: changes.edit ? name : goal.name,
      eventType: goal.eventType,
      entityUuid: goal.entityUuid,
      entityBigint: goal.entityBigint,
      isPrimary: changes.isPrimary ?? goal.isPrimary,
      attributionWindowDays: changes.edit
        ? windowDays
        : goal.attributionWindowDays,
      enabled,
      valueMinor: changes.edit
        ? value
          ? Math.round(Number(value) * 100)
          : null
        : goal.valueMinor,
      currency: changes.edit
        ? value
          ? currency.toUpperCase() || null
          : null
        : goal.currency,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.formError ?? "Unable to update goal");
      return;
    }
    if (changes.edit) setEditing(false);
    router.refresh();
  };
  return (
    <article className="rounded-2xl border bg-white p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{goal.name}</h3>
            {goal.systemKey ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                System
              </span>
            ) : null}
            {goal.isPrimary ? (
              <span className="rounded-full bg-primary-5 px-2 py-0.5 text-xs font-semibold text-primary">
                Primary
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {EVENT_LABELS[goal.eventType] ?? goal.eventType} · Last non-direct
            touch within {goal.attributionWindowDays} days
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!goal.isPrimary && goal.enabled ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => void update({ isPrimary: true })}
            >
              Make primary
            </Button>
          ) : null}
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => setEditing((current) => !current)}
          >
            {editing ? "Cancel edit" : "Edit"}
          </Button>
          <label className="flex min-h-11 items-center gap-2 rounded-xl border px-3">
            <span className="text-sm font-medium">
              {goal.enabled ? "Enabled" : "Disabled"}
            </span>
            <Switch
              checked={goal.enabled}
              disabled={pending}
              onCheckedChange={(enabled) => void update({ enabled })}
              aria-label={`${goal.name} enabled`}
            />
          </label>
        </div>
      </div>
      {editing ? (
        <div className="mt-4 space-y-4 rounded-xl border bg-background p-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor={`goal-name-${goal.goalId}`}>
                Goal name
              </FieldLabel>
              <Input
                id={`goal-name-${goal.goalId}`}
                value={name}
                maxLength={80}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`goal-window-${goal.goalId}`}>
                Attribution window
              </FieldLabel>
              <select
                id={`goal-window-${goal.goalId}`}
                className="min-h-11 rounded-[var(--radius-md)] border border-input bg-background px-3 text-sm"
                value={windowDays}
                onChange={(event) =>
                  setWindowDays(Number(event.target.value) as 7 | 30 | 60 | 90)
                }
              >
                <option value={7}>7 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </Field>
            <Field>
              <FieldLabel htmlFor={`goal-value-${goal.goalId}`}>
                Value (optional)
              </FieldLabel>
              <Input
                id={`goal-value-${goal.goalId}`}
                type="number"
                min={0}
                step="0.01"
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`goal-currency-${goal.goalId}`}>
                Currency
              </FieldLabel>
              <Input
                id={`goal-currency-${goal.goalId}`}
                maxLength={3}
                value={currency}
                disabled={!value}
                onChange={(event) => setCurrency(event.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              disabled={pending || !name.trim() || Boolean(value && !currency)}
              onClick={() => void update({ edit: true })}
            >
              Save changes
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}
    </article>
  );
}
