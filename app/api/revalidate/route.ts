import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  // Require authentication to prevent cache-busting DoS
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const body = await req.json();
  const path = body.path;

  if (path) {
    revalidatePath(path);
    return NextResponse.json({ revalidated: true });
  }

  return NextResponse.json({ revalidated: false });
}
