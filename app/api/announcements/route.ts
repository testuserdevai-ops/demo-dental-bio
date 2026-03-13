import { withAuth, withPublic } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';

export const GET = withPublic(async (request, { supabase }) => {
  const { data: titleData, error: titleError } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'announcement_title')
    .single();

  if (titleError) return apiResponse.badRequest(titleError.message);

  const { data: contentData, error: contentError } = await supabase
    .from('settings')
    .select('value')
    .eq('key', 'announcement_content')
    .single();

  if (contentError) return apiResponse.badRequest(contentError.message);

  return apiResponse.success({ title: titleData.value, content: contentData.value });
});

export const POST = withAuth(async (request, { supabase, user }) => {
  const { title, content } = await request.json();

  if (user.role !== 'admin')
    return apiResponse.forbidden();

  const { data, error } = await supabase
    .from('settings')
    .insert([{ 'key': 'announcement_title', 'value': title }, { 'key': 'announcement_content', 'value': content }])
    .select("*");

  if (error) return apiResponse.badRequest(error.message);
  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const { title, content } = await request.json();

  if (user.role !== 'admin')
    return apiResponse.forbidden();

  const { data: titleData, error: titleError } = await supabase
    .from('settings')
    .update({ value: title })
    .eq('key', 'announcement_title')
    .select("value")
    .single();

  if (titleError) return apiResponse.badRequest(titleError.message);

  const { data: contentData, error: contentError } = await supabase
    .from('settings')
    .update({ value: content })
    .eq('key', 'announcement_content')
    .select("value")
    .single();

  if (contentError) return apiResponse.badRequest(contentError.message);

  return apiResponse.success({ status: "success" });
});
