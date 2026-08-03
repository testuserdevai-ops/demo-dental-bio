"use client";

import React, { useState, useEffect } from "react";
import {
  Download,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
} from "@phosphor-icons/react";
import ConfirmMessage from "@/app/components/Modal/ConfirmMessage";
import RoundedButton from "@/app/components/Button/RoundedButton";
import { apiClient } from "@/services/apiClient";

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
  periodStart: string | null;
  periodEnd: string | null;
  hostedInvoiceUrl: string | null;
  invoicePdf: string | null;
  description: string;
}

interface BillingHistoryProps {
  targetUserId?: string;
}

export default function BillingHistory() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [moreLoading, setMoreLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [nextCursor, setNextCursor] = useState<string>("");

  useEffect(() => {
    fetchBillingHistory();
  }, []);

  const fetchBillingHistory = async () => {
    try {
      if (nextCursor) {
        setMoreLoading(true);
      } else {
        setLoading(true);
      }
      const params = new URLSearchParams();
      params.append("starting_after", nextCursor);

      const data = await apiClient.get(
        `/api/subscription/billing-history?${params.toString()}`,
      );

      setHasMore(data.has_more);
      setNextCursor(data.next_cursor);

      if (nextCursor) {
        console.log([...invoices, ...data.invoices]);
        setInvoices((prev) => [...prev, ...data.invoices]);
      } else {
        setInvoices(data.invoices || []);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (nextCursor) {
        setMoreLoading(false);
      } else {
        setLoading(false);
      }
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

  const getStatusIcon = (status: string) => {
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

  const getStatusColor = (status: string) => {
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
    } catch (err: any) {
      setErrorMessage(err.message);
      setShowErrorMessage(true);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-1"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-[26px] p-4 sm:p-6 text-center">
        <p className="text-red-600 text-sm sm:text-base">{error}</p>
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <div className="bg-white rounded-[26px] p-4 sm:p-6 border border-neutral-200 text-center">
        <FileText size={48} className="mx-auto text-neutral-400 mb-4" />
        <p className="text-neutral-600 text-sm sm:text-base">
          No billing history found.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-[26px] border border-neutral-200 overflow-hidden">
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
                      <button
                        onClick={() => handleDownloadInvoice(invoice.id)}
                        className="flex items-center gap-1 sm:gap-2 text-primary-1 hover:text-deep-purple transition-colors font-semibold text-xs sm:text-sm"
                      >
                        <Download
                          size={16}
                          className="sm:w-[18px] sm:h-[18px]"
                        />
                        <span className="hidden sm:inline">Download</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Error Message */}
        <ConfirmMessage
          isOpen={showErrorMessage}
          onClose={() => setShowErrorMessage(false)}
          onOk={() => setShowErrorMessage(false)}
          title="Error"
          description={
            errorMessage || "An error occurred while downloading the invoice."
          }
          okText="OK"
          type="danger"
          hideCancelButton={true}
        />
      </div>

      <div className="w-full flex justify-center">
        <RoundedButton
          buttonType="outlined"
          onClick={fetchBillingHistory}
          isLoading={moreLoading}
          disabled={!hasMore}
        >
          Load More
        </RoundedButton>
      </div>
    </>
  );
}
