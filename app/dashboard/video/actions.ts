"use server";
import { resolveDashboardIdentity } from "@/lib/dashboard/identity";
import {
  actionError,
  type ActionResult,
  zodActionError,
} from "@/lib/forms/action-result";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import * as schema from "./_lib/schemas";
import type { VideoGroupViewModel, VideoViewModel } from "./_lib/queries";
type GroupRow = {
  id: number;
  name: string | null;
  enabled: boolean | null;
  rank: number | null;
};
type VideoRow = {
  id: number;
  group_id: number | null;
  title: string | null;
  link: string | null;
  enabled: boolean | null;
  rank: number | null;
};
const group = (row: GroupRow): VideoGroupViewModel => ({
  id: row.id,
  name: row.name ?? "",
  enabled: row.enabled ?? true,
  rank: row.rank ?? 0,
  videos: [],
});
const video = (row: VideoRow): VideoViewModel => ({
  id: row.id,
  groupId: row.group_id ?? 0,
  title: row.title ?? "",
  link: row.link ?? "",
  enabled: row.enabled ?? true,
  rank: row.rank ?? 0,
});
const failed = <T>(code: string): ActionResult<T> =>
  actionError(code, "Unable to manage videos");
export async function createVideoGroup(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<VideoGroupViewModel>> {
  const parsed = schema.createVideoGroupSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { data, error } = await client.rpc("create_dashboard_video_group", {
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
export async function updateVideoGroup(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<VideoGroupViewModel>> {
  const parsed = schema.updateVideoGroupSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("update_dashboard_video_group", {
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
export async function deleteVideoGroup(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.deleteVideoGroupSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("delete_dashboard_video_group", {
      p_user_id: scope.effectiveUserId,
      p_group_id: parsed.data.id,
    });
    return error ? failed("DELETE_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function reorderVideoGroups(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.reorderVideoGroupsSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("reorder_dashboard_video_groups", {
      p_user_id: scope.effectiveUserId,
      p_group_ids: parsed.data.orderedIds,
    });
    return error ? failed("REORDER_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function createVideo(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<VideoViewModel>> {
  const parsed = schema.createVideoSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("create_dashboard_video", {
      p_user_id: scope.effectiveUserId,
      p_group_id: value.groupId,
      p_title: value.title,
      p_url: value.link,
      p_enabled: value.enabled,
    });
    const row = data?.[0];
    return error || !row
      ? failed("CREATE_FAILED")
      : { ok: true, data: video(row) };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function updateVideo(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<VideoViewModel>> {
  const parsed = schema.updateVideoSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const value = parsed.data;
    const { data, error } = await client.rpc("update_dashboard_video", {
      p_user_id: scope.effectiveUserId,
      p_video_id: value.id,
      p_title: value.title,
      p_url: value.link,
      p_enabled: value.enabled,
    });
    const row = data?.[0];
    return error || !row
      ? failed("UPDATE_FAILED")
      : { ok: true, data: video(row) };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function deleteVideo(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.deleteVideoSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("delete_dashboard_video", {
      p_user_id: scope.effectiveUserId,
      p_video_id: parsed.data.id,
    });
    return error ? failed("DELETE_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
export async function reorderVideos(
  hint: string | undefined,
  input: unknown,
): Promise<ActionResult<void>> {
  const parsed = schema.reorderVideosSchema.safeParse(input);
  if (!parsed.success) return zodActionError(parsed.error);
  try {
    const { scope } = await resolveDashboardIdentity(hint);
    const client = await createServerSupabaseClient();
    const { error } = await client.rpc("reorder_dashboard_videos", {
      p_user_id: scope.effectiveUserId,
      p_group_id: parsed.data.groupId,
      p_video_ids: parsed.data.orderedIds,
    });
    return error ? failed("REORDER_FAILED") : { ok: true, data: undefined };
  } catch {
    return failed("AUTHORIZATION_ERROR");
  }
}
