import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserInfo } from '@/utils/userInfo';
import { getMaxRank } from '@/utils/getMaxOrder';
import { deleteFileFromSupabase } from '@/utils/removeFromBucket';

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const providedUserId = searchParams.get('userId');
    // Always try to get authenticated user for admin verification
    let userData: any = null;
    try { userData = await getUserInfo({ supabase }); } catch {}
    const userId = providedUserId || userData?.id;
    // Show disabled items only for own data or if authenticated admin
    const isVerifiedAdmin = userData?.role === 'admin';
    const enabledField = (!providedUserId || isVerifiedAdmin) ? [true, false] : [true];
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('general_galleries')
      .select('*')
      .eq('user_id', userId)
      .in('enabled', enabledField)
      .order('rank', { ascending: true });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { title, general_image_url, targetUserId } = await request.json();
  try {
    const supabase = createClient();
    const userData = await getUserInfo({ supabase });
    if (!((userData.subscription_status === "PRO") || (userData.subscription_status === "PREMIUM PRO") || (new Date(userData.trial_end) > new Date())))
      return NextResponse.json({ error: "Please upgrade membership!" });
    if (targetUserId && userData.role !== "admin")
      return NextResponse.json({ error: "Not authorized" });
    const maxRank = await getMaxRank({ supabase, table: "general_galleries", field: "user_id", value: targetUserId || userData.id }) + 1;
    const { data, error } = await supabase
      .from('general_galleries')
      .insert([{ title, image_url: general_image_url, user_id: targetUserId || userData.id, rank: maxRank }])
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
    const userData = await getUserInfo({ supabase });
    if (!userData) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: gallery } = await supabase
      .from('general_galleries')
      .select('*')
      .eq('id', updated_data.id)
      .single();

    if (gallery && gallery.user_id !== userData.id && userData.role !== 'admin')
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    if (gallery && updated_data.image_url && updated_data.image_url !== gallery.image_url) {
      await deleteFileFromSupabase({ supabase, bucketName: 'gallery-images', fileUrl: gallery.image_url });
    }

    const { data, error } = await supabase
      .from('general_galleries')
      .update({ title: updated_data.title, image_url: updated_data.image_url, rank: updated_data.rank })
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
    const userData = await getUserInfo({ supabase });
    if (!userData) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const { data: gallery } = await supabase
      .from('general_galleries')
      .select('image_url, user_id')
      .eq('id', id)
      .single();

    if (gallery && gallery.user_id !== userData.id && userData.role !== 'admin')
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });

    if (gallery && gallery.image_url) {
      await deleteFileFromSupabase({ supabase, bucketName: 'gallery-images', fileUrl: gallery.image_url });
    }

    const { data, error } = await supabase
      .from('general_galleries')
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
