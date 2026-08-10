import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

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

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const linkId = isRecord(body) ? body.linkId : undefined;

    if (!isUuid(linkId)) {
      return NextResponse.json(
        { error: "A valid link ID is required" },
        { status: 400 },
      );
    }

    // Basic rate limiting by IP + linkId
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    if (isRateLimited(ip, linkId)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const supabase = await createClient();

    // Only public, active links that remain connected to a profile can count.
    // This prevents direct POSTs from incrementing orphaned or private records.
    const { data: publicLink, error: publicLinkError } = await supabase
      .from("links")
      .select(
        "link_id, dentistry_links!inner(link_groups!inner(dentistries!inner(user_id, users!inner(id))))",
      )
      .eq("link_id", linkId)
      .eq("is_active", true)
      .maybeSingle();

    if (publicLinkError || !publicLink) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Atomic increment via RPC to prevent race conditions
    const { data: newCount, error } = await supabase.rpc(
      "increment_click_counter",
      {
        table_name: "links",
        // The deployed function uses bigint in its generated signature even
        // though links are keyed by UUID. Keep the UUID boundary explicit
        // until generated database types catch up with that schema.
        row_id: linkId as never,
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
