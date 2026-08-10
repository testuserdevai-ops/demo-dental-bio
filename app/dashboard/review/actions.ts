"use server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { invalidatePublicProfileCache } from "@/lib/public-profile/cache-invalidation";
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
const invalidateReviews = (profileId: string, ids: readonly number[]) =>
  invalidatePublicProfileCache({
    profileId,
    feature: "reviews",
    entities: ids.map((id) => ({ kind: "review" as const, id: String(id) })),
  });

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
    if (error || !row) return failed("CREATE_FAILED");
    const result = view(row);
    invalidateReviews(scope.effectiveUserId, [result.id]);
    return { ok: true, data: result };
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
    if (error || !row) return failed("UPDATE_FAILED");
    const result = view(row);
    invalidateReviews(scope.effectiveUserId, [value.id]);
    return { ok: true, data: result };
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
    if (error) return failed("DELETE_FAILED");
    invalidateReviews(scope.effectiveUserId, [parsed.data.id]);
    return { ok: true, data: undefined };
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
    if (error) return failed("REORDER_FAILED");
    invalidateReviews(scope.effectiveUserId, parsed.data.orderedIds);
    return { ok: true, data: undefined };
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
    if (error || !row) return failed("SAVE_FAILED");
    const result = { id: row.id, link: row.link };
    invalidatePublicProfileCache({
      profileId: scope.effectiveUserId,
      feature: "external-review-page",
    });
    return { ok: true, data: result };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
