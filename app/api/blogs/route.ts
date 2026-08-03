import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { hasActiveSubscription } from "@/lib/subscriptionCheck";
import { generateUniqueSlug } from "@/utils/slugGenerator";
import { deleteFileFromSupabase } from "@/utils/removeFromBucket";
import { getMaxRank } from "@/utils/getMaxOrder";

export const POST = withAuth(async (request, { supabase, user }) => {
  const {
    title,
    content,
    meta_title,
    meta_description,
    image_url,
    slug,
    group_id,
    targetUserId,
  } = await request.json();

  if (!hasActiveSubscription(user))
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin") return apiResponse.forbidden();

  const uniqueSlug = await generateUniqueSlug(supabase, slug);
  const maxRank =
    (await getMaxRank({
      supabase,
      table: "blogs",
      field: "group_id",
      value: group_id,
    })) + 1;

  const { data, error } = await supabase
    .from("blogs")
    .insert([
      {
        title,
        content,
        meta_title,
        meta_description,
        image_url,
        group_id,
        rank: maxRank,
        slug: uniqueSlug,
      },
    ])
    .select("*")
    .single();

  if (error) return apiResponse.badRequest(error.message);
  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const updated_data = await request.json();

  const { data: existingBlog } = await supabase
    .from("blogs")
    .select("group_id, image_url")
    .eq("id", updated_data.id)
    .single();

  if (existingBlog?.group_id != null) {
    const { data: group } = await supabase
      .from("blog_groups")
      .select("user_id")
      .eq("id", existingBlog.group_id)
      .single();
    if (group && group.user_id !== user.id && user.role !== "admin")
      return apiResponse.forbidden();
  }

  const finalData = updated_data.slug
    ? {
        ...updated_data,
        slug: await generateUniqueSlug(
          supabase,
          updated_data.slug,
          updated_data.id,
        ),
      }
    : updated_data;

  if (updated_data?.image_url && existingBlog) {
    if (
      updated_data.image_url !== existingBlog.image_url &&
      typeof existingBlog.image_url === "string" &&
      existingBlog.image_url.length > 0
    )
      await deleteFileFromSupabase({
        supabase,
        bucketName: "blog-images",
        fileUrl: existingBlog.image_url,
      });
  }

  const { data, error } = await supabase
    .from("blogs")
    .update(finalData)
    .eq("id", updated_data.id)
    .select("*")
    .single();

  if (error) return apiResponse.badRequest(error.message);
  return apiResponse.success(data);
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const { id } = await request.json();

  const { data: blog } = await supabase
    .from("blogs")
    .select("image_url, group_id")
    .eq("id", id)
    .single();

  if (blog?.group_id != null) {
    const { data: group } = await supabase
      .from("blog_groups")
      .select("user_id")
      .eq("id", blog.group_id)
      .single();
    if (group && group.user_id !== user.id && user.role !== "admin")
      return apiResponse.forbidden();

    if (typeof blog.image_url === "string")
      await deleteFileFromSupabase({
        supabase,
        bucketName: "blog-images",
        fileUrl: blog.image_url,
      });
  }

  const { data, error } = await supabase.from("blogs").delete().eq("id", id);

  if (error) return apiResponse.badRequest(error.message);
  return apiResponse.success({ status: "success" });
});
