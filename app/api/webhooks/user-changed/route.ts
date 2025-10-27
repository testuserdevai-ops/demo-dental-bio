import { NextResponse } from 'next/server';
import { sendVerificationMail } from '@/utils/mails/sendVerificationMail';

export const dynamic = 'force-dynamic';

export const POST = async (request: Request) => {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    console.log(body);

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Error in trial expiration cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 