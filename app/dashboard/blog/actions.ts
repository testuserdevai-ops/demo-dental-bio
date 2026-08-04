"use server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as schema from "./_lib/schemas";
import type { BlogGroupViewModel, BlogViewModel } from "./_lib/queries";

type GroupRow = {
  id: number;
  name: string | null;
  enabled: boolean | null;
  rank: number | null;
};
type BlogRow = {
  id: number;
  group_id: number | null;
  title: string;
  content: string;
  meta_title: string | null;
  meta_description: string | null;
  slug: string;
  image_url: string | null;
  enabled: boolean | null;
  rank: number | null;
  created_at: string;
};
const group = (row: GroupRow): BlogGroupViewModel => ({
  id: row.id,
  name: row.name ?? "",
  enabled: row.enabled ?? true,
  rank: row.rank ?? 0,
  blogs: [],
});
const blog = (row: BlogRow): BlogViewModel => ({
  id: row.id,
  groupId: row.group_id ?? 0,
  title: row.title,
  content: row.content,
  metaTitle: row.meta_title ?? "",
  metaDescription: row.meta_description ?? "",
  slug: row.slug,
  imageUrl: row.image_url ?? "",
  enabled: row.enabled ?? true,
  rank: row.rank ?? 0,
  createdAt: row.created_at,
});
const failed = <T>(code: string): ActionResult<T> =>
  actionError(code, "Unable to manage blogs");

export async function createBlogGroup(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<BlogGroupViewModel>> {
  const parsed = schema.createBlogGroupSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("create_dashboard_blog_group", {
      p_user_id: scope.effectiveUserId,
      p_name: parsed.data.name,
    });
    const row = data?.[0];
    return error || !row
      ? failed("CREATE_FAILED")
      : { ok: true, data: group(row) };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function updateBlogGroup(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<BlogGroupViewModel>> {
  const parsed = schema.updateBlogGroupSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("update_dashboard_blog_group", {
      p_user_id: scope.effectiveUserId,
      p_group_id: value.id,
      p_name: value.name,
      p_enabled: value.enabled,
    });
    const row = data?.[0];
    return error || !row
      ? failed("UPDATE_FAILED")
      : { ok: true, data: group(row) };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function deleteBlogGroup(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.deleteBlogGroupSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("delete_dashboard_blog_group", {
      p_user_id: scope.effectiveUserId,
      p_group_id: parsed.data.id,
    });
    return error ? failed("DELETE_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function reorderBlogGroups(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.reorderBlogGroupsSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("reorder_dashboard_blog_groups", {
      p_user_id: scope.effectiveUserId,
      p_group_ids: parsed.data.orderedIds,
    });
    return error ? failed("REORDER_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function createBlog(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<BlogViewModel>> {
  const parsed = schema.createBlogSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("create_dashboard_blog", {
      p_user_id: scope.effectiveUserId,
      p_group_id: value.groupId,
      p_title: value.title,
      p_content: value.content,
      p_meta_title: value.metaTitle,
      p_meta_description: value.metaDescription,
      p_slug: value.slug,
      p_image_url: value.imageUrl,
      p_enabled: value.enabled,
    });
    const row = data?.[0];
    return error || !row
      ? failed("CREATE_FAILED")
      : { ok: true, data: blog(row) };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function updateBlog(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<BlogViewModel>> {
  const parsed = schema.updateBlogSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("update_dashboard_blog", {
      p_user_id: scope.effectiveUserId,
      p_blog_id: value.id,
      p_title: value.title,
      p_content: value.content,
      p_meta_title: value.metaTitle,
      p_meta_description: value.metaDescription,
      p_slug: value.slug,
      p_image_url: value.imageUrl,
      p_enabled: value.enabled,
    });
    const row = data?.[0];
    return error || !row
      ? failed("UPDATE_FAILED")
      : { ok: true, data: blog(row) };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function deleteBlog(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.deleteBlogSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("delete_dashboard_blog", {
      p_user_id: scope.effectiveUserId,
      p_blog_id: parsed.data.id,
    });
    return error ? failed("DELETE_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function reorderBlogs(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.reorderBlogsSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("reorder_dashboard_blogs", {
      p_user_id: scope.effectiveUserId,
      p_group_id: parsed.data.groupId,
      p_blog_ids: parsed.data.orderedIds,
    });
    return error ? failed("REORDER_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
