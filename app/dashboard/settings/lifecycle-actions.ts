"use server";

import { z } from "zod";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import {
  saveLifecyclePreferences,
  type LifecyclePreferenceState,
} from "@/lib/lifecycle/repository";

const inputSchema = z
  .object({
    expectedRevision: z.number().int().nonnegative(),
    lifecycleEmailsEnabled: z.boolean(),
    weeklySummaryEnabled: z.boolean(),
    milestoneEmailsEnabled: z.boolean(),
  })
  .strict();

export async function saveLifecyclePreferenceAction(
  targetHint: string | undefined,
  input: unknown,
): Promise<ActionResult<LifecyclePreferenceState>> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(targetHint);
    return {
      ok: true,
      data: await saveLifecyclePreferences({
        userId: scope.effectiveUserId,
        ...parsed.data,
      }),
    };
  } catch {
    return actionError(
      "PREFERENCES_SAVE_FAILED",
      "Notification preferences changed or could not be saved. Reload and try again.",
    );
  }
}
