import "server-only";

import type { ProfileTemplateId } from "./catalog";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ProfileOnboardingProgress = {
  templateId: ProfileTemplateId;
  completedStepIds: string[];
  revision: number;
  updatedAt: string | null;
};

function emptyProgress(
  templateId: ProfileTemplateId,
): ProfileOnboardingProgress {
  return {
    templateId,
    completedStepIds: [],
    revision: 0,
    updatedAt: null,
  };
}

export async function getProfileOnboardingProgress(
  userId: string,
  templateId: ProfileTemplateId,
): Promise<ProfileOnboardingProgress> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("get_profile_onboarding_progress", {
    p_target_user_id: userId,
  });
  if (error) throw new Error("Unable to load onboarding progress");
  const row = data?.[0];
  if (!row || row.template_id !== templateId) return emptyProgress(templateId);
  return {
    templateId,
    completedStepIds: row.completed_step_ids,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}

export async function completeProfileOnboardingStep(input: {
  userId: string;
  templateId: ProfileTemplateId;
  stepId: string;
}): Promise<ProfileOnboardingProgress> {
  const client = await createServerSupabaseClient();
  const { data, error } = await client.rpc("complete_profile_onboarding_step", {
    p_target_user_id: input.userId,
    p_template_id: input.templateId,
    p_step_id: input.stepId,
  });
  const row = data?.[0];
  if (error || !row) throw new Error("Unable to save onboarding progress");
  return {
    templateId: input.templateId,
    completedStepIds: row.completed_step_ids,
    revision: row.revision,
    updatedAt: row.updated_at,
  };
}
