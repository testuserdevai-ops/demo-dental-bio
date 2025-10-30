import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { sendVerificationMail } from '@/utils/mails/sendVerificationMail';
import { sendPlanChangeEmail } from '@/utils/mails/sendTemplateEmails';

export const dynamic = 'force-dynamic';

export const POST = async (request: Request) => {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const currentRecord = body.record;
    const oldRecord = body.old_record;

    if (currentRecord.subscription_status !== "PREMIUM PRO" && currentRecord.use_dental_brand === false) {
      const supabase = createClient();

      const { error } = await supabase
        .from('users')
        .update({ use_dental_brand: true })
        .eq('id', currentRecord.id);
    }

    if (currentRecord.subscription_status !== oldRecord.subscription_status) {
      await sendPlanChangeEmail(currentRecord.email, oldRecord.subscription_status, currentRecord.subscription_status);
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Error in trial expiration cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 