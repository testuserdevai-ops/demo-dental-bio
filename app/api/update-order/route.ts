import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserInfo } from '@/utils/userInfo';

// Whitelist of allowed table names to prevent table injection
const ALLOWED_TABLES = ['blogs', 'blog_groups', 'galleries', 'general_galleries', 'videos', 'groups', 'reviews', 'products'];

export async function POST(request: Request) {
  try {
    const supabase = createClient();

    // Verify authentication
    const userData = await getUserInfo({ supabase });
    if (!userData) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { table, datasToUpdate } = await request.json();

    // Validate table name against whitelist
    if (!table || !ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Invalid table name' }, { status: 400 });
    }

    // Perform updates for each item
    const updates = datasToUpdate.map(({ id, rank }: { id: string, rank: number }) =>
      supabase
        .from(table)
        .update({ rank })
        .eq('id', id)
    );

    // Execute all updates concurrently
    const results = await Promise.all(updates);

    // Check for errors in any of the updates
    const errors = results.filter(({ error }) => error);
    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'Some updates failed', details: errors },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: 'Ranks updated successfully' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
