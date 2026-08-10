import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

// Simple in-memory rate limiter: max 5 clicks per IP per blog per 60 seconds
const clickRateMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

function isRateLimited(ip: string, blogId: number): boolean {
  const key = `${ip}:${String(blogId)}`;
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

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const blogId = isRecord(body) ? body.blogId : undefined;

    if (!isPositiveInteger(blogId)) {
      return NextResponse.json(
        { error: "A valid blog ID is required" },
        { status: 400 },
      );
    }

    // Basic rate limiting by IP + blogId
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (isRateLimited(ip, blogId)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();

    // A blog is public only while both it and its owning group are enabled and
    // the group still belongs to a profile.
    const { data: publicBlog, error: publicBlogError } = await supabase
      .from("blogs")
      .select("id, blog_groups!inner(user_id, users!inner(id))")
      .eq("id", blogId)
      .eq("enabled", true)
      .eq("blog_groups.enabled", true)
      .not("blog_groups.user_id", "is", null)
      .maybeSingle();

    if (publicBlogError || !publicBlog) {
      return NextResponse.json({ error: "Blog not found" }, { status: 404 });
    }

    // Atomic increment via RPC to prevent race conditions
    const { data: newCount, error } = await supabase.rpc(
      "increment_click_counter",
      {
        table_name: "blogs",
        row_id: blogId,
      },
    );

    if (error) {
      return NextResponse.json(
        { error: "Failed to update click counter" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, click_counter: newCount });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
