import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserInfo } from '@/utils/userInfo';

const VERIFF_API_URL = process.env.VERIFF_API_URL!;
const API_KEY = process.env.VERIFF_API_KEY!; // Veriff API Key

export async function POST(req: Request) {
  try {
    // Get domain-specific configuration
    const { getDomainConfig } = await import('@/utils/domainConfig');
    const domainConfig = getDomainConfig(req.headers);
    const baseUrl = domainConfig.baseUrl;
    
    const supabase = createClient();

    const userData = await getUserInfo({ supabase });

    if (!userData.id) {
      return NextResponse.json({ error: 'You should login before verification.' }, { status: 400 });
    }

    if (userData.isVerified) {
      return NextResponse.json({ error: 'You already verified your identity.' }, { status: 400 });
    }

    const response = await fetch(VERIFF_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-AUTH-CLIENT': API_KEY,
      },
      body: JSON.stringify({
        verification: {
          callback: `${baseUrl}/dashboard/verification`,
          person: {
            firstName: userData.first_name,
            lastName: userData.last_name
          },
        },
      }),
    });

    const data = await response.json();

    const { error } = await supabase
      .from('users')
      .update({ session_id: data.verification.id, veriff_session_url: data.verification.url, session_created_at: new Date() })
      .eq("id", userData.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.statusText}`);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating Veriff session:', error);
    return NextResponse.json(
      { error: 'Failed to create Veriff session' },
      { status: 500 }
    );
  }
}