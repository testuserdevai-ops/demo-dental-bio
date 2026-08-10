import "server-only";
import type { DashboardScope } from "@/lib/dashboard/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type DentalGalleryViewModel = {
  id: number;
  title: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  beforeLabel: string;
  afterLabel: string;
  rank: number;
  enabled: boolean;
  createdAt: string;
};
export type GeneralGalleryViewModel = {
  id: number;
  title: string;
  imageUrl: string;
  rank: number;
  enabled: boolean;
  createdAt: string;
};
export type GalleryAggregate = {
  dental: DentalGalleryViewModel[];
  general: GeneralGalleryViewModel[];
};

export async function getGalleryAggregate(
  scope: DashboardScope,
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<GalleryAggregate> {
  const supabase = client ?? (await createServerSupabaseClient());
  const [dentalResult, generalResult] = await Promise.all([
    supabase
      .from("galleries")
      .select(
        "id, title, before_image_url, after_image_url, before_image_label, after_image_label, rank, enabled, created_at",
      )
      .eq("user_id", scope.effectiveUserId)
      .order("rank", { nullsFirst: false }),
    supabase
      .from("general_galleries")
      .select("id, title, image_url, rank, enabled, created_at")
      .eq("user_id", scope.effectiveUserId)
      .order("rank", { nullsFirst: false }),
  ]);
  if (dentalResult.error || generalResult.error)
    throw new Error("Unable to load galleries");
  return {
    dental: (dentalResult.data ?? []).map((row, index) => ({
      id: row.id,
      title: row.title ?? "",
      beforeImageUrl: row.before_image_url ?? "",
      afterImageUrl: row.after_image_url ?? "",
      beforeLabel: row.before_image_label ?? "",
      afterLabel: row.after_image_label ?? "",
      rank: row.rank ?? index + 1,
      enabled: row.enabled ?? true,
      createdAt: row.created_at,
    })),
    general: (generalResult.data ?? []).map((row, index) => ({
      id: row.id,
      title: row.title ?? "",
      imageUrl: row.image_url ?? "",
      rank: row.rank ?? index + 1,
      enabled: row.enabled ?? true,
      createdAt: row.created_at,
    })),
  };
}
