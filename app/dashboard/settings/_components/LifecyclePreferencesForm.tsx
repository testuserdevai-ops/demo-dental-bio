"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/app/components/ui/field";
import { Switch } from "@/app/components/ui/switch";
import type { LifecyclePreferenceState } from "@/lib/lifecycle/repository";

import { saveLifecyclePreferenceAction } from "../lifecycle-actions";

export function LifecyclePreferencesForm({
  initial,
  targetUserId,
}: {
  initial: LifecyclePreferenceState;
  targetUserId?: string;
}) {
  const [state, setState] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (
    key:
      | "lifecycleEmailsEnabled"
      | "weeklySummaryEnabled"
      | "milestoneEmailsEnabled",
    checked: boolean,
  ) => setState((current) => ({ ...current, [key]: checked }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const result = await saveLifecyclePreferenceAction(targetUserId, {
      expectedRevision: state.revision,
      lifecycleEmailsEnabled: state.lifecycleEmailsEnabled,
      weeklySummaryEnabled: state.weeklySummaryEnabled,
      milestoneEmailsEnabled: state.milestoneEmailsEnabled,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.formError ?? "Notification preferences were not saved");
      return;
    }
    setState(result.data);
    toast.success("Notification preferences saved");
  }

  const options = [
    {
      id: "lifecycle-emails",
      key: "lifecycleEmailsEnabled" as const,
      label: "Profile guidance emails",
      description:
        "Allow occasional profile setup, distribution, and performance guidance.",
    },
    {
      id: "weekly-summary",
      key: "weeklySummaryEnabled" as const,
      label: "Weekly performance summary",
      description:
        "Receive a summary only when your published profile has meaningful reportable activity.",
    },
    {
      id: "milestone-emails",
      key: "milestoneEmailsEnabled" as const,
      label: "First-value milestones",
      description:
        "Celebrate verified profile views and actions without revealing visitor identity.",
    },
  ];

  return (
    <form
      className="space-y-5 rounded-3xl border border-border bg-white p-5 shadow-sm sm:p-6"
      onSubmit={submit}
    >
      <div>
        <h3 className="text-lg font-semibold text-dark">
          Performance notifications
        </h3>
        <p className="text-sm leading-6 text-muted-foreground">
          Choose which non-essential emails DentalBio may send. Account and
          security messages are managed separately.
        </p>
      </div>

      <div className="space-y-4">
        {options.map((option) => (
          <Field
            className="flex-row items-start gap-3 rounded-2xl border border-border p-4"
            id={option.id}
            key={option.id}
          >
            <Switch
              aria-label={option.label}
              checked={state[option.key]}
              disabled={
                pending ||
                Boolean(state.promotionalUnsubscribedAt) ||
                (option.key !== "lifecycleEmailsEnabled" &&
                  !state.lifecycleEmailsEnabled)
              }
              onCheckedChange={(checked: boolean) =>
                toggle(option.key, checked)
              }
            />
            <div>
              <FieldLabel>{option.label}</FieldLabel>
              <FieldDescription>{option.description}</FieldDescription>
            </div>
          </Field>
        ))}
      </div>

      {state.promotionalUnsubscribedAt ? (
        <Alert>
          <AlertTitle>Marketing email is unsubscribed</AlertTitle>
          <AlertDescription>
            These controls remain disabled because the global unsubscribe list
            takes precedence. Contact support if you want to opt in again.
          </AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Preferences were not saved</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-end">
        <Button isPending={pending} type="submit">
          Save notification preferences
        </Button>
      </div>
    </form>
  );
}
