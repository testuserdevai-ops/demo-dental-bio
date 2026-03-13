import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { blogId } = await request.json();

    if (!blogId) {
      return NextResponse.json({ error: 'Blog ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Atomic increment via RPC to prevent race conditions
    const { data: newCount, error } = await supabase.rpc('increment_click_counter', {
      table_name: 'blogs',
      row_id: blogId,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to update click counter' }, { status: 500 });
    }

    return NextResponse.json({ success: true, click_counter: newCount });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
