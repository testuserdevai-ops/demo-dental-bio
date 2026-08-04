import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { hasActiveSubscription } from "@/lib/subscriptionCheck";
import { getMaxRank } from "@/utils/getMaxOrder";

export const POST = withAuth(async (request, { supabase, user }) => {
  const { group_id, title, link, targetUserId } = await request.json();

  if (!hasActiveSubscription(user))
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin")
    return apiResponse.error("Not authorized");

  const maxRank =
    (await getMaxRank({
      supabase,
      table: "videos",
      field: "group_id",
      value: group_id,
    })) + 1;

  const { data, error } = await supabase
    .from("videos")
    .insert([{ group_id, title, link, rank: maxRank }])
    .select("*")
    .single();

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const updated_data = await request.json();

  // Verify ownership via group -> user_id
  const { data: video } = await supabase
    .from("videos")
    .select("group_id")
    .eq("id", updated_data.id)
    .single();

  if (video?.group_id != null) {
    const { data: group } = await supabase
      .from("groups")
      .select("user_id")
      .eq("id", video.group_id)
      .single();
    if (group && group.user_id !== user.id && user.role !== "admin")
      return apiResponse.forbidden();
  }

  const { data, error } = await supabase
    .from("videos")
    .update(updated_data)
    .eq("id", updated_data.id)
    .select("*")
    .single();

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success(data);
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const { id } = await request.json();

  // Verify ownership via group -> user_id
  const { data: video } = await supabase
    .from("videos")
    .select("group_id")
    .eq("id", id)
    .single();

  if (video?.group_id != null) {
    const { data: group } = await supabase
      .from("groups")
      .select("user_id")
      .eq("id", video.group_id)
      .single();
    if (group && group.user_id !== user.id && user.role !== "admin")
      return apiResponse.forbidden();
  }

  const { error } = await supabase.from("videos").delete().eq("id", id);

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success({ status: "success" });
});
