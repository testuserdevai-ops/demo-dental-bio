import { withAuth, withPublic } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import { hasActiveSubscription } from '@/lib/subscriptionCheck';
import { getMaxRank } from '@/utils/getMaxOrder';

export const POST = withAuth(async (request, { supabase, user }) => {
  const { group_id, title, link, targetUserId } = await request.json();

  if (!hasActiveSubscription(user))
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin")
    return apiResponse.error("Not authorized");

  const maxRank = await getMaxRank({ supabase, table: "videos", field: "group_id", value: group_id }) + 1;

  const { data, error } = await supabase
    .from('videos')
    .insert([{ group_id, title, link, rank: maxRank }])
    .select("*")
    .single();

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success(data);
});

export const PUT = withPublic(async (request, { supabase }) => {
  const updated_data = await request.json();

  const { data, error } = await supabase
    .from('videos')
    .update(updated_data)
    .eq('id', updated_data.id)
    .select('*')
    .single();

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success(data);
});

export const DELETE = withPublic(async (request, { supabase }) => {
  const { id } = await request.json();

  const { error } = await supabase
    .from('videos')
    .delete()
    .eq('id', id);

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success({ status: 'success' });
});
