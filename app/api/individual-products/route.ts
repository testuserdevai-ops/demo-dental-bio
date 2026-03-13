import { withAuth, withOptionalAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import { hasActiveSubscription } from '@/lib/subscriptionCheck';
import { getMaxRank } from '@/utils/getMaxOrder';
import { deleteFileFromSupabase } from '@/utils/removeFromBucket';

export const GET = withOptionalAuth(async (request, { supabase, user }) => {
  const { searchParams } = new URL(request.url);
  const providedUserId = searchParams.get('userId');

  // Get the logged-in user's data if no user ID is provided
  const userId = providedUserId || user?.id;
  const enabledField = providedUserId ? [true] : [true, false];

  if (!userId) {
    return apiResponse.badRequest('User ID is required');
  }

  const { data, error } = await supabase
    .from('products')
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
  const { name, link, platform, image_url, price, currency, targetUserId } = await request.json();

  if (!hasActiveSubscription(user))
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin")
    return apiResponse.error("Not authorized");

  const userId = targetUserId || user?.id;

  const maxRank = await getMaxRank({ supabase, table: "products", field: "user_id", value: userId }) + 1;

  const { data, error } = await supabase
    .from('products')
    .insert([{ user_id: userId, name, link, platform, image_url, price, currency, rank: maxRank }])
    .select("*")
    .single();

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase }) => {
  const updated_data = await request.json();

  const { data: product, error: getError } = await supabase
    .from('products')
    .select('*')
    .eq('id', updated_data.id)
    .single();

  if (updated_data.image_url) {
    if (updated_data.image_url !== product.image_url && product.image_url.length > 0)
      await deleteFileFromSupabase({ supabase, bucketName: 'product-images', fileUrl: product.image_url });
  }

  const { data, error } = await supabase
    .from('products')
    .update({ ...updated_data, image_url: updated_data.image_url || product.image_url })
    .eq('id', updated_data.id)
    .select('*')
    .single();

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success(data);
});

export const DELETE = withAuth(async (request, { supabase }) => {
  const { id } = await request.json();

  const { data: product, error: getError } = await supabase
    .from('products')
    .select('image_url')
    .eq('id', id)
    .single();

  if (product?.image_url)
    await deleteFileFromSupabase({ supabase, bucketName: 'product-images', fileUrl: product.image_url });

  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success({ status: 'success' });
});
