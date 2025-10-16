import { NextResponse } from 'next/server';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';

export async function POST(request: Request) {
  const { id } = await request.json();

  try {
    if (!id)
      return NextResponse.json({ error: "You are not authorized to this action!" });

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}