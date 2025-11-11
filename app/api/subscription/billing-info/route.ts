import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Get billing information
export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");

    const userId = await getEffectiveUserId({ supabase, targetUserId: targetUserId || undefined });
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's customer_id
    const { data: user } = await supabase
      .from("users")
      .select("customer_id")
      .eq("id", userId)
      .single();

    if (!user?.customer_id) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Retrieve customer from Stripe
    const customer = await stripe.customers.retrieve(user.customer_id);

    if (typeof customer === 'deleted') {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    return NextResponse.json({
      email: customer.email,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      tax: customer.tax,
    });
  } catch (err: any) {
    console.error("Error fetching billing information:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Update billing information
export async function PUT(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    const body = await request.json();

    const userId = await getEffectiveUserId({ supabase, targetUserId: targetUserId || undefined });
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's customer_id
    const { data: user } = await supabase
      .from("users")
      .select("customer_id")
      .eq("id", userId)
      .single();

    if (!user?.customer_id) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Update customer in Stripe
    const updateData: Stripe.CustomerUpdateParams = {};

    if (body.name) updateData.name = body.name;
    if (body.email) updateData.email = body.email;
    if (body.phone) updateData.phone = body.phone;
    if (body.address) updateData.address = body.address;
    if (body.tax) updateData.tax = body.tax;

    await stripe.customers.update(user.customer_id, updateData);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error updating billing information:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

