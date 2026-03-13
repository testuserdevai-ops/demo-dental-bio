import { createClient } from "@/utils/supabase/server";
import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import type { NextRequest } from 'next/server';

// Whitelist of allowed storage buckets
const ALLOWED_BUCKETS = ['profile-pics', 'galleries', 'assets'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const formData = await req.formData();

    const file = formData.get('image') as File;
    const bucket_name = formData.get('bucket_name') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate bucket name
    if (!bucket_name || !ALLOWED_BUCKETS.includes(bucket_name)) {
      return NextResponse.json({ error: 'Invalid bucket name' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const fileName = `${uuidv4()}-${file.name}`;
    const { data, error } = await supabase.storage.from(bucket_name).upload(fileName, file);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate a public URL if needed
    const { publicUrl } = supabase.storage.from(bucket_name).getPublicUrl(fileName).data;

    return NextResponse.json({ publicUrl });
  } catch (error) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
