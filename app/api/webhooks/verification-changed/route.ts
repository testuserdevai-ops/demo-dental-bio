import { NextResponse } from 'next/server';
import { sendVerificationMail } from '@/utils/mails/sendVerificationMail';
import { getDomainConfig } from '@/utils/domainConfig';
import { headers } from 'next/headers';

export const dynamic = 'force-dynamic';

export const POST = async (request: Request) => {
  try {
    // Verify the request is from a legitimate cron service
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const { email, username, first_name } = body;
    const headersList = await headers();
    const domainConfig = getDomainConfig(headersList);
    if (email && first_name) {
      sendVerificationMail(email, username, first_name, domainConfig);
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Error in trial expiration cron job:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 