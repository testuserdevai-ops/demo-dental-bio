import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendTrialEndNotificationMail } from "@/utils/mails/sendTrialEndNotificationMail";
import { getTrialStatistics } from '@/utils/trialManagement';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + (3 * 24 * 60 * 60 * 1000));
    const oneDayFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));

    // Get users whose trials are ending soon
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, trial_end, subscription_status')
      .not('trial_end', 'is', null)
      .gte('trial_end', now.toISOString())
      .lte('trial_end', threeDaysFromNow.toISOString())
      .eq('subscription_status', 'PRO');

    if (error) {
      console.error('Error fetching users with expiring trials:', error);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const notificationsSent = [];
    const errors = [];

    for (const user of users || []) {
      try {
        const trialEndDate = new Date(user.trial_end);
        const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        // Send notification if trial ends in 1-3 days
        if (daysRemaining >= 1 && daysRemaining <= 3) {
          await sendTrialEndNotificationMail(
            'sergey.r1130@gmail.com', 
            user.first_name || 'User', 
            daysRemaining
          );
          
          notificationsSent.push({
            email: user.email,
            daysRemaining,
            sentAt: new Date().toISOString()
          });
          
          console.log(`Trial end notification sent to ${user.email} (${daysRemaining} days remaining)`);
        }
      } catch (error) {
        console.error(`Error sending notification to ${user.email}:`, error);
        errors.push({
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Get trial statistics
    const statistics = await getTrialStatistics();

    return NextResponse.json({
      success: true,
      notificationsSent: notificationsSent.length,
      errors: errors.length,
      statistics,
      details: {
        notificationsSent,
        errors
      }
    });

  } catch (error) {
    console.error('Error in trial expiration cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 