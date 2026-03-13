import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';

const ALLOWED_TABLES = ['blogs', 'blog_groups', 'galleries', 'general_galleries', 'videos', 'groups', 'reviews', 'products'];

// Tables that have a direct user_id column
const TABLES_WITH_USER_ID = ['blog_groups', 'galleries', 'general_galleries', 'groups', 'reviews'];
// Tables that belong to a user via a group (group_id -> groups.user_id or blog_groups.user_id)
const TABLES_WITH_GROUP_ID = ['blogs', 'videos', 'products'];

export const POST = withAuth(async (request, { supabase, user }) => {
  const { table, datasToUpdate } = await request.json();

  if (!table || !ALLOWED_TABLES.includes(table))
    return apiResponse.badRequest('Invalid table name');

  if (!Array.isArray(datasToUpdate) || datasToUpdate.length === 0)
    return apiResponse.badRequest('No data to update');

  const ids = datasToUpdate.map(({ id }: { id: string }) => id);

  // Verify ownership of all items being reordered (skip for admins)
  if (user.role !== 'admin') {
    if (TABLES_WITH_USER_ID.includes(table)) {
      const { data: items } = await supabase.from(table).select('id, user_id').in('id', ids);
      const unauthorized = items?.some((item: any) => item.user_id !== user.id);
      if (unauthorized) return apiResponse.forbidden();
    } else if (TABLES_WITH_GROUP_ID.includes(table)) {
      const groupTable = table === 'blogs' ? 'blog_groups' : 'groups';
      const { data: items } = await supabase.from(table).select('id, group_id').in('id', ids);
      if (items && items.length > 0) {
        const groupIds = [...new Set(items.map((item: any) => item.group_id))];
        const { data: groups } = await supabase.from(groupTable).select('id, user_id').in('id', groupIds);
        const unauthorized = groups?.some((g: any) => g.user_id !== user.id);
        if (unauthorized) return apiResponse.forbidden();
      }
    }
  }

  const updates = datasToUpdate.map(({ id, rank }: { id: string, rank: number }) =>
    supabase
      .from(table)
      .update({ rank })
      .eq('id', id)
  );

  const results = await Promise.all(updates);

  const errors = results.filter(({ error }) => error);
  if (errors.length > 0)
    return apiResponse.badRequest('Some updates failed');

  return apiResponse.success({ message: 'Ranks updated successfully' });
});
