import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import { getTrialInfo } from '@/utils/trialManagement';

export const GET = withAuth(async (request, { supabase, user }) => {
  const { data: userData, error } = await supabase
    .from('users')
    .select('subscription_status')
    .eq('id', user.id)
    .single();

  if (error || !userData) {
    return apiResponse.error('User not found', 404);
  }

  const trialInfo = await getTrialInfo(user.id);

  let endDate = null;
  let isTrial = false;
  if (trialInfo?.isInTrial && trialInfo.trialEndDate) {
    endDate = trialInfo.trialEndDate;
    isTrial = true;
  } else if (trialInfo && !trialInfo.isInTrial) {
    // If not in trial, try to get paid period end from DB
    const { data: userDb } = await supabase
      .from('users')
      .select('current_period_end')
      .eq('id', user.id)
      .single();
    if (userDb?.current_period_end) {
      endDate = new Date(userDb.current_period_end);
    }
  }

  return apiResponse.success({
    plan: userData.subscription_status,
    isTrial,
    endDate,
  });
});
