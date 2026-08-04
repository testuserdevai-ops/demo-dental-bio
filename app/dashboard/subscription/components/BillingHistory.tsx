"use client";

import React, { useState } from "react";
import {
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
} from "@phosphor-icons/react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { apiClient } from "@/services/apiClient";
import type {
  SubscriptionInvoice,
  SubscriptionOverview,
} from "@/lib/subscription/contracts";

export default function BillingHistory({
  initialPage,
}: {
  initialPage: SubscriptionOverview["billingHistory"];
}) {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>(
    initialPage.invoices,
  );
  const [moreLoading, setMoreLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(initialPage.error);
  const [downloadError, setDownloadError] = useState<string>("");
  const [hasMore, setHasMore] = useState<boolean>(initialPage.hasMore);
  const [nextCursor, setNextCursor] = useState<string | null>(
    initialPage.nextCursor,
  );

  const fetchBillingHistory = async () => {
    try {
      setMoreLoading(true);
      const params = new URLSearchParams();
      if (nextCursor) params.append("starting_after", nextCursor);

      const data = await apiClient.get(
        `/api/subscription/billing-history?${params.toString()}`,
      );

      setHasMore(data.has_more);
      setNextCursor(data.next_cursor);

      if (nextCursor) {
        setInvoices((prev) => [...prev, ...data.invoices]);
      } else {
        setInvoices(data.invoices || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setMoreLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusIcon = (status: string | null) => {
    switch (status) {
      case "paid":
        return (
          <CheckCircle size={20} className="text-green-500" weight="fill" />
        );
      case "open":
      case "draft":
        return <Clock size={20} className="text-yellow-500" weight="fill" />;
      case "void":
      case "uncollectible":
        return <XCircle size={20} className="text-red-500" weight="fill" />;
      default:
        return <FileText size={20} className="text-neutral-500" />;
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "paid":
        return "text-green-600 bg-green-50";
      case "open":
      case "draft":
        return "text-yellow-600 bg-yellow-50";
      case "void":
      case "uncollectible":
        return "text-red-600 bg-red-50";
      default:
        return "text-neutral-600 bg-neutral-50";
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const params = new URLSearchParams();
      params.append("invoiceId", invoiceId);

      const data = await apiClient.get(
        `/api/subscription/invoice?${params.toString()}`,
      );

      if (data.pdfUrl) {
        window.open(data.pdfUrl, "_blank");
      }
    } catch (reason) {
      setDownloadError(
        reason instanceof Error
          ? reason.message
          : "Invoice could not be opened",
      );
    }
  };

  if (error) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertTitle>Billing history could not be loaded</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="rounded-3xl border border-border bg-white p-6 text-center shadow-sm">
        <FileText size={48} className="mx-auto text-neutral-400 mb-4" />
        <p className="text-neutral-600 text-sm sm:text-base">
          No billing history found.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-dark">
                  Date
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-dark">
                  Description
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-dark">
                  Amount
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-dark">
                  Status
                </th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-dark">
                  Invoice
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {invoices.map((invoice) => (
                <tr
                  key={invoice.id}
                  className="hover:bg-neutral-50 transition-colors"
                >
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-700 whitespace-nowrap">
                    {formatDate(invoice.date)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-neutral-700">
                    <div>
                      <div className="font-medium text-dark break-words">
                        {invoice.description}
                      </div>
                      {invoice.periodStart && invoice.periodEnd && (
                        <div className="text-xs text-neutral-500 mt-1">
                          {formatDate(invoice.periodStart)} -{" "}
                          {formatDate(invoice.periodEnd)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-semibold text-dark whitespace-nowrap">
                    {formatCurrency(invoice.amount, invoice.currency)}
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    <div
                      className={`inline-flex items-center gap-2 px-2 sm:px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(invoice.status)}`}
                    >
                      {getStatusIcon(invoice.status)}
                      <span className="capitalize">{invoice.status}</span>
                    </div>
                  </td>
                  <td className="px-3 sm:px-6 py-3 sm:py-4">
                    {(invoice.invoicePdf || invoice.hostedInvoiceUrl) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        aria-label={`Open invoice from ${formatDate(invoice.date)}`}
                      >
                        <Download
                          size={16}
                          className="sm:w-[18px] sm:h-[18px]"
                        />
                        <span className="hidden sm:inline">Open</span>
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {downloadError && (
        <Alert variant="destructive" role="alert">
          <AlertTitle>Invoice could not be opened</AlertTitle>
          <AlertDescription>{downloadError}</AlertDescription>
        </Alert>
      )}

      <div className="w-full flex justify-center">
        <Button
          type="button"
          variant="outline"
          onClick={fetchBillingHistory}
          isPending={moreLoading}
          disabled={!hasMore}
        >
          Load More
        </Button>
      </div>
    </>
  );
}
