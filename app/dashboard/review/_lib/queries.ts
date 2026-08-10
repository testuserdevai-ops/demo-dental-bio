import "server-only";
import type { DashboardScope } from "@/lib/dashboard/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type ReviewViewModel = {
  id: number;
  reviewerName: string;
  content: string;
  stars: number;
  imageUrl: string;
  platform: string;
  rank: number;
  enabled: boolean;
  createdAt: string;
};
export type ReviewAggregate = {
  reviews: ReviewViewModel[];
  externalPage: { id: number; link: string } | null;
};

export async function getReviewAggregate(
  scope: DashboardScope,
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<ReviewAggregate> {
  const supabase = client ?? (await createServerSupabaseClient());
  const [reviewResult, pageResult] = await Promise.all([
    supabase
      .from("reviews")
      .select(
        "id, reviewer_name, content, stars, image_url, platform, rank, enabled, created_at",
      )
      .eq("user_id", scope.effectiveUserId)
      .order("rank", { nullsFirst: false }),
    supabase
      .from("external_review_pages")
      .select("id, link")
      .eq("user_id", scope.effectiveUserId)
      .maybeSingle(),
  ]);
  if (reviewResult.error || pageResult.error)
    throw new Error("Unable to load reviews");
  return {
    reviews: (reviewResult.data ?? []).map((row, index) => ({
      id: row.id,
      reviewerName: row.reviewer_name ?? "",
      content: row.content ?? "",
      stars: row.stars ?? 5,
      imageUrl: row.image_url ?? "",
      platform: row.platform ?? "",
      rank: row.rank ?? index + 1,
      enabled: row.enabled ?? true,
      createdAt: row.created_at ?? new Date(0).toISOString(),
    })),
    externalPage: pageResult.data
      ? { id: pageResult.data.id, link: pageResult.data.link }
      : null,
  };
}
