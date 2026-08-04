import { withAuth, withOptionalAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { hasActiveSubscription } from "@/lib/subscriptionCheck";
import { getMaxRank } from "@/utils/getMaxOrder";
import { deleteFileFromSupabase } from "@/utils/removeFromBucket";

export const GET = withOptionalAuth(async (request, { supabase, user }) => {
  const { searchParams } = new URL(request.url);
  const providedUserId = searchParams.get("userId");
  const userId = providedUserId || user?.id;
  // Show disabled items only if the viewer is the owner or an admin
  const isOwner = user?.id && userId === user.id;
  const isVerifiedAdmin = user?.role === "admin";
  const enabledField = isOwner || isVerifiedAdmin ? [true, false] : [true];

  if (!userId) {
    return apiResponse.badRequest("User ID is required");
  }

  const { data, error } = await supabase
    .from("galleries")
    .select("*")
    .eq("user_id", userId)
    .in("enabled", enabledField)
    .order("rank", { ascending: true });

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success(data);
});

export const POST = withAuth(async (request, { supabase, user }) => {
  const {
    title,
    before_image_url,
    after_image_url,
    before_image_label,
    after_image_label,
    targetUserId,
  } = await request.json();

  if (!hasActiveSubscription(user))
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin")
    return apiResponse.error("Not authorized");

  const maxRank =
    (await getMaxRank({
      supabase,
      table: "galleries",
      field: "user_id",
      value: targetUserId || user.id,
    })) + 1;

  const { data, error } = await supabase
    .from("galleries")
    .insert([
      {
        title,
        before_image_url,
        after_image_url,
        user_id: targetUserId || user.id,
        rank: maxRank,
        before_image_label,
        after_image_label,
      },
    ])
    .select("*")
    .single();

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const updated_data = await request.json();

  const { data: gallery } = await supabase
    .from("galleries")
    .select("*")
    .eq("id", updated_data.id)
    .single();

  if (gallery && gallery.user_id !== user.id && user.role !== "admin")
    return apiResponse.forbidden();

  if (gallery) {
    if (
      gallery.before_image_url &&
      updated_data.before_image_url !== gallery.before_image_url
    )
      await deleteFileFromSupabase({
        supabase,
        bucketName: "gallery-images",
        fileUrl: gallery.before_image_url,
      });
    if (
      gallery.after_image_url &&
      updated_data.after_image_url !== gallery.after_image_url
    )
      await deleteFileFromSupabase({
        supabase,
        bucketName: "gallery-images",
        fileUrl: gallery.after_image_url,
      });
  }

  const { data, error } = await supabase
    .from("galleries")
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

  const { data: gallery } = await supabase
    .from("galleries")
    .select("before_image_url, after_image_url, user_id")
    .eq("id", id)
    .single();

  if (gallery && gallery.user_id !== user.id && user.role !== "admin")
    return apiResponse.forbidden();

  if (gallery) {
    if (gallery.before_image_url)
      await deleteFileFromSupabase({
        supabase,
        bucketName: "gallery-images",
        fileUrl: gallery.before_image_url,
      });
    if (gallery.after_image_url)
      await deleteFileFromSupabase({
        supabase,
        bucketName: "gallery-images",
        fileUrl: gallery.after_image_url,
      });
  }

  const { data, error } = await supabase
    .from("galleries")
    .delete()
    .eq("id", id);

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success({ status: "success" });
});
