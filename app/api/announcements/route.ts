import { withAuth, withPublic } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { z } from "zod";

const announcementSchema = z
  .object({
    title: z.string().trim().max(160),
    content: z.string().trim().max(2_000),
  })
  .strict();

export const GET = withPublic(async (request, { supabase }) => {
  const { data, error } = await supabase
    .from("settings")
    .select("key, value")
    .in("key", ["announcement_title", "announcement_content"]);

  if (error) {
    return apiResponse.error("Unable to load announcements.", 500);
  }

  const settings = new Map(data?.map(({ key, value }) => [key, value]));

  return apiResponse.success({
    title: settings.get("announcement_title") ?? "",
    content: settings.get("announcement_content") ?? "",
  });
});

export const POST = withAuth(async (request, { supabase, user }) => {
  if (user.role !== "admin") return apiResponse.forbidden();
  const parsed = announcementSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiResponse.badRequest("Invalid announcement.");
  const { title, content } = parsed.data;

  const { data, error } = await supabase
    .from("settings")
    .insert([
      { key: "announcement_title", value: title },
      { key: "announcement_content", value: content },
    ])
    .select("*");

  if (error) return apiResponse.badRequest(error.message);
  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  if (user.role !== "admin") return apiResponse.forbidden();
  const parsed = announcementSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return apiResponse.badRequest("Invalid announcement.");
  const { title, content } = parsed.data;

  const { data: titleData, error: titleError } = await supabase
    .from("settings")
    .update({ value: title })
    .eq("key", "announcement_title")
    .select("value")
    .single();

  if (titleError) return apiResponse.badRequest(titleError.message);

  const { data: contentData, error: contentError } = await supabase
    .from("settings")
    .update({ value: content })
    .eq("key", "announcement_content")
    .select("value")
    .single();

  if (contentError) return apiResponse.badRequest(contentError.message);

  return apiResponse.success({ status: "success" });
});
