"use server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import * as schema from "./_lib/schemas";
import type { ReviewViewModel } from "./_lib/queries";

type ReviewRow = {
  id: number;
  reviewer_name: string | null;
  content: string | null;
  stars: number | null;
  image_url: string | null;
  platform: string | null;
  rank: number | null;
  enabled: boolean | null;
  created_at: string | null;
};
const view = (row: ReviewRow): ReviewViewModel => ({
  id: row.id,
  reviewerName: row.reviewer_name ?? "",
  content: row.content ?? "",
  stars: row.stars ?? 5,
  imageUrl: row.image_url ?? "",
  platform: row.platform ?? "",
  rank: row.rank ?? 0,
  enabled: row.enabled ?? true,
  createdAt: row.created_at ?? new Date(0).toISOString(),
});
const failed = <T>(code: string): ActionResult<T> =>
  actionError(code, "Unable to manage reviews");

export async function createReview(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<ReviewViewModel>> {
  const parsed = schema.createReviewSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("create_dashboard_review", {
      p_user_id: scope.effectiveUserId,
      p_reviewer_name: value.reviewerName,
      p_content: value.content,
      p_stars: value.stars,
      p_image_url: value.imageUrl,
      p_platform: value.platform,
      p_created_at: value.createdAt,
    });
    const row = data?.[0];
    return error || !row
      ? failed("CREATE_FAILED")
      : { ok: true, data: view(row) };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function updateReview(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<ReviewViewModel>> {
  const parsed = schema.updateReviewSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("update_dashboard_review", {
      p_user_id: scope.effectiveUserId,
      p_id: value.id,
      p_reviewer_name: value.reviewerName,
      p_content: value.content,
      p_stars: value.stars,
      p_image_url: value.imageUrl,
      p_platform: value.platform,
      p_created_at: value.createdAt,
      p_enabled: value.enabled,
    });
    const row = data?.[0];
    return error || !row
      ? failed("UPDATE_FAILED")
      : { ok: true, data: view(row) };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function deleteReview(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.deleteReviewSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("delete_dashboard_review", {
      p_user_id: scope.effectiveUserId,
      p_id: parsed.data.id,
    });
    return error ? failed("DELETE_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function reorderReviews(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.reorderReviewsSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("reorder_dashboard_reviews", {
      p_user_id: scope.effectiveUserId,
      p_ids: parsed.data.orderedIds,
    });
    return error ? failed("REORDER_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}

export async function saveExternalReviewPage(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<{ id: number; link: string }>> {
  const parsed = schema.externalReviewPageSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc(
      "save_dashboard_external_review_page",
      { p_user_id: scope.effectiveUserId, p_link: parsed.data.link },
    );
    const row = data?.[0];
    return error || !row
      ? failed("SAVE_FAILED")
      : { ok: true, data: { id: row.id, link: row.link } };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
