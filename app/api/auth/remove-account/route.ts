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
      return NextResponse.json({ error: "You are not authorized to this action!" });

    const supabase = createClient();

    const { data: customerData } = await supabase
      .from('users')
      .select('customer_id')
      .eq('id', id)
      .single();

    if (customerData?.customer_id) {
      stripe.customers.del(customerData.customer_id);
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    return NextResponse.json({ status: 'success' });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}