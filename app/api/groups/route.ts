import { withAuth, withOptionalAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { hasActiveSubscription } from "@/lib/subscriptionCheck";
import { getMaxRank } from "@/utils/getMaxOrder";

// Whitelist of allowed table names to prevent table injection
const ALLOWED_GROUP_TYPES = ["videos", "products"];

export const GET = withOptionalAuth(async (request, { supabase, user }) => {
  const { searchParams } = new URL(request.url);
  const providedUserId = searchParams.get("userId");
  const providedType = searchParams.get("type");

  const userId = providedUserId || user?.id;
  // Show disabled items only if the viewer is the owner or an admin
  const isOwner = user?.id && userId === user.id;
  const isVerifiedAdmin = user?.role === "admin";
  const enabledField = isOwner || isVerifiedAdmin ? [true, false] : [true];

  if (!userId) {
    return apiResponse.badRequest("User ID is required");
  }

  if (!providedType || !ALLOWED_GROUP_TYPES.includes(providedType)) {
    return apiResponse.badRequest("Invalid group type");
  }

  const { data: groups, error: groupsError } = await supabase
    .from("groups")
    .select("*")
    .eq("user_id", userId)
    .eq("type", providedType)
    .in("enabled", enabledField)
    .order("rank", { ascending: true });

  if (groupsError) {
    return apiResponse.error(groupsError.message);
  }

  const groupIds = groups.map((g: any) => g.id);
  let dataList: any[] = [];

  if (groupIds.length > 0) {
    const { data, error: blogsError } = await supabase
      .from(providedType)
      .select("*")
      .in("group_id", groupIds)
      .in("enabled", enabledField)
      .order("rank", { ascending: true });

    if (blogsError) {
      return apiResponse.error(blogsError.message);
    }
    dataList = data ?? [];
  }

  const groupedDatas = groups.map((group) => ({
    ...group,
    datas: dataList.filter((data) => data.group_id === group.id),
  }));

  return apiResponse.success(groupedDatas);
});

export const POST = withAuth(async (request, { supabase, user }) => {
  const { name, type, targetUserId } = await request.json();

  if (!type || !ALLOWED_GROUP_TYPES.includes(type)) {
    return apiResponse.badRequest("Invalid group type");
  }

  if (!hasActiveSubscription(user))
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin")
    return apiResponse.error("Not authorized");

  const insert_user_id = targetUserId || user.id;

  const maxRank =
    (await getMaxRank({
      supabase,
      table: "blog-groups",
      field: "user_id",
      value: insert_user_id,
    })) + 1;

  const { data, error } = await supabase
    .from("groups")
    .insert([
      { name, user_id: insert_user_id, rank: maxRank, enabled: true, type },
    ])
    .select(`*, ${type}(*)`)
    .single();

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const updated_data = await request.json();

  // Verify ownership before updating
  const { data: existingGroup } = await supabase
    .from("groups")
    .select("user_id")
    .eq("id", updated_data.id)
    .single();

  if (
    existingGroup &&
    existingGroup.user_id !== user.id &&
    user.role !== "admin"
  )
    return apiResponse.forbidden();

  const { data: groupData, error: groupsError } = await supabase
    .from("groups")
    .update(updated_data)
    .eq("id", updated_data.id)
    .select("*")
    .single();

  if (groupsError) {
    return apiResponse.error(groupsError.message);
  }

  if (!ALLOWED_GROUP_TYPES.includes(groupData.type)) {
    return apiResponse.badRequest("Invalid group type");
  }

  const { data: dataList, error: blogsError } = await supabase
    .from(groupData.type)
    .select("*")
    .order("rank", { ascending: true });

  if (blogsError) {
    return apiResponse.error(blogsError.message);
  }

  const groupedData = {
    ...groupData,
    datas: dataList.filter((data) => data.group_id === groupData.id),
  };

  return apiResponse.success(groupedData);
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const { id } = await request.json();

  // Verify ownership before deleting
  const { data: group } = await supabase
    .from("groups")
    .select("user_id")
    .eq("id", id)
    .single();

  if (group && group.user_id !== user.id && user.role !== "admin")
    return apiResponse.forbidden();

  const { data, error } = await supabase.from("groups").delete().eq("id", id);

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success({ status: "success" });
});
