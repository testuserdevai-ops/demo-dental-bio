import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { generateUniqueSlug } from '@/utils/slugGenerator';
import { getUserInfo } from '@/utils/userInfo';
import { deleteFileFromSupabase } from '@/utils/removeFromBucket';
import { getMaxRank } from '@/utils/getMaxOrder';

export async function POST(request: Request) {
  const { title, content, meta_title, meta_description, image_url, slug, group_id, targetUserId } = await request.json();

  try {
    const supabase = createClient();

    const uniqueSlug = await generateUniqueSlug(supabase, slug);

    const userData = await getUserInfo({ supabase });

    if (!((userData.subscription_status === "PRO") || (userData.subscription_status === "PREMIUM PRO") || (new Date(userData.trial_end) > new Date())))
      return NextResponse.json({ error: "Please upgrade membership!" });

    if (targetUserId && userData.role !== "admin")
      return NextResponse.json({ error: "Not authorized" });

    const maxRank = await getMaxRank({ supabase, table: "blogs", field: "group_id", value: group_id }) + 1;

    const { data, error } = await supabase
      .from('blogs')
      .insert([{ title, content, meta_title, meta_description, image_url, group_id, rank: maxRank, slug: uniqueSlug }])
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const updated_data = await request.json();

  try {
    const supabase = createClient();

    // Verify ownership
    const userData = await getUserInfo({ supabase });
    if (!userData) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: existingBlog } = await supabase
      .from('blogs')
      .select('group_id, image_url')
      .eq('id', updated_data.id)
      .single();

    if (existingBlog) {
      const { data: group } = await supabase.from('blog_groups').select('user_id').eq('id', existingBlog.group_id).single();
      if (group && group.user_id !== userData.id && userData.role !== 'admin')
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const finalData = updated_data.slug ? { ...updated_data, slug: await generateUniqueSlug(supabase, updated_data.slug, updated_data.id) } : updated_data;

    if (updated_data?.image_url && existingBlog) {
      if (updated_data.image_url !== existingBlog.image_url && existingBlog.image_url?.length > 0)
        await deleteFileFromSupabase({ supabase, bucketName: 'blog-images', fileUrl: existingBlog.image_url });
    }

    const { data, error } = await supabase
      .from('blogs')
      .update(finalData)
      .eq('id', updated_data.id)
      .select('*')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { id } = await request.json();

  try {
    const supabase = createClient();

    // Verify ownership
    const userData = await getUserInfo({ supabase });
    if (!userData) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: blog } = await supabase
      .from('blogs')
      .select('image_url, group_id')
      .eq('id', id)
      .single();

    if (blog) {
      const { data: group } = await supabase.from('blog_groups').select('user_id').eq('id', blog.group_id).single();
      if (group && group.user_id !== userData.id && userData.role !== 'admin')
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

      if (blog.image_url)
        await deleteFileFromSupabase({ supabase, bucketName: 'blog-images', fileUrl: blog.image_url });
    }

    const { data, error } = await supabase
      .from('blogs')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
