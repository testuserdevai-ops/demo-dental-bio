import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/utils/supabase/server";
import { getEffectiveUserId } from "@/utils/user/getEffectiveUserId";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

export async function GET(request: Request) {
  try {
    const supabase = createClient();
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get("userId");
    const invoiceId = searchParams.get("invoiceId");

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
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

    // Retrieve invoice from Stripe
    const invoice = await stripe.invoices.retrieve(invoiceId);

    // Verify invoice belongs to this customer
    if (invoice.customer !== user.customer_id) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Return invoice PDF URL
    if (invoice.invoice_pdf) {
      return NextResponse.json({ pdfUrl: invoice.invoice_pdf });
    }

    // If no PDF, return hosted invoice URL
    if (invoice.hosted_invoice_url) {
      return NextResponse.json({ pdfUrl: invoice.hosted_invoice_url });
    }

    return NextResponse.json({ error: "Invoice PDF not available" }, { status: 404 });
  } catch (err: any) {
    console.error("Error fetching invoice:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

