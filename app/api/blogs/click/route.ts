import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { blogId } = await request.json();
    
    if (!blogId) {
      return NextResponse.json({ error: 'Blog ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get current click counter
    const { data: currentBlog, error: fetchError } = await supabase
      .from('blogs')
      .select('click_counter')
      .eq('id', blogId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Blog not found' }, { status: 404 });
    }

    // Increment click counter
    const newClickCounter = (currentBlog.click_counter || 0) + 1;

    const { error: updateError } = await supabase
      .from('blogs')
      .update({ click_counter: newClickCounter })
      .eq('id', blogId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update click counter' }, { status: 500 });
    }

    return NextResponse.json({ success: true, click_counter: newClickCounter });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 