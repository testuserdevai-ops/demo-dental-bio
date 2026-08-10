"use client";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  CurrencyDollar,
  Users,
  TrendUp,
  ArrowCounterClockwise,
  CaretDown,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import { Field, FieldLabel } from "@/app/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";
import ReactPaginate from "react-paginate";
import type { DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface Payment {
  date: number;
  amount: number;
  currency: string;
  description: string;
  invoiceId?: string;
  type: "payment" | "refund";
}

interface PaidUser {
  customerId: string;
  email: string;
  name: string;
  totalPaid: number;
  totalRefunded: number;
  payments: Payment[];
}

interface IncomeData {
  totalIncome: number;
  totalRefunds: number;
  totalPaidUsers: number;
  paidUsers: PaidUser[];
  period: {
    startDate: string;
    endDate: string;
  };
  availableBalance: number;
}

function getDefaultDateRange(): DateRange {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(now.getDate() - 30);
  return { from: start, to: end };
}

const PaidUsersManagement: React.FC = () => {
  const router = useRouter();
  const [initialDateRange] = useState(getDefaultDateRange);
  const [incomeData, setIncomeData] = useState<IncomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(
    initialDateRange,
  );
  const [appliedDateRange, setAppliedDateRange] = useState<
    DateRange | undefined
  >(initialDateRange);
  const [loadError, setLoadError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showCalendar, setShowCalendar] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarTriggerRef = useRef<HTMLButtonElement>(null);
  const successfulDateRangeRef = useRef<DateRange | undefined>(
    initialDateRange,
  );

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
      const focusFrame = requestAnimationFrame(() => {
        calendarRef.current
          ?.querySelector<HTMLElement>("button:not([disabled]), select")
          ?.focus();
      });
      return () => {
        cancelAnimationFrame(focusFrame);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  useEffect(() => {
    const startDate = appliedDateRange?.from?.toISOString().split("T")[0];
    const endDate = appliedDateRange?.to?.toISOString().split("T")[0];
    if (!startDate || !endDate) return;

    let isCurrentRequest = true;
    queueMicrotask(() => {
      if (!isCurrentRequest) return;
      setIsLoading(true);
      setLoadError("");
      void (async () => {
        try {
          const params = new URLSearchParams({ startDate, endDate });
          const response = await fetch(`/api/admin/income?${params}`);
          const data = await response.json();

          if (!isCurrentRequest) return;
          if (response.ok) {
            setIncomeData(data);
            successfulDateRangeRef.current = appliedDateRange;
          } else {
            setDateRange(successfulDateRangeRef.current);
            setLoadError(data.error || "Unable to load income data.");
          }
        } catch {
          if (isCurrentRequest) {
            setDateRange(successfulDateRangeRef.current);
            setLoadError(
              "Unable to load income data. Check your connection and try again.",
            );
          }
        } finally {
          if (isCurrentRequest) setIsLoading(false);
        }
      })();
    });

    return () => {
      isCurrentRequest = false;
    };
  }, [appliedDateRange]);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range.to) {
      setAppliedDateRange(range);
      setPage(1);
      setShowCalendar(false);
      requestAnimationFrame(() => calendarTriggerRef.current?.focus());
    }
  };

  const formatCurrency = (amount: number, currency: string = "GBP") => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return formatDateAsDDMMYYYY(
      new Date(timestamp * 1000).toISOString().split("T")[0],
    );
  };

  const totalPages = incomeData
    ? Math.ceil(incomeData.paidUsers.length / limit)
    : 0;
  const paginatedUsers = incomeData
    ? incomeData.paidUsers.slice((page - 1) * limit, page * limit)
    : [];

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-8">
      <div>
        <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl font-bold">Paid Users & Income Insights</h1>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/admin")}
            className="shadow-sm"
          >
            <ArrowLeft aria-hidden="true" size={20} />
            Back to Admin
          </Button>
        </div>

        {/* Period Selection */}
        <div className="bg-white rounded-[26px] border border-gray-200 shadow-xl p-6 mb-6 relative">
          <div className="mb-4 flex items-center gap-2">
            <CalendarIcon
              aria-hidden="true"
              size={24}
              className="text-primary"
            />
            <h2 className="text-xl font-semibold">Select Period</h2>
          </div>
          <div className="relative">
            <Button
              ref={calendarTriggerRef}
              type="button"
              variant="outline"
              onClick={() => setShowCalendar((open) => !open)}
              aria-label="Select reporting period"
              aria-expanded={showCalendar}
              aria-controls="income-date-range-picker"
              onKeyDown={(event) => {
                if (event.key === "Escape" && showCalendar) {
                  event.preventDefault();
                  setShowCalendar(false);
                  requestAnimationFrame(() =>
                    calendarTriggerRef.current?.focus(),
                  );
                }
              }}
              className="h-auto w-full justify-start px-4 py-3 text-left font-normal"
            >
              {dateRange?.from && dateRange?.to ? (
                <span className="text-gray-700">
                  {formatDateAsDDMMYYYY(
                    dateRange.from.toISOString().split("T")[0],
                  )}{" "}
                  -{" "}
                  {formatDateAsDDMMYYYY(
                    dateRange.to.toISOString().split("T")[0],
                  )}
                </span>
              ) : dateRange?.from ? (
                <span className="text-gray-700">
                  {formatDateAsDDMMYYYY(
                    dateRange.from.toISOString().split("T")[0],
                  )}{" "}
                  - Select end date
                </span>
              ) : (
                <span className="text-gray-400">Select date range</span>
              )}
            </Button>
            {showCalendar && (
              <div
                ref={calendarRef}
                id="income-date-range-picker"
                role="dialog"
                aria-label="Choose reporting period"
                className="absolute z-50 mt-2 max-w-[calc(100vw-2rem)] overflow-x-auto rounded-[var(--radius-md)] border border-border bg-popover p-3 shadow-lg"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setShowCalendar(false);
                    requestAnimationFrame(() =>
                      calendarTriggerRef.current?.focus(),
                    );
                  }
                }}
              >
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  captionLayout="dropdown"
                  showOutsideDays
                />
              </div>
            )}
          </div>
        </div>

        {/* Income Summary Cards */}
        {incomeData && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div className="bg-white rounded-[26px] border border-gray-200 shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Income</p>
                  <p className="text-3xl font-bold text-primary-1">
                    {formatCurrency(incomeData.totalIncome)}
                  </p>
                </div>
                <div className="bg-primary-1/10 p-3 rounded-full">
                  <CurrencyDollar size={32} className="text-primary-1" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[26px] border border-gray-200 shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Refunds</p>
                  <p className="text-3xl font-bold text-red-600">
                    {formatCurrency(incomeData.totalRefunds || 0)}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <ArrowCounterClockwise size={32} className="text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[26px] border border-gray-200 shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Paid Users</p>
                  <p className="text-3xl font-bold text-green-600">
                    {incomeData.totalPaidUsers}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <Users size={32} className="text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-[26px] border border-gray-200 shadow-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">
                    Available Balance
                  </p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatCurrency(incomeData.availableBalance)}
                  </p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <TrendUp size={32} className="text-blue-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {loadError && (
          <Alert variant="destructive" role="alert" className="mb-6">
            <AlertTitle>Income data could not be refreshed</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </Alert>
        )}

        {/* Paid Users Table */}
        <div className="max-h-[58rem] overflow-hidden rounded-[26px] border border-gray-200 bg-white shadow-xl">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold">Paid Users</h2>
          </div>

          {isLoading ? (
            <div className="p-8 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-1"></div>
              <p className="mt-4 text-gray-600">Loading income data...</p>
            </div>
          ) : incomeData && incomeData.paidUsers.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">
                No paid users found for the selected period.
              </p>
            </div>
          ) : incomeData ? (
            <>
              <div className="max-h-[44rem] overflow-auto">
                <table className="w-full">
                  <thead className="bg-primary-1 text-white">
                    <tr>
                      <th
                        scope="col"
                        className="w-8 border-b px-4 py-3 text-left text-sm font-semibold"
                      >
                        <span className="sr-only">Payment history</span>
                      </th>
                      <th
                        scope="col"
                        className="border-b px-4 py-3 text-left text-sm font-semibold"
                      >
                        #
                      </th>
                      <th
                        scope="col"
                        className="border-b px-4 py-3 text-left text-sm font-semibold"
                      >
                        Name
                      </th>
                      <th
                        scope="col"
                        className="border-b px-4 py-3 text-left text-sm font-semibold"
                      >
                        Email
                      </th>
                      <th
                        scope="col"
                        className="border-b px-4 py-3 text-left text-sm font-semibold"
                      >
                        Total Paid
                      </th>
                      <th
                        scope="col"
                        className="border-b px-4 py-3 text-left text-sm font-semibold"
                      >
                        Total Refunded
                      </th>
                      <th
                        scope="col"
                        className="border-b px-4 py-3 text-left text-sm font-semibold"
                      >
                        Net Amount
                      </th>
                      <th
                        scope="col"
                        className="border-b px-4 py-3 text-left text-sm font-semibold"
                      >
                        Payments
                      </th>
                      <th
                        scope="col"
                        className="border-b px-4 py-3 text-left text-sm font-semibold"
                      >
                        Last Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedUsers.map((user, index) => {
                      const netAmount = user.totalPaid;
                      const totalRefunded = user.totalRefunded || 0;
                      const paymentCount = user.payments.filter(
                        (p) => p.type === "payment",
                      ).length;
                      const refundCount = user.payments.filter(
                        (p) => p.type === "refund",
                      ).length;
                      const isExpanded = expandedRows.has(user.customerId);
                      const sortedPayments = [...user.payments].sort(
                        (a, b) => b.date - a.date,
                      );

                      const toggleExpand = () => {
                        const newExpanded = new Set(expandedRows);
                        if (isExpanded) {
                          newExpanded.delete(user.customerId);
                        } else {
                          newExpanded.add(user.customerId);
                        }
                        setExpandedRows(newExpanded);
                      };

                      return (
                        <Fragment key={user.customerId}>
                          <tr className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {user.payments.length > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={toggleExpand}
                                  aria-label={`${isExpanded ? "Collapse" : "Expand"} payment history for ${user.name}`}
                                  aria-expanded={isExpanded}
                                  aria-controls={`payment-history-${user.customerId}`}
                                  className="size-9 text-gray-600 hover:text-primary"
                                >
                                  {isExpanded ? (
                                    <CaretDown size={20} />
                                  ) : (
                                    <CaretRight size={20} />
                                  )}
                                </Button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {(page - 1) * limit + index + 1}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">
                              {user.name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {user.email}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                              {formatCurrency(user.totalPaid + totalRefunded)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-red-600">
                              {totalRefunded > 0
                                ? formatCurrency(totalRefunded)
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold">
                              <span
                                className={
                                  netAmount >= 0
                                    ? "text-green-600"
                                    : "text-red-600"
                                }
                              >
                                {formatCurrency(netAmount)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex flex-col gap-1">
                                <span className="text-green-600">
                                  {paymentCount} payment
                                  {paymentCount !== 1 ? "s" : ""}
                                </span>
                                {refundCount > 0 && (
                                  <span className="text-red-600 text-xs">
                                    {refundCount} refund
                                    {refundCount !== 1 ? "s" : ""}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {user.payments.length > 0
                                ? formatDate(
                                    Math.max(
                                      ...user.payments.map((p) => p.date),
                                    ),
                                  )
                                : "-"}
                            </td>
                          </tr>
                          {isExpanded && sortedPayments.length > 0 && (
                            <tr>
                              <td
                                id={`payment-history-${user.customerId}`}
                                colSpan={9}
                                className="bg-gray-50 px-4 py-4"
                              >
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm mb-3">
                                    Payment & Refund History
                                  </h4>
                                  <div className="space-y-1">
                                    {sortedPayments.map((payment, pIndex) => (
                                      <div
                                        key={`${payment.date}-${pIndex}`}
                                        className={`flex items-center justify-between p-2 rounded-lg ${
                                          payment.type === "refund"
                                            ? "bg-red-50 border border-red-200"
                                            : "bg-green-50 border border-green-200"
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <span
                                            className={`text-xs font-medium ${
                                              payment.type === "refund"
                                                ? "text-red-600"
                                                : "text-green-600"
                                            }`}
                                          >
                                            {payment.type === "refund"
                                              ? "REFUND"
                                              : "PAYMENT"}
                                          </span>
                                          <span className="text-sm text-gray-700">
                                            {formatDate(payment.date)}
                                          </span>
                                          <span className="text-sm text-gray-600">
                                            {payment.description}
                                          </span>
                                          {payment.invoiceId && (
                                            <span className="text-xs text-gray-500">
                                              Invoice:{" "}
                                              {payment.invoiceId.substring(
                                                0,
                                                20,
                                              )}
                                              ...
                                            </span>
                                          )}
                                        </div>
                                        <span
                                          className={`font-semibold ${
                                            payment.type === "refund"
                                              ? "text-red-600"
                                              : "text-green-600"
                                          }`}
                                        >
                                          {payment.type === "refund"
                                            ? "-"
                                            : "+"}
                                          {formatCurrency(
                                            Math.abs(payment.amount),
                                            payment.currency,
                                          )}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col justify-between gap-4 border-t border-gray-200 p-4 sm:flex-row sm:items-end">
                <Field id="page-size" className="w-40">
                  <FieldLabel>Rows per page</FieldLabel>
                  <Select
                    value={String(limit)}
                    onValueChange={(value) => {
                      setLimit(Number(value));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 100].map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <ReactPaginate
                  previousLabel="Previous"
                  nextLabel="Next"
                  breakLabel="…"
                  pageCount={totalPages}
                  marginPagesDisplayed={1}
                  pageRangeDisplayed={3}
                  onPageChange={({ selected }) => {
                    setPage(selected + 1);
                  }}
                  forcePage={page - 1}
                  containerClassName="flex items-center gap-1"
                  pageClassName="rounded-md px-3 py-2 hover:bg-muted"
                  activeClassName="!bg-primary text-primary-foreground"
                  previousClassName="rounded-md px-3 py-2 hover:bg-muted"
                  nextClassName="rounded-md px-3 py-2 hover:bg-muted"
                  disabledClassName="pointer-events-none opacity-50"
                  breakClassName="px-3 py-2"
                />
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default PaidUsersManagement;
