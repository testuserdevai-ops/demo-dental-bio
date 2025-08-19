import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { linkId } = await request.json();
    
    if (!linkId) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get current click counter
    const { data: currentLink, error: fetchError } = await supabase
      .from('links')
      .select('click_counter')
      .eq('link_id', linkId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Link not found' }, { status: 404 });
    }

    // Increment click counter
    const newClickCounter = (currentLink.click_counter || 0) + 1;

    const { error: updateError } = await supabase
      .from('links')
      .update({ click_counter: newClickCounter })
      .eq('link_id', linkId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update click counter' }, { status: 500 });
    }

    return NextResponse.json({ success: true, click_counter: newClickCounter });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
} 