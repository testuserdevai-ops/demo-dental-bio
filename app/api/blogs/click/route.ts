import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Simple in-memory rate limiter: max 5 clicks per IP per blog per 60 seconds
const clickRateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string, blogId: string): boolean {
  const key = `${ip}:${blogId}`;
  const now = Date.now();
  const entry = clickRateMap.get(key);

  if (!entry || now > entry.resetAt) {
    clickRateMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return true;
  }
  return false;
}

export async function POST(request: Request) {
  try {
    const { blogId } = await request.json();

    if (!blogId) {
      return NextResponse.json({ error: 'Blog ID is required' }, { status: 400 });
    }

    // Basic rate limiting by IP + blogId
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip, blogId)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

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
