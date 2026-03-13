import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// Get payment methods
export const GET = withAuth(async (request, { supabase }) => {
  const userId = await getEffectiveUserId({ supabase });

  if (!userId) {
    return apiResponse.unauthorized();
  }

  // Get user's customer_id
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("customer_id")
    .eq("id", userId)
    .single();

  if (userError || !user?.customer_id) {
    return apiResponse.error("Customer not found", 404);
  }

  // Fetch payment methods from Stripe
  const paymentMethods = await stripe.paymentMethods.list({
    customer: user.customer_id,
    type: "card",
  });

  // Get customer to find default payment method
  const customer = await stripe.customers.retrieve(user.customer_id);

  // Proper check for deleted customers
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

  return apiResponse.success({ paymentMethods: formattedPaymentMethods });
});

// Remove payment method
export const DELETE = withAuth(async (request, { supabase }) => {
  const { paymentMethodId } = await request.json();

  if (!paymentMethodId) {
    return apiResponse.badRequest("Payment method ID required");
  }

  const userId = await getEffectiveUserId({ supabase });

  if (!userId) {
    return apiResponse.unauthorized();
  }

  // Get user's customer_id
  const { data: user } = await supabase
    .from("users")
    .select("customer_id")
    .eq("id", userId)
    .single();

  if (!user?.customer_id) {
    return apiResponse.error("Customer not found", 404);
  }

  // Verify the payment method belongs to this customer before detaching
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== user.customer_id) {
    return apiResponse.forbidden();
  }

  // Detach payment method from customer
  await stripe.paymentMethods.detach(paymentMethodId);

  return apiResponse.success({ success: true });
});

// Set default payment method
export const POST = withAuth(async (request, { supabase }) => {
  const { searchParams } = new URL(request.url);
  const targetUserId = searchParams.get("userId");
  const { paymentMethodId } = await request.json();

  if (!paymentMethodId) {
    return apiResponse.badRequest("Payment method ID required");
  }

  const userId = await getEffectiveUserId({ supabase, targetUserId: targetUserId || undefined });

  if (!userId) {
    return apiResponse.unauthorized();
  }

  // Get user's customer_id
  const { data: user } = await supabase
    .from("users")
    .select("customer_id")
    .eq("id", userId)
    .single();

  if (!user?.customer_id) {
    return apiResponse.error("Customer not found", 404);
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

  return apiResponse.success({ success: true });
});
