import { withAuth } from "@/lib/apiHandler";
import { apiResponse } from "@/lib/apiResponse";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export const dynamic = "force-dynamic";

export const GET = withAuth(async (request, { supabase }) => {
  const { searchParams } = new URL(request.url);
  const startingAfter = searchParams.get("starting_after") || undefined;

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

  // Fetch invoices from Stripe
  const invoices = await stripe.invoices.list({
    customer: user.customer_id,
    limit: 10,
    starting_after: startingAfter,
    expand: ["data.charge", "data.payment_intent"],
  });

  // Format invoices for frontend
  const formattedInvoices = invoices.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    amount: invoice.amount_paid,
    currency: invoice.currency,
    status: invoice.status,
    date: new Date(invoice.created * 1000).toISOString(),
    periodStart: invoice.period_start
      ? new Date(invoice.period_start * 1000).toISOString()
      : null,
    periodEnd: invoice.period_end
      ? new Date(invoice.period_end * 1000).toISOString()
      : null,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    description:
      invoice.description ||
      invoice.lines.data[0]?.description ||
      "Subscription",
  }));

  return apiResponse.success({
    invoices: formattedInvoices,
    has_more: invoices.has_more,
    next_cursor:
      invoices.data.length > 0
        ? invoices.data[invoices.data.length - 1].id
        : null,
  });
});
