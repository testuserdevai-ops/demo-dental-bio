import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendTrialEndNotificationMail, sendTrialStatusEmail } from "@/utils/mails/sendTrialEndNotificationMail";
import { getTrialStatistics } from '@/utils/trialManagement';
import { sleep } from '@/utils/function_utils';

export const dynamic = 'force-dynamic';

export const POST = async (request: Request) => {
  try {
    const supabase = createClient();

    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    console.log(body);

    const { type, table, record, old_record } = body;

    if (type === 'UPDATE' && table === 'users') {
      console.log(record, old_record);
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Error in trial expiration cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 