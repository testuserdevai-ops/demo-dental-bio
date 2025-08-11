import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserInfo } from '@/utils/userInfo';

export async function POST(request: Request) {
  try {
    const { targetUserId, isVerified } = await request.json();

    if (!targetUserId || typeof isVerified !== 'boolean') {
      return NextResponse.json({ error: 'targetUserId and isVerified are required' }, { status: 400 });
    }

    const supabase = createClient();
    const currentUser = await getUserInfo({ supabase });

    if (!currentUser || currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('users')
      .update({ isVerified })
      .eq('id', targetUserId)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ user: data });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Internal Server Error' }, { status: 500 });
  }
} 