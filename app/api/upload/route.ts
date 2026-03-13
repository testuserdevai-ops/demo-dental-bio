import { v4 as uuidv4 } from 'uuid';
import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';
import type { NextRequest } from 'next/server';

// Whitelist of allowed storage buckets
const ALLOWED_BUCKETS = ['profile-pics', 'galleries', 'assets'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

export const POST = withAuth(async (req, { supabase }) => {
  const formData = await req.formData();

  const file = formData.get('image') as File;
  const bucket_name = formData.get('bucket_name') as string;

  if (!file) {
    return apiResponse.badRequest('No file provided');
  }

  // Validate bucket name
  if (!bucket_name || !ALLOWED_BUCKETS.includes(bucket_name)) {
    return apiResponse.badRequest('Invalid bucket name');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return apiResponse.badRequest('File too large (max 10MB)');
  }

  // Validate file type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return apiResponse.badRequest('Invalid file type');
  }

  const fileName = `${uuidv4()}-${file.name}`;
  const { data, error } = await supabase.storage.from(bucket_name).upload(fileName, file);

  if (error) {
    return apiResponse.error(error.message, 500);
  }

  // Generate a public URL if needed
  const { publicUrl } = supabase.storage.from(bucket_name).getPublicUrl(fileName).data;

  return apiResponse.success({ publicUrl });
});
