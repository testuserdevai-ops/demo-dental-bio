import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import { SupabaseClient } from '@supabase/supabase-js';

export const POST = withAuth(async (request, { supabase, user }) => {
  const { page, limit, filters } = await request.json();

  if (user.role !== 'admin') {
    return apiResponse.error('You are not authorized to access this page', 400);
  }

  const { data, count } = await fetchTableData(page, limit, filters, supabase);

  return apiResponse.success({ data, count });
});

export const GET = withAuth(async (request, { supabase, user }) => {
  if (user.role !== 'admin') {
    return apiResponse.error('You are not authorized to access this page', 400);
  }

  const { data } = await supabase
    .from('users')
    .select('*')

  return apiResponse.success({ data });
});

const fetchTableData = async (
  page: number,
  limit: number,
  filters: Record<string, any>,
  supabase: SupabaseClient
) => {
  const start = (page - 1) * limit;
  const end = start + limit - 1;

  let query = supabase.from('users').select('* ,dentistries(*), user_device_fingerprints(fingerprint, last_seen_at)', { count: 'exact' }).order('created_at', { ascending: false });

  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      if (key === 'isVerified') {
        // Use eq for boolean fields
        query = query.eq(key, value === 'true' || value === true);
      } else if (key === 'subscription_status') {
        console.log(value);
        if (value === 'trialing') {
          const today = new Date().toISOString();
          query = query.gt('trial_end', today);
        } else if (value === 'FREE') {
          query = query.or('subscription_status.is.null,subscription_status.eq.');
        } else {
          query = query.eq(key, value);
        }
      } else {
        // Use ilike for string fields
        query = query.ilike(key, `%${value}%`);
      }
    }
  });

  // Apply pagination
  const { data, count, error } = await query.range(start, end);

  if (error) throw error;
  return { data, count };
};
