import { NextResponse } from "next/server";
import { usernameSchema } from "@/lib/auth/schemas";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = usernameSchema.safeParse(searchParams.get("username"));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a valid username." },
      { status: 400 },
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("username", parsed.data)
    .maybeSingle();
  if (error && error.code !== "PGRST116") {
    return NextResponse.json(
      { error: "Error checking username." },
      { status: 500 },
    );
  }
  return NextResponse.json({ unique: !data });
}
