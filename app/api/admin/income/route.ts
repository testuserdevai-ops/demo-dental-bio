import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import stripe from "@/app/lib/stripe";

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Verify admin access
    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("email", authData.user.email)
      .single();

    if (userError || userData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Set default date range if not provided (last 30 days)
    const now = new Date();
    const defaultEndDate = new Date(now);
    const defaultStartDate = new Date(now);
    defaultStartDate.setDate(now.getDate() - 30);

    const startTimestamp = startDate
      ? Math.floor(new Date(startDate).getTime() / 1000)
      : Math.floor(defaultStartDate.getTime() / 1000);
    const endTimestamp = endDate
      ? Math.floor(new Date(endDate).getTime() / 1000)
      : Math.floor(defaultEndDate.getTime() / 1000);

    // Fetch all successful charges in the date range
    const charges = await stripe.charges.list({
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      limit: 100,
      expand: ["data.customer", "data.invoice"],
    });

    // Fetch all successful invoices in the date range
    const invoices = await stripe.invoices.list({
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      status: "paid",
      limit: 100,
      expand: ["data.customer", "data.subscription"],
    });

    // Process income data - use invoices as primary source to avoid double counting
    let totalIncome = 0;
    const paidUsersMap = new Map<string, {
      customerId: string;
      email: string;
      name: string;
      totalPaid: number;
      payments: Array<{
        date: number;
        amount: number;
        currency: string;
        description: string;
        invoiceId?: string;
      }>;
    }>();
    const processedInvoiceIds = new Set<string>();

    // Process invoices first (primary source for subscription payments)
    for (const invoice of invoices.data) {
      if (invoice.status === "paid" && invoice.amount_paid > 0) {
        const amount = invoice.amount_paid / 100; // Convert from cents
        totalIncome += amount;
        processedInvoiceIds.add(invoice.id);

        const customerId =
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id || "unknown";

        const customer =
          typeof invoice.customer === "object" ? invoice.customer : null;

        if (!paidUsersMap.has(customerId)) {
          const isDeleted = customer && "deleted" in customer && customer.deleted;
          const customerEmail = isDeleted ? "Unknown" : (customer && "email" in customer ? customer.email : null);
          const customerName = isDeleted ? "Unknown" : (customer && "name" in customer ? customer.name : null);
          
          paidUsersMap.set(customerId, {
            customerId,
            email: customerEmail || "Unknown",
            name: customerName || customerEmail || "Unknown",
            totalPaid: 0,
            payments: [],
          });
        }

        const userData = paidUsersMap.get(customerId)!;
        userData.totalPaid += amount;
        userData.payments.push({
          date: invoice.created,
          amount,
          currency: invoice.currency?.toUpperCase() || "USD",
          description: invoice.description || `Invoice ${invoice.number || invoice.id}`,
          invoiceId: invoice.id,
        });
      }
    }

    // Process charges that are not associated with invoices (one-time payments)
    for (const charge of charges.data) {
      if (charge.status === "succeeded" && charge.paid) {
        const invoiceId =
          typeof charge.invoice === "string"
            ? charge.invoice
            : charge.invoice?.id;

        // Skip if this charge is already counted via an invoice
        if (invoiceId && processedInvoiceIds.has(invoiceId)) {
          continue;
        }

        const amount = charge.amount / 100; // Convert from cents
        totalIncome += amount;

        const customerId =
          typeof charge.customer === "string"
            ? charge.customer
            : charge.customer?.id || "unknown";

        const customer =
          typeof charge.customer === "object" ? charge.customer : null;

        if (!paidUsersMap.has(customerId)) {
          const isDeleted = customer && "deleted" in customer && customer.deleted;
          const customerEmail = isDeleted ? "Unknown" : (customer && "email" in customer ? customer.email : null);
          const customerName = isDeleted ? "Unknown" : (customer && "name" in customer ? customer.name : null);
          
          paidUsersMap.set(customerId, {
            customerId,
            email: customerEmail || "Unknown",
            name: customerName || customerEmail || "Unknown",
            totalPaid: 0,
            payments: [],
          });
        }

        const userData = paidUsersMap.get(customerId)!;
        userData.totalPaid += amount;
        userData.payments.push({
          date: charge.created,
          amount,
          currency: charge.currency.toUpperCase(),
          description: charge.description || "Payment",
          invoiceId,
        });
      }
    }

    // Convert map to array and sort by total paid
    const paidUsers = Array.from(paidUsersMap.values()).sort(
      (a, b) => b.totalPaid - a.totalPaid
    );

    // Get total count of unique paid users
    const totalPaidUsers = paidUsers.length;

    // Fetch additional stats from Stripe
    const balance = await stripe.balance.retrieve();
    const availableBalance = balance.available[0]?.amount
      ? balance.available[0].amount / 100
      : 0;

    return NextResponse.json({
      totalIncome,
      totalPaidUsers,
      paidUsers,
      period: {
        startDate: startDate || defaultStartDate.toISOString().split("T")[0],
        endDate: endDate || defaultEndDate.toISOString().split("T")[0],
      },
      availableBalance,
    });
  } catch (error: any) {
    console.error("Error fetching income data:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch income data" },
      { status: 500 }
    );
  }
}

