"use server";

import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import type { TreatmentItemViewModel } from "./_lib/queries";
import {
  createTreatmentInputSchema,
  deleteTreatmentInputSchema,
  reorderTreatmentsInputSchema,
  updateTreatmentInputSchema,
} from "./_lib/schemas";

type RpcTreatment = {
  treatment_id: string;
  title: string | null;
  description: string | null;
  isService: boolean | null;
};

function toViewModel(row: RpcTreatment): TreatmentItemViewModel {
  return {
    id: row.treatment_id,
    title: row.title ?? "",
    description: row.description ?? "",
    kind: row.isService ? "service" : "treatment",
    rank: 0,
  };
}

async function authorizedScope(targetHint: string) {
  return (await resolveDashboardIdentity(targetHint)).scope;
}

export async function createTreatment(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<TreatmentItemViewModel>> {
  const parsed = createTreatmentInputSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const scope = await authorizedScope(targetHint);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("create_dentistry_treatment", {
      p_dentistry_id: scope.dentistryId,
      p_title: parsed.data.title,
      p_description: parsed.data.description,
      p_is_service: parsed.data.kind === "service",
    });
    const row = (data as RpcTreatment[] | null)?.[0];
    if (error || !row)
      return actionError(
        "CREATE_FAILED",
        error?.message ?? "Unable to create treatment",
      );
    return { ok: true, data: toViewModel(row) };
  } catch {
    return actionError("AUTHORIZATION_ERROR", "Unable to create treatment");
  }
}

export async function updateTreatment(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<TreatmentItemViewModel>> {
  const parsed = updateTreatmentInputSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const scope = await authorizedScope(targetHint);
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.rpc("update_dentistry_treatment", {
      p_dentistry_id: scope.dentistryId,
      p_treatment_id: parsed.data.treatmentId,
      p_title: parsed.data.title,
      p_description: parsed.data.description,
    });
    const row = (data as RpcTreatment[] | null)?.[0];
    if (error || !row)
      return actionError(
        "UPDATE_FAILED",
        error?.message ?? "Unable to update treatment",
      );
    return { ok: true, data: toViewModel(row) };
  } catch {
    return actionError("AUTHORIZATION_ERROR", "Unable to update treatment");
  }
}

export async function deleteTreatment(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = deleteTreatmentInputSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const scope = await authorizedScope(targetHint);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("delete_dentistry_treatment", {
      p_dentistry_id: scope.dentistryId,
      p_treatment_id: parsed.data.treatmentId,
    });
    if (error) return actionError("DELETE_FAILED", error.message);
    return { ok: true, data: undefined };
  } catch {
    return actionError("AUTHORIZATION_ERROR", "Unable to delete treatment");
  }
}

export async function reorderTreatments(
  targetHint: string,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = reorderTreatmentsInputSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const scope = await authorizedScope(targetHint);
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.rpc("reorder_dentistry_treatments", {
      p_dentistry_id: scope.dentistryId,
      p_treatment_ids: parsed.data.orderedIds,
    });
    if (error) return actionError("REORDER_FAILED", error.message);
    return { ok: true, data: undefined };
  } catch {
    return actionError("AUTHORIZATION_ERROR", "Unable to reorder treatments");
  }
}
