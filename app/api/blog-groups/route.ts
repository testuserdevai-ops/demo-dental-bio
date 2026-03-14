import { withAuth, withOptionalAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import { hasActiveSubscription } from '@/lib/subscriptionCheck';
import { getMaxRank } from '@/utils/getMaxOrder';

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

  const { data: groups, error: groupsError } = await supabase
    .from('blog_groups')
    .select('*')
    .eq('user_id', userId)
    .in('enabled', enabledField)
    .order('rank', { ascending: true });

  if (groupsError) {
    return apiResponse.error(groupsError.message);
  }

  const groupIds = groups.map((g: any) => g.id);
  let blogs: any[] = [];

  if (groupIds.length > 0) {
    const { data, error: blogsError } = await supabase
      .from('blogs')
      .select('*')
      .in('group_id', groupIds)
      .in('enabled', enabledField)
      .order('rank', { ascending: true });

    if (blogsError) {
      return apiResponse.error(blogsError.message);
    }
    blogs = data ?? [];
  }

  const groupedBlogs = groups.map(group => ({
    ...group,
    blogs: blogs.filter(blog => blog.group_id === group.id),
  }));

  return apiResponse.success(groupedBlogs);
});

export const POST = withAuth(async (request, { supabase, user }) => {
  const { name, targetUserId } = await request.json();

  if (!hasActiveSubscription(user))
    return apiResponse.error("Please upgrade membership!");

  if (targetUserId && user.role !== "admin")
    return apiResponse.error("Not authorized");

  const maxRank = await getMaxRank({ supabase, table: "blog-groups", field: "user_id", value: targetUserId || user.id }) + 1;

  const { data, error } = await supabase
    .from('blog_groups')
    .insert([{ name, user_id: targetUserId || user.id, rank: maxRank, enabled: true }])
    .select('*, blogs(*)')
    .single();

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success(data);
});

export const PUT = withAuth(async (request, { supabase, user }) => {
  const updated_data = await request.json();

  // Verify ownership before updating
  const { data: existingGroup } = await supabase
    .from('blog_groups')
    .select('user_id')
    .eq('id', updated_data.id)
    .single();

  if (existingGroup && existingGroup.user_id !== user.id && user.role !== 'admin')
    return apiResponse.forbidden();

  const { data, error } = await supabase
    .from('blog_groups')
    .update(updated_data)
    .eq('id', updated_data.id)
    .select('*, blogs(*)')
    .single();

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success(data);
});

export const DELETE = withAuth(async (request, { supabase, user }) => {
  const { id } = await request.json();

  // Verify ownership before deleting
  const { data: existingGroup } = await supabase
    .from('blog_groups')
    .select('user_id')
    .eq('id', id)
    .single();

  if (existingGroup && existingGroup.user_id !== user.id && user.role !== 'admin')
    return apiResponse.forbidden();

  const { data, error } = await supabase
    .from('blog_groups')
    .delete()
    .eq('id', id);

  if (error) {
    return apiResponse.error(error.message);
  }

  return apiResponse.success({ status: 'success' });
});
