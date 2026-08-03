import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// Simple in-memory rate limiter: max 5 clicks per IP per link per 60 seconds
const clickRateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string, linkId: string): boolean {
  const key = `${ip}:${linkId}`;
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
    const { linkId } = await request.json();

    if (!linkId) {
      return NextResponse.json({ error: 'Link ID is required' }, { status: 400 });
    }

    // Basic rate limiting by IP + linkId
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip, linkId)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const supabase = await createClient();

    // Atomic increment via RPC to prevent race conditions
    const { data: newCount, error } = await supabase.rpc('increment_click_counter', {
      table_name: 'links',
      row_id: linkId,
    });

    if (error) {
      return NextResponse.json({ error: 'Failed to update click counter' }, { status: 500 });
    }

    return NextResponse.json({ success: true, click_counter: newCount });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
