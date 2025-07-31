import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getEffectiveUserId } from '@/utils/user/getEffectiveUserId';
import { getTrialInfo } from '@/utils/trialManagement';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const userId = await getEffectiveUserId({ targetUserId: null, supabase });
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const { data: user, error } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', userId)
      .single();
    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const trialInfo = await getTrialInfo(userId);

    console.log(trialInfo);

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
        .eq('id', userId)
        .single();
      if (userDb?.current_period_end) {
        endDate = new Date(userDb.current_period_end);
      }
    }
    return NextResponse.json({
      plan: user.subscription_status,
      isTrial,
      endDate,
    });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 