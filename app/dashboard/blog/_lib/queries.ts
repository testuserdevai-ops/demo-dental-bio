import "server-only";
import type { DashboardScope } from "@/lib/dashboard/types";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type BlogViewModel = {
  id: number;
  groupId: number;
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  imageUrl: string;
  enabled: boolean;
  rank: number;
  createdAt: string;
};
export type BlogGroupViewModel = {
  id: number;
  name: string;
  enabled: boolean;
  rank: number;
  blogs: BlogViewModel[];
};
export type BlogAggregate = { groups: BlogGroupViewModel[] };

export async function getBlogAggregate(
  scope: DashboardScope,
  client?: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<BlogAggregate> {
  const supabase = client ?? (await createServerSupabaseClient());
  const { data: groups, error: groupError } = await supabase
    .from("blog_groups")
    .select("id,name,enabled,rank")
    .eq("user_id", scope.effectiveUserId)
    .order("rank", { nullsFirst: false });
  if (groupError) throw new Error("Unable to load blog groups");
  const groupIds = (groups ?? []).map(({ id }) => id);
  const blogResult = groupIds.length
    ? await supabase
        .from("blogs")
        .select(
          "id,group_id,title,content,meta_title,meta_description,slug,image_url,enabled,rank,created_at",
        )
        .in("group_id", groupIds)
        .order("rank", { nullsFirst: false })
    : { data: [], error: null };
  if (blogResult.error) throw new Error("Unable to load blogs");
  const blogs = (blogResult.data ?? []).map((row, index) => ({
    id: row.id,
    groupId: row.group_id ?? 0,
    title: row.title,
    content: row.content,
    metaTitle: row.meta_title ?? "",
    metaDescription: row.meta_description ?? "",
    slug: row.slug,
    imageUrl: row.image_url ?? "",
    enabled: row.enabled ?? true,
    rank: row.rank ?? index + 1,
    createdAt: row.created_at,
  }));
  return {
    groups: (groups ?? []).map((group, index) => ({
      id: group.id,
      name: group.name ?? "",
      enabled: group.enabled ?? true,
      rank: group.rank ?? index + 1,
      blogs: blogs.filter(({ groupId }) => groupId === group.id),
    })),
  };
}
