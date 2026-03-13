import { withAuth, withOptionalAuth, withPublic } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import { deleteFileFromSupabase } from '@/utils/removeFromBucket';
import { getMaxRank } from '@/utils/getMaxOrder';

export const GET = withOptionalAuth(async (request, { supabase, user }) => {
  const { searchParams } = new URL(request.url);
  const providedUserId = searchParams.get('userId');
  const userId = providedUserId || user?.id;
  // Show disabled items only for own data or if authenticated admin
  const isVerifiedAdmin = user?.role === 'admin';
  const enabledField = (!providedUserId || isVerifiedAdmin) ? [true, false] : [true];

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
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success(data);
});

export const POST = withPublic(async (request, { supabase }) => {
  const { group_id, name, link, platform, image_url, price, currency } = await request.json();

  const maxRank = await getMaxRank({ supabase, table: "products", field: "group_id", value: group_id }) + 1;

  const { data, error } = await supabase
    .from('products')
    .insert([{ group_id, name, link, platform, image_url, price, currency, rank: maxRank }])
    .select("*")
    .single();

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const updated_data = await request.json();

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', updated_data.id)
    .single();

  if (product) {
    // Check ownership via group -> user_id
    const { data: group } = await supabase.from('groups').select('user_id').eq('id', product.group_id).single();
    if (group && group.user_id !== user.id && user.role !== 'admin')
      return apiResponse.forbidden();
  }

  if (updated_data.image_url && product) {
    if (updated_data.image_url !== product.image_url && product.image_url?.length > 0)
      await deleteFileFromSupabase({ supabase, bucketName: 'product-images', fileUrl: product.image_url });
  }

  const { data, error } = await supabase
    .from('products')
    .update({ ...updated_data, image_url: updated_data.image_url || product?.image_url })
    .eq('id', updated_data.id)
    .select('*')
    .single();

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success(data);
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const { id } = await request.json();

  const { data: product } = await supabase
    .from('products')
    .select('image_url, group_id')
    .eq('id', id)
    .single();

  if (product) {
    const { data: group } = await supabase.from('groups').select('user_id').eq('id', product.group_id).single();
    if (group && group.user_id !== user.id && user.role !== 'admin')
      return apiResponse.forbidden();

    if (product.image_url)
      await deleteFileFromSupabase({ supabase, bucketName: 'product-images', fileUrl: product.image_url });
  }

  const { data, error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);

  if (error) {
    return apiResponse.badRequest(error.message);
  }

  return apiResponse.success({ status: 'success' });
});
