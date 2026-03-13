import { NextResponse } from 'next/server';
import supabaseAdmin from '@/utils/supabase/supabaseAdmin';
import { createClient } from '@/utils/supabase/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

export async function POST(request: Request) {
  const { id } = await request.json();

  try {
    if (!id)
      return NextResponse.json({ error: "You are not authorized to this action!" }, { status: 400 });

    const supabase = createClient();

    // Verify the authenticated user is deleting their own account
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (user.id !== id) {
      return NextResponse.json({ error: "You can only delete your own account" }, { status: 403 });
    }

    const { data: customerData } = await supabase
      .from('users')
      .select('customer_id')
      .eq('id', id)
      .single();

    if (customerData?.customer_id) {
      stripe.customers.del(customerData.customer_id);
    }

    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}