import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Get payment methods
export async function GET(request: Request) {
  try {
    const supabase = createClient();

    const userId = await getEffectiveUserId({ supabase });

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's customer_id
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("customer_id")
      .eq("id", userId)
      .single();

    if (userError || !user?.customer_id) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Fetch payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: user.customer_id,
      type: "card",
    });

    // Get customer to find default payment method
    const customer = await stripe.customers.retrieve(user.customer_id);

    // ✅ Proper check for deleted customers
    const defaultPaymentMethodId =
      !("deleted" in customer && customer.deleted) && customer.invoice_settings?.default_payment_method
        ? String(customer.invoice_settings.default_payment_method)
        : null;

    // Format payment methods for frontend
    const formattedPaymentMethods = paymentMethods.data
      .map((pm) => {
        if (pm.type === "card" && pm.card) {
          return {
            id: pm.id,
            type: pm.type,
            card: {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
            },
            isDefault: pm.id === defaultPaymentMethodId,
          };
        }
        return null;
      })
      .filter(Boolean);


    return NextResponse.json({ paymentMethods: formattedPaymentMethods });
  } catch (err: any) {
    console.error("Error fetching payment methods:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Remove payment method
export async function DELETE(request: Request) {
  try {
    const supabase = createClient();
    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json({ error: "Payment method ID required" }, { status: 400 });
    }

    const userId = await getEffectiveUserId({ supabase });

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

    // Verify the payment method belongs to this customer before detaching
    const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (pm.customer !== user.customer_id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    // Detach payment method from customer
    await stripe.paymentMethods.detach(paymentMethodId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error removing payment method:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Set default payment method
export async function POST(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    const { paymentMethodId } = await request.json();

    if (!paymentMethodId) {
      return NextResponse.json({ error: "Payment method ID required" }, { status: 400 });
    }

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

    // Attach payment method if not already attached
    try {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: user.customer_id,
      });
    } catch (err: any) {
      // Payment method might already be attached, that's okay
      if (!err.message.includes("already been attached")) {
        throw err;
      }
    }

    // Set as default
    await stripe.customers.update(user.customer_id, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error setting default payment method:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

