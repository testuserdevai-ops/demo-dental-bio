import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  if (!username) {
    return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .ilike('username', username)
    .single();
  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: 'Error checking username.' }, { status: 500 });
  }
  return NextResponse.json({ unique: !data });
} 