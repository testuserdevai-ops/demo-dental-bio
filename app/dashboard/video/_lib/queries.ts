import "server-only";
import type { DashboardScope } from "@/lib/dashboard/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type VideoViewModel = {
  id: number;
  groupId: number;
  title: string;
  link: string;
  enabled: boolean;
  rank: number;
};
export type VideoGroupViewModel = {
  id: number;
  name: string;
  enabled: boolean;
  rank: number;
  videos: VideoViewModel[];
};
export type VideoAggregate = { groups: VideoGroupViewModel[] };
export async function getVideoAggregate(
  scope: DashboardScope,
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<VideoAggregate> {
  const supabase = client ?? (await createServerSupabaseClient());
  const { data: groups, error: groupError } = await supabase
    .from("groups")
    .select("id,name,enabled,rank")
    .eq("user_id", scope.effectiveUserId)
    .eq("type", "videos")
    .order("rank", { nullsFirst: false });
  if (groupError) throw new Error("Unable to load video groups");
  const ids = (groups ?? []).map(({ id }) => id);
  const videoResult = ids.length
    ? await supabase
        .from("videos")
        .select("id,group_id,title,link,enabled,rank")
        .in("group_id", ids)
        .order("rank", { nullsFirst: false })
    : { data: [], error: null };
  if (videoResult.error) throw new Error("Unable to load videos");
  const videos = (videoResult.data ?? []).map((row, index) => ({
    id: row.id,
    groupId: row.group_id ?? 0,
    title: row.title ?? "",
    link: row.link ?? "",
    enabled: row.enabled ?? true,
    rank: row.rank ?? index + 1,
  }));
  return {
    groups: (groups ?? []).map((row, index) => ({
      id: row.id,
      name: row.name ?? "",
      enabled: row.enabled ?? true,
      rank: row.rank ?? index + 1,
      videos: videos.filter(({ groupId }) => groupId === row.id),
    })),
  };
}
