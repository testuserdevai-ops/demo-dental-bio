import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getEffectiveUserId } from '@/utils/user/getEffectiveUserId';
import { getUserIdByEmail } from '@/utils/user/getUserIdByEmail';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';
import { getUserInfo } from '@/utils/userInfo';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
  const { targetUserId } = await request.json();

  try {
    const supabase = createClient();

    const userId = await getEffectiveUserId({ targetUserId, supabase });

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const body = await request.json();

  try {
    const supabase = createClient();

    const { targetUserId } = body;
    const userData = await getUserInfo({ supabase });

    if (userData.subscription_status !== "PREMIUM PRO")
      return NextResponse.json({ error: "Please upgrade membership!" });

    if (targetUserId && userData.role !== "admin")
      return NextResponse.json({ error: "You are not authorized to this action!" });

    const userId = targetUserId || userData.id;
    const use_dental_brand = body.use_dental_brand ?? true;

    const { data, error } = await supabase
      .from('users')
      .update({ use_dental_brand })
      .eq('id', userId)
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
  const { email } = await request.json();

  try {
    const supabase = createClient();

    const userData = await getUserInfo({ supabase });

    if (userData.role !== "admin")
      return NextResponse.json({ error: "You are not authorized to this action!" });

    const userId = await getUserIdByEmail(email);

    const { data: customerData } = await supabase
      .from('users')
      .select('customer_id')
      .eq('email', email)
      .single();

    if (customerData?.customer_id) {
      stripe.customers.del(customerData.customer_id);
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId!);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
