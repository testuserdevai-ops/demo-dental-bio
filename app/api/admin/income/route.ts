import stripe from "@/app/lib/stripe";
import { withAuth } from '@/lib/apiHandler';
import { apiResponse } from '@/lib/apiResponse';

// Force dynamic rendering since this route uses cookies for authentication
export const dynamic = 'force-dynamic';

export const GET = withAuth(async (request, { supabase, user }) => {
    if (user.role !== 'admin') {
      return apiResponse.forbidden();
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

    // Fetch all refunds in the date range
    const refunds = await stripe.refunds.list({
      created: {
        gte: startTimestamp,
        lte: endTimestamp,
      },
      limit: 100,
      expand: ["data.charge", "data.charge.customer"],
    });

    // Process income data - use invoices as primary source to avoid double counting
    let totalIncome = 0;
    let totalRefunds = 0;
    const paidUsersMap = new Map<string, {
      customerId: string;
      email: string;
      name: string;
      totalPaid: number;
      totalRefunded: number;
      payments: Array<{
        date: number;
        amount: number;
        currency: string;
        description: string;
        invoiceId?: string;
        type: "payment" | "refund";
      }>;
    }>();
    const processedInvoiceIds = new Set<string>();
    const chargeToCustomerMap = new Map<string, string>(); // Map charge ID to customer ID

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
            totalRefunded: 0,
            payments: [],
          });
        }

        // Track charge ID for refund matching
        const chargeId = typeof invoice.charge === "string" ? invoice.charge : invoice.charge?.id;
        if (chargeId) {
          chargeToCustomerMap.set(chargeId, customerId);
        }

        const userData = paidUsersMap.get(customerId)!;
        userData.totalPaid += amount;
        userData.payments.push({
          date: invoice.created,
          amount,
          currency: invoice.currency?.toUpperCase() || "USD",
          description: invoice.description || `Invoice ${invoice.number || invoice.id}`,
          invoiceId: invoice.id,
          type: "payment",
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
            totalRefunded: 0,
            payments: [],
          });
        }

        // Track charge ID for refund matching
        chargeToCustomerMap.set(charge.id, customerId);

        const userData = paidUsersMap.get(customerId)!;
        userData.totalPaid += amount;
        userData.payments.push({
          date: charge.created,
          amount,
          currency: charge.currency.toUpperCase(),
          description: charge.description || "Payment",
          invoiceId,
          type: "payment",
        });
      }
    }

    // Process refunds
    for (const refund of refunds.data) {
      if (refund.status === "succeeded" || refund.status === "pending") {
        const refundAmount = refund.amount / 100; // Convert from cents
        totalRefunds += refundAmount;
        totalIncome -= refundAmount; // Subtract refund from total income

        // Get the charge associated with this refund
        const chargeId = typeof refund.charge === "string" ? refund.charge : refund.charge?.id;

        if (chargeId && chargeToCustomerMap.has(chargeId)) {
          const customerId = chargeToCustomerMap.get(chargeId)!;
          const userData = paidUsersMap.get(customerId);

          if (userData) {
            userData.totalRefunded += refundAmount;
            userData.totalPaid -= refundAmount; // Subtract refund from user's total paid
            userData.payments.push({
              date: refund.created,
              amount: -refundAmount, // Negative amount to indicate refund
              currency: refund.currency.toUpperCase(),
              description: refund.reason || refund.description || "Refund",
              invoiceId: undefined,
              type: "refund",
            });
          }
        } else {
          // Refund for a charge we don't have in our date range - still count it
          // Try to get customer from the charge if available
          if (refund.charge && typeof refund.charge === "object") {
            const charge = refund.charge;
            const customerId = typeof charge.customer === "string"
              ? charge.customer
              : charge.customer?.id || "unknown";

            const customer = typeof charge.customer === "object" ? charge.customer : null;

            if (!paidUsersMap.has(customerId)) {
              const isDeleted = customer && "deleted" in customer && customer.deleted;
              const customerEmail = isDeleted ? "Unknown" : (customer && "email" in customer ? customer.email : null);
              const customerName = isDeleted ? "Unknown" : (customer && "name" in customer ? customer.name : null);

              paidUsersMap.set(customerId, {
                customerId,
                email: customerEmail || "Unknown",
                name: customerName || customerEmail || "Unknown",
                totalPaid: 0,
                totalRefunded: 0,
                payments: [],
              });
            }

            const userData = paidUsersMap.get(customerId)!;
            userData.totalRefunded += refundAmount;
            userData.payments.push({
              date: refund.created,
              amount: -refundAmount,
              currency: refund.currency.toUpperCase(),
              description: refund.reason || refund.description || "Refund",
              invoiceId: undefined,
              type: "refund",
            });
          }
        }
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

    return apiResponse.success({
      totalIncome,
      totalRefunds,
      totalPaidUsers,
      paidUsers,
      period: {
        startDate: startDate || defaultStartDate.toISOString().split("T")[0],
        endDate: endDate || defaultEndDate.toISOString().split("T")[0],
      },
      availableBalance,
    });
});
