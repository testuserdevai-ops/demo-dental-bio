"use client";

import {
  ArrowCounterClockwise,
  ArrowLeft,
  Calendar as CalendarIcon,
  CaretDown,
  CaretRight,
  CurrencyDollar,
  DownloadSimple,
  MagnifyingGlass,
  TrendUp,
  Users,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import ReactPaginate from "react-paginate";
import type { DateRange } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Calendar } from "@/app/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Field, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { AdminIconTooltip } from "../../_components/AdminIconTooltip";
import {
  createBillingCsv,
  createBillingCsvFilename,
  filterAndSortBillingUsers,
  getGrossPaid,
  getLastPayment,
  getPaymentCount,
  MAX_BILLING_SEARCH_LENGTH,
  normalizeBillingSearch,
  type BillingPayment,
  type BillingSort,
  type BillingSortDirection,
  type BillingSortKey,
  type BillingUser,
} from "../_lib/billing-results";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";

interface IncomeData {
  totalIncome: number;
  totalRefunds: number;
  totalPaidUsers: number;
  paidUsers: BillingUser[];
  period: { startDate: string; endDate: string };
  availableBalance: number;
}

const SORT_LABELS: Record<BillingSortKey, string> = {
  name: "Name",
  totalPaid: "Total paid",
  totalRefunded: "Total refunded",
  netAmount: "Net amount",
  paymentCount: "Payment count",
  lastPayment: "Last payment",
};

function getDefaultDateRange(): DateRange {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(now.getDate() - 30);
  return { from: start, to: end };
}

function formatCurrency(amount: number, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    amount,
  );
}

function formatTimestamp(timestamp: number) {
  return formatDateAsDDMMYYYY(
    new Date(timestamp * 1000).toISOString().split("T")[0],
  );
}

function SummaryCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4 pt-6">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold sm:text-3xl">{value}</p>
        </div>
        <div
          className="rounded-full bg-primary/10 p-3 text-primary"
          aria-hidden
        >
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}

