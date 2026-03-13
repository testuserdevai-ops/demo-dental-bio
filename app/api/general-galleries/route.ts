import { withAuth, withOptionalAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import { hasActiveSubscription } from '@/lib/subscriptionCheck';
import { getMaxRank } from '@/utils/getMaxOrder';
import { deleteFileFromSupabase } from '@/utils/removeFromBucket';

export const GET = withOptionalAuth(async (request, { supabase, user }) => {
  const { searchParams } = new URL(request.url);
  const providedUserId = searchParams.get('userId');

  const userId = providedUserId || user?.id;
  // Show disabled items only if the viewer is the owner or an admin
  const isOwner = user?.id && userId === user.id;
  const isVerifiedAdmin = user?.role === 'admin';
  const enabledField = (isOwner || isVerifiedAdmin) ? [true, false] : [true];

  if (!userId) {
    return apiResponse.badRequest('User ID is required');
  }

  const { data, error } = await supabase
    .from('general_galleries')
    .select('*')
    .eq('user_id', userId)
    .in('enabled', enabledField)
    .order('rank', { ascending: true });

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success(data);
});

export const POST = withAuth(async (request, { supabase, user }) => {
  const { title, general_image_url, targetUserId } = await request.json();

  if (!hasActiveSubscription(user))
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin")
    return apiResponse.error("Not authorized");

  const maxRank = await getMaxRank({ supabase, table: "general_galleries", field: "user_id", value: targetUserId || user.id }) + 1;

  const { data, error } = await supabase
    .from('general_galleries')
    .insert([{ title, image_url: general_image_url, user_id: targetUserId || user.id, rank: maxRank }])
    .select("*")
    .single();

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const updated_data = await request.json();

  const { data: gallery } = await supabase
    .from('general_galleries')
    .select('*')
    .eq('id', updated_data.id)
    .single();

  if (gallery && gallery.user_id !== user.id && user.role !== 'admin')
    return apiResponse.forbidden();

  if (gallery && updated_data.image_url && updated_data.image_url !== gallery.image_url) {
    await deleteFileFromSupabase({ supabase, bucketName: 'gallery-images', fileUrl: gallery.image_url });
  }

  const { data, error } = await supabase
    .from('general_galleries')
    .update({ title: updated_data.title, image_url: updated_data.image_url, rank: updated_data.rank })
    .eq('id', updated_data.id)
    .select('*')
    .single();

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success(data);
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const { id } = await request.json();

  const { data: gallery } = await supabase
    .from('general_galleries')
    .select('image_url, user_id')
    .eq('id', id)
    .single();

  if (gallery && gallery.user_id !== user.id && user.role !== 'admin')
    return apiResponse.forbidden();

  if (gallery && gallery.image_url) {
    await deleteFileFromSupabase({ supabase, bucketName: 'gallery-images', fileUrl: gallery.image_url });
  }

  const { data, error } = await supabase
    .from('general_galleries')
    .delete()
    .eq('id', id);

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success({ status: 'success' });
});
