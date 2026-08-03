import { NextResponse } from 'next/server';
import { createClient } from "@/utils/supabase/server";
import { getDomainConfig } from "@/utils/domainConfig";
import crypto from 'crypto';

const sharedSecret = process.env.VERIFF_SHARED_SECRET!;

export async function POST(req: Request) {
  try {
    // Verify HMAC signature from Veriff
    const signature = req.headers.get('x-hmac-signature');
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const rawBody = await req.text();
    const expectedSignature = crypto
      .createHmac('sha256', sharedSecret)
      .update(rawBody)
      .digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Get domain-specific configuration
    const domainConfig = getDomainConfig(req.headers);
    const supabase = await createClient();

    const body = JSON.parse(rawBody);
    const { status: veriffStatus, id: session_id } = body;

    if (veriffStatus === 'approved') {
      const { error } = await supabase
        .from('users') // Your Supabase table
        .update({ isVerified: true })
        .eq('session_id', session_id)

      if (error) {
        throw new Error(`Supabase update error: ${error.message}`);
      }
    }

    // Redirect to domain-specific verification page
    return NextResponse.redirect(`${domainConfig.baseUrl}/dashboard/verification`);
  } catch (error) {
    console.error('Error handling Veriff callback:', error);
    return NextResponse.json(
      { error: 'Failed to handle callback' },
      { status: 500 }
    );
  }
}