function PaymentHistory({
  customerId,
  payments,
}: {
  customerId: string;
  payments: BillingPayment[];
}) {
  const sortedPayments = [...payments].sort((a, b) => b.date - a.date);
  return (
    <TableRow>
      <TableCell
        id={`payment-history-${customerId}`}
        colSpan={9}
        className="bg-muted/40 p-4"
      >
        <h3 className="mb-3 text-sm font-semibold">Payment & Refund History</h3>
        <div className="space-y-2">
          {sortedPayments.map((payment, index) => (
            <div
              key={`${payment.date}-${payment.type}-${index}`}
              className="flex flex-col justify-between gap-2 rounded-[var(--radius-md)] border bg-background p-3 sm:flex-row sm:items-center"
            >
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge
                  variant={
                    payment.type === "refund" ? "destructive" : "default"
                  }
                >
                  {payment.type === "refund" ? "Refund" : "Payment"}
                </Badge>
                <span>{formatTimestamp(payment.date)}</span>
                <span className="text-muted-foreground">
                  {payment.description}
                </span>
                {payment.invoiceId && (
                  <span className="font-mono text-xs text-muted-foreground">
                    Invoice: {payment.invoiceId}
                  </span>
                )}
              </div>
              <span className="font-semibold tabular-nums">
                {payment.type === "refund" ? "−" : "+"}
                {formatCurrency(Math.abs(payment.amount), payment.currency)}
              </span>
            </div>
          ))}
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function PaidUsersManagement() {
  // This is an authorized admin workspace, so its controls are intentionally
  // excluded from owner-profile conversion analytics.
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
  const [retryCount, setRetryCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<BillingSort>({
    key: "totalPaid",
    direction: "desc",
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const calendarRef = useRef<HTMLDivElement>(null);
  const calendarTriggerRef = useRef<HTMLButtonElement>(null);
  const successfulDateRangeRef = useRef<DateRange | undefined>(
    initialDateRange,
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        calendarRef.current &&
        !calendarRef.current.contains(event.target as Node)
      ) {
        setShowCalendar(false);
      }
    };
    if (!showCalendar) return;
    document.addEventListener("mousedown", handleClickOutside);
    const focusTimer = window.setTimeout(() => {
      calendarRef.current
        ?.querySelector<HTMLElement>("button:not([disabled]), select")
        ?.focus();
    }, 0);
    return () => {
      window.clearTimeout(focusTimer);
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
  }, [appliedDateRange, retryCount]);

  const visibleUsers = useMemo(
    () => filterAndSortBillingUsers(incomeData?.paidUsers ?? [], search, sort),
    [incomeData?.paidUsers, search, sort],
  );
  const totalPages = Math.ceil(visibleUsers.length / limit);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const paginatedUsers = visibleUsers.slice(
    (currentPage - 1) * limit,
    currentPage * limit,
  );

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    if (range?.from && range.to) {
      setAppliedDateRange(range);
      setPage(1);
      setShowCalendar(false);
      calendarTriggerRef.current?.focus();
    }
  };

  const closeCalendar = () => {
    setShowCalendar(false);
    calendarTriggerRef.current?.focus();
  };

  const exportCsv = () => {
    if (!incomeData || isLoading || loadError || visibleUsers.length === 0)
      return;
    const blob = new Blob([createBillingCsv(visibleUsers)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = createBillingCsvFilename(
      incomeData.period.startDate,
      incomeData.period.endDate,
    );
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const activePeriod = incomeData
    ? `${formatDateAsDDMMYYYY(incomeData.period.startDate)} – ${formatDateAsDDMMYYYY(incomeData.period.endDate)}`
    : "Not available";

  return (
    <div className="mx-auto max-w-[1400px] p-4 sm:p-8">
      <div className="mb-6 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Paid Users & Income Insights</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Reconcile provider-derived billing activity for a selected period.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin")}
        >
          <ArrowLeft aria-hidden size={20} />
          Back to Admin
        </Button>
      </div>

      <Card className="relative mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon aria-hidden size={22} /> Select Period
          </CardTitle>
          <CardDescription>
            Loading a period replaces the authorized provider result below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            ref={calendarTriggerRef}
            type="button"
            variant="outline"
            onClick={() => setShowCalendar((open) => !open)}
            aria-label="Select reporting period"
            aria-expanded={showCalendar}
            aria-controls="income-date-range-picker"
            className="h-auto w-full justify-start px-4 py-3 text-left font-normal"
          >
            {dateRange?.from && dateRange?.to
              ? `${formatDateAsDDMMYYYY(dateRange.from.toISOString().split("T")[0])} – ${formatDateAsDDMMYYYY(dateRange.to.toISOString().split("T")[0])}`
              : dateRange?.from
                ? `${formatDateAsDDMMYYYY(dateRange.from.toISOString().split("T")[0])} – Select end date`
                : "Select date range"}
          </Button>
          {showCalendar && (
            <div
              ref={calendarRef}
              id="income-date-range-picker"
              role="dialog"
              aria-label="Choose reporting period"
              className="absolute z-50 mt-2 max-w-[calc(100vw-2rem)] overflow-x-auto rounded-[var(--radius-md)] border bg-popover p-3 shadow-lg"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  closeCalendar();
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
        </CardContent>
      </Card>

      {incomeData && !isLoading && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="Total Income"
            value={formatCurrency(incomeData.totalIncome)}
            icon={<CurrencyDollar size={28} />}
          />
          <SummaryCard
            label="Total Refunds"
            value={formatCurrency(incomeData.totalRefunds || 0)}
            icon={<ArrowCounterClockwise size={28} />}
          />
          <SummaryCard
            label="Paid Users"
            value={incomeData.totalPaidUsers}
            icon={<Users size={28} />}
          />
          <SummaryCard
            label="Available Balance"
            value={formatCurrency(incomeData.availableBalance)}
            icon={<TrendUp size={28} />}
          />
        </div>
      )}

      {loadError && (
        <Alert variant="destructive" role="alert" className="mb-6">
          <AlertTitle>Income data could not be refreshed</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span>{loadError}</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setRetryCount((count) => count + 1)}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Paid Users</CardTitle>
          <CardDescription>
            Search, order, inspect, and export the currently loaded results.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(16rem,1fr)_13rem_10rem_auto] lg:items-end">
            <Field id="billing-search">
              <FieldLabel>Search billing results</FieldLabel>
              <div className="relative">
                <MagnifyingGlass
                  aria-hidden
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  size={18}
                />
                <Input
                  value={search}
                  onChange={(event) => {
                    setSearch(normalizeBillingSearch(event.target.value));
                    setPage(1);
                  }}
                  maxLength={MAX_BILLING_SEARCH_LENGTH}
                  placeholder="Name, email, or customer ID"
                  className="pl-10 pr-10"
                />
                {search && (
                  <AdminIconTooltip label="Clear search">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Clear billing search"
                      onClick={() => {
                        setSearch("");
                        setPage(1);
                      }}
                      className="absolute right-1 top-1/2 size-9 -translate-y-1/2"
                    >
                      <X aria-hidden size={18} />
                    </Button>
                  </AdminIconTooltip>
                )}
              </div>
            </Field>
            <Field id="billing-sort-field">
              <FieldLabel>Sort by</FieldLabel>
              <Select
                value={sort.key}
                onValueChange={(key) => {
                  setSort((current) => ({
                    ...current,
                    key: key as BillingSortKey,
                  }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="billing-sort-direction">
              <FieldLabel>Direction</FieldLabel>
              <Select
                value={sort.direction}
                onValueChange={(direction) => {
                  setSort((current) => ({
                    ...current,
                    direction: direction as BillingSortDirection,
                  }));
                  setPage(1);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Ascending</SelectItem>
                  <SelectItem value="desc">Descending</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Button
              type="button"
              variant="outline"
              onClick={exportCsv}
              disabled={
                isLoading ||
                !incomeData ||
                Boolean(loadError) ||
                visibleUsers.length === 0
              }
            >
              <DownloadSimple aria-hidden size={18} /> Export CSV
            </Button>
          </div>

          <div className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:justify-between">
            <p aria-live="polite" className="font-semibold">
              {`${visibleUsers.length} ${visibleUsers.length === 1 ? "result" : "results"}${incomeData ? ` of ${incomeData.paidUsers.length}` : ""}`}
            </p>
            <p className="text-muted-foreground">
              Reporting period:{" "}
              <span className="font-medium text-foreground">
                {activePeriod}
              </span>
            </p>
          </div>

          {isLoading ? (
            <div
              role="status"
              className="py-12 text-center text-muted-foreground"
            >
              Loading income data…
            </div>
          ) : incomeData && visibleUsers.length === 0 ? (
            <div className="rounded-[var(--radius-md)] border border-dashed p-8 text-center">
              <p className="font-medium">
                {search
                  ? "No billing results match your search."
                  : "No paid users found for the selected period."}
              </p>
              {search && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  Clear search
                </Button>
              )}
            </div>
          ) : incomeData ? (
            <>
              <div className="max-h-[44rem] overflow-auto rounded-[var(--radius-md)] border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted">
                    <TableRow>
                      <TableHead className="w-12">
                        <span className="sr-only">Payment history</span>
                      </TableHead>
                      <TableHead>#</TableHead>
                      <TableHead>Name / customer</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Total paid</TableHead>
                      <TableHead className="text-right">Refunded</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Payments</TableHead>
                      <TableHead>Last payment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedUsers.map((user, index) => {
                      const paymentCount = getPaymentCount(user);
                      const refundCount = user.payments.filter(
                        ({ type }) => type === "refund",
                      ).length;
                      const lastPayment = getLastPayment(user);
                      const isExpanded = expandedRows.has(user.customerId);
                      return (
                        <Fragment key={user.customerId}>
                          <TableRow>
                            <TableCell>
                              {user.payments.length > 0 && (
                                <AdminIconTooltip
                                  label={`${isExpanded ? "Collapse" : "Expand"} payment history`}
                                >
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                      setExpandedRows((current) => {
                                        const next = new Set(current);
                                        if (next.has(user.customerId))
                                          next.delete(user.customerId);
                                        else next.add(user.customerId);
                                        return next;
                                      });
                                    }}
                                    aria-label={`${isExpanded ? "Collapse" : "Expand"} payment history for ${user.name}`}
                                    aria-expanded={isExpanded}
                                    aria-controls={`payment-history-${user.customerId}`}
                                  >
                                    {isExpanded ? (
                                      <CaretDown aria-hidden />
                                    ) : (
                                      <CaretRight aria-hidden />
                                    )}
                                  </Button>
                                </AdminIconTooltip>
                              )}
                            </TableCell>
                            <TableCell className="tabular-nums">
                              {(currentPage - 1) * limit + index + 1}
                            </TableCell>
                            <TableCell>
                              <span className="block font-medium">
                                {user.name}
                              </span>
                              <span className="block font-mono text-xs text-muted-foreground">
                                {user.customerId}
                              </span>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatCurrency(getGrossPaid(user))}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {formatCurrency(user.totalRefunded || 0)}
                            </TableCell>
                            <TableCell className="text-right font-medium tabular-nums">
                              {formatCurrency(user.totalPaid)}
                            </TableCell>
                            <TableCell>
                              <span>
                                {paymentCount} payment
                                {paymentCount === 1 ? "" : "s"}
                              </span>
                              {refundCount > 0 && (
                                <Badge variant="secondary" className="ml-2">
                                  {refundCount} refund
                                  {refundCount === 1 ? "" : "s"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {lastPayment ? formatTimestamp(lastPayment) : "—"}
                            </TableCell>
                          </TableRow>
                          {isExpanded && user.payments.length > 0 && (
                            <PaymentHistory
                              customerId={user.customerId}
                              payments={user.payments}
                            />
                          )}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col justify-between gap-4 border-t pt-4 sm:flex-row sm:items-end">
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
                {totalPages > 1 && (
                  <nav aria-label="Billing results pages">
                    <ReactPaginate
                      previousLabel="Previous"
                      nextLabel="Next"
                      breakLabel="…"
                      pageCount={totalPages}
                      marginPagesDisplayed={1}
                      pageRangeDisplayed={3}
                      onPageChange={({ selected }) => setPage(selected + 1)}
                      forcePage={currentPage - 1}
                      containerClassName="flex flex-wrap items-center gap-1"
                      pageClassName="rounded-md px-3 py-2 hover:bg-muted"
                      activeClassName="!bg-primary text-primary-foreground"
                      previousClassName="rounded-md px-3 py-2 hover:bg-muted"
                      nextClassName="rounded-md px-3 py-2 hover:bg-muted"
                      disabledClassName="pointer-events-none opacity-50"
                      breakClassName="px-3 py-2"
                    />
                  </nav>
                )}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
