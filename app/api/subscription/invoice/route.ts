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
  const invoiceId = searchParams.get("invoiceId");

  if (!invoiceId) {
    return apiResponse.badRequest("Invoice ID required");
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

  // Retrieve invoice from Stripe
  const invoice = await stripe.invoices.retrieve(invoiceId);

  // Verify invoice belongs to this customer
  if (invoice.customer !== user.customer_id) {
    return apiResponse.error("Invoice not found", 404);
  }

  // Return invoice PDF URL
  if (invoice.invoice_pdf) {
    return apiResponse.success({ pdfUrl: invoice.invoice_pdf });
  }

  // If no PDF, return hosted invoice URL
  if (invoice.hosted_invoice_url) {
    return apiResponse.success({ pdfUrl: invoice.hosted_invoice_url });
  }

  return apiResponse.error("Invoice PDF not available", 404);
});
