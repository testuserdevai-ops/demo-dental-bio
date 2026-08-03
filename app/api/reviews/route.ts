import { withAuth, withOptionalAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { hasActiveSubscription } from "@/lib/subscriptionCheck";
import { deleteFileFromSupabase } from "@/utils/removeFromBucket";
import { getMaxRank } from "@/utils/getMaxOrder";

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
    .from("reviews")
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
    reviewer_name,
    content,
    stars,
    image_url,
    platform,
    created_at,
    targetUserId,
  } = await request.json();

  if (!hasActiveSubscription(user))
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin")
    return apiResponse.error("Not authorized");

  const userId = targetUserId || user?.id;
  const maxRank =
    (await getMaxRank({
      supabase,
      table: "reviews",
      field: "user_id",
      value: userId,
    })) + 1;

  const { data, error } = await supabase
    .from("reviews")
    .insert([
      {
        user_id: userId,
        reviewer_name,
        content,
        stars,
        image_url,
        platform,
        rank: maxRank,
        created_at,
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

  const { data: review } = await supabase
    .from("reviews")
    .select("*")
    .eq("id", updated_data.id)
    .single();

  if (review && review.user_id !== user.id && user.role !== "admin")
    return apiResponse.forbidden();

  if (updated_data.image_url && review) {
    if (
      updated_data.image_url !== review.image_url &&
      review.image_url?.length > 0
    )
      await deleteFileFromSupabase({
        supabase,
        bucketName: "review-images",
        fileUrl: review.image_url,
      });
  }

  const { data, error } = await supabase
    .from("reviews")
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

  const { data: review } = await supabase
    .from("reviews")
    .select("image_url, user_id")
    .eq("id", id)
    .single();

  if (review && review.user_id !== user.id && user.role !== "admin")
    return apiResponse.forbidden();

  if (review?.image_url)
    await deleteFileFromSupabase({
      supabase,
      bucketName: "review-images",
      fileUrl: review.image_url,
    });

  const { data, error } = await supabase.from("reviews").delete().eq("id", id);

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success({ status: "success" });
});
