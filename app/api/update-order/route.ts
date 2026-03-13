import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';

const ALLOWED_TABLES = ['blogs', 'blog_groups', 'galleries', 'general_galleries', 'videos', 'groups', 'reviews', 'products'];

export const POST = withAuth(async (request, { supabase }) => {
  const { table, datasToUpdate } = await request.json();

  if (!table || !ALLOWED_TABLES.includes(table))
    return apiResponse.badRequest('Invalid table name');

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
