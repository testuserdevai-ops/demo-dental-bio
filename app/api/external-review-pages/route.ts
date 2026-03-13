import { withAuth, withOptionalAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import { hasActiveSubscription } from '@/lib/subscriptionCheck';

export const GET = withOptionalAuth(async (request, { supabase, user }) => {
  const { searchParams } = new URL(request.url);
  const providedUserId = searchParams.get('userId');
  const userId = providedUserId || user?.id;

  if (!userId) return apiResponse.badRequest('User ID is required');

  const { data, error } = await supabase
    .from('external_review_pages')
    .select('*')
    .eq('user_id', userId);

  if (error) return apiResponse.badRequest(error.message);
  return apiResponse.success(data);
});

export const POST = withAuth(async (request, { supabase, user }) => {
  const { link, targetUserId } = await request.json();

  if (!hasActiveSubscription(user))
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin")
    return apiResponse.forbidden();

  const { data, error } = await supabase
    .from('external_review_pages')
    .insert([{ user_id: targetUserId || user.id, link }])
    .select("*")
    .single();

  if (error) return apiResponse.badRequest(error.message);
  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const { id, link } = await request.json();

  // Verify ownership: the review page must belong to the authenticated user
  const { data: existing } = await supabase
    .from('external_review_pages')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing) return apiResponse.badRequest('Review page not found');
  if (existing.user_id !== user.id && user.role !== 'admin')
    return apiResponse.forbidden();

  const { data, error } = await supabase
    .from('external_review_pages')
    .update({ link })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return apiResponse.badRequest(error.message);
  return apiResponse.success(data);
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const { id } = await request.json();

  // Verify ownership: the review page must belong to the authenticated user
  const { data: existing } = await supabase
    .from('external_review_pages')
    .select('user_id')
    .eq('id', id)
    .single();

  if (!existing) return apiResponse.badRequest('Review page not found');
  if (existing.user_id !== user.id && user.role !== 'admin')
    return apiResponse.forbidden();

  const { data, error } = await supabase
    .from('external_review_pages')
    .delete()
    .eq('id', id);

  if (error) return apiResponse.badRequest(error.message);
  return apiResponse.success({ status: 'success' });
});
