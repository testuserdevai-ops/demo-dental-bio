'use client'
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { ArrowLeft, Calendar, CurrencyDollar, Users, TrendUp, ArrowCounterClockwise, CaretDown, CaretRight } from "@phosphor-icons/react/dist/ssr";
import FullRoundedButton from "@/app/components/Button/FullRoundedButton";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";
import ReactPaginate from 'react-paginate';
import { DayPicker } from "react-day-picker";
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

const PaidUsersManagement: React.FC = () => {
  const router = useRouter();
  const [incomeData, setIncomeData] = useState<IncomeData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showCalendar, setShowCalendar] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const calendarRef = useRef<HTMLDivElement>(null);

  // Set default date range (last 30 days)
  useEffect(() => {
    const now = new Date();
    const end = new Date(now);
    const start = new Date(now);
    start.setDate(now.getDate() - 30);

    const range: DateRange = {
      from: start,
      to: end,
    };
    setDateRange(range);
    setEndDate(end.toISOString().split("T")[0]);
    setStartDate(start.toISOString().split("T")[0]);
  }, []);

  // Update date strings when range changes
  useEffect(() => {
    if (dateRange?.from) {
      setStartDate(dateRange.from.toISOString().split("T")[0]);
    }
    if (dateRange?.to) {
      setEndDate(dateRange.to.toISOString().split("T")[0]);
    }
  }, [dateRange]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setShowCalendar(false);
      }
    };

    if (showCalendar) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showCalendar]);

  const fetchIncomeData = async () => {
    if (!startDate || !endDate) return;

    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
      });

      const response = await fetch(`/api/admin/income?${params}`);
      const data = await response.json();

      if (response.ok) {
        setIncomeData(data);
      } else {
        console.error("Error fetching income data:", data.error);
      }
    } catch (error) {
      console.error("Error fetching income data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchIncomeData();
    }
  }, [startDate, endDate]);

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    setPage(1);
  };

  const formatCurrency = (amount: number, currency: string = "GBP") => {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return formatDateAsDDMMYYYY(new Date(timestamp * 1000).toISOString().split("T")[0]);
  };

  const totalPages = incomeData
    ? Math.ceil(incomeData.paidUsers.length / limit)
    : 0;
  const paginatedUsers = incomeData
    ? incomeData.paidUsers.slice((page - 1) * limit, page * limit)
    : [];

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Paid Users & Income Insights</h1>
          <FullRoundedButton
            onClick={() => router.push("/admin")}
            className="shadow-md"
          >
            <ArrowLeft size={20} className="mr-1" />
            Back to Admin
          </FullRoundedButton>
        </div>

        {/* Period Selection */}
        <div className="bg-white rounded-[26px] border border-gray-200 shadow-xl p-6 mb-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={24} className="text-primary-1" />
            <h2 className="text-xl font-semibold">Select Period</h2>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowCalendar(!showCalendar)}
              className="w-full px-4 py-3 text-left border border-gray-300 rounded-lg hover:border-primary-1 focus:outline-none focus:ring-2 focus:ring-primary-1 focus:border-transparent bg-white"
            >
              {dateRange?.from && dateRange?.to ? (
                <span className="text-gray-700">
                  {formatDateAsDDMMYYYY(dateRange.from.toISOString().split("T")[0])} - {formatDateAsDDMMYYYY(dateRange.to.toISOString().split("T")[0])}
                </span>
              ) : dateRange?.from ? (
                <span className="text-gray-700">
                  {formatDateAsDDMMYYYY(dateRange.from.toISOString().split("T")[0])} - Select end date
                </span>
              ) : (
                <span className="text-gray-400">Select date range</span>
              )}
            </button>
            {showCalendar && (
              <div
                ref={calendarRef}
                className="absolute z-50 mt-2 bg-white rounded-lg shadow-xl p-6 border border-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  captionLayout="dropdown"
                  showOutsideDays
                  className="mx-auto"
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
                  <p className="text-sm text-gray-600 mb-1">Available Balance</p>
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

        {/* Paid Users Table */}
        <div className="bg-white rounded-[26px] border border-gray-200 shadow-xl overflow-hidden">
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
              <p className="text-gray-500">No paid users found for the selected period.</p>
            </div>
          ) : incomeData ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-primary-1 text-white">
                    <tr>
                      <th className="border-b px-4 py-3 text-left text-sm font-semibold w-8"></th>
                      <th className="border-b px-4 py-3 text-left text-sm font-semibold">#</th>
                      <th className="border-b px-4 py-3 text-left text-sm font-semibold">Name</th>
                      <th className="border-b px-4 py-3 text-left text-sm font-semibold">Email</th>
                      <th className="border-b px-4 py-3 text-left text-sm font-semibold">Total Paid</th>
                      <th className="border-b px-4 py-3 text-left text-sm font-semibold">Total Refunded</th>
                      <th className="border-b px-4 py-3 text-left text-sm font-semibold">Net Amount</th>
                      <th className="border-b px-4 py-3 text-left text-sm font-semibold">Payments</th>
                      <th className="border-b px-4 py-3 text-left text-sm font-semibold">Last Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {paginatedUsers.map((user, index) => {
                      const netAmount = user.totalPaid;
                      const totalRefunded = user.totalRefunded || 0;
                      const paymentCount = user.payments.filter(p => p.type === "payment").length;
                      const refundCount = user.payments.filter(p => p.type === "refund").length;
                      const isExpanded = expandedRows.has(user.customerId);
                      const sortedPayments = [...user.payments].sort((a, b) => b.date - a.date);
                      
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
                        <>
                          <tr key={user.customerId} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm">
                              {user.payments.length > 0 && (
                                <button
                                  onClick={toggleExpand}
                                  className="text-gray-600 hover:text-primary-1 transition-colors"
                                >
                                  {isExpanded ? (
                                    <CaretDown size={20} />
                                  ) : (
                                    <CaretRight size={20} />
                                  )}
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {(page - 1) * limit + index + 1}
                            </td>
                            <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                            <td className="px-4 py-3 text-sm font-semibold text-green-600">
                              {formatCurrency(user.totalPaid + totalRefunded)}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold text-red-600">
                              {totalRefunded > 0 ? formatCurrency(totalRefunded) : "-"}
                            </td>
                            <td className="px-4 py-3 text-sm font-semibold">
                              <span className={netAmount >= 0 ? "text-green-600" : "text-red-600"}>
                                {formatCurrency(netAmount)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <div className="flex flex-col gap-1">
                                <span className="text-green-600">{paymentCount} payment{paymentCount !== 1 ? 's' : ''}</span>
                                {refundCount > 0 && (
                                  <span className="text-red-600 text-xs">{refundCount} refund{refundCount !== 1 ? 's' : ''}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {user.payments.length > 0
                                ? formatDate(
                                  Math.max(...user.payments.map((p) => p.date))
                                )
                                : "-"}
                            </td>
                          </tr>
                          {isExpanded && sortedPayments.length > 0 && (
                            <tr>
                              <td colSpan={9} className="px-4 py-4 bg-gray-50">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-sm mb-3">Payment & Refund History</h4>
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
                                          <span className={`text-xs font-medium ${
                                            payment.type === "refund" ? "text-red-600" : "text-green-600"
                                          }`}>
                                            {payment.type === "refund" ? "REFUND" : "PAYMENT"}
                                          </span>
                                          <span className="text-sm text-gray-700">
                                            {formatDate(payment.date)}
                                          </span>
                                          <span className="text-sm text-gray-600">
                                            {payment.description}
                                          </span>
                                          {payment.invoiceId && (
                                            <span className="text-xs text-gray-500">
                                              Invoice: {payment.invoiceId.substring(0, 20)}...
                                            </span>
                                          )}
                                        </div>
                                        <span className={`font-semibold ${
                                          payment.type === "refund" ? "text-red-600" : "text-green-600"
                                        }`}>
                                          {payment.type === "refund" ? "-" : "+"}
                                          {formatCurrency(Math.abs(payment.amount), payment.currency)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <label htmlFor="pageSize" className="text-sm text-gray-600">
                    Rows per page:
                  </label>
                  <select
                    id="pageSize"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                    className="p-2 rounded-lg border border-gray-300 outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                <ReactPaginate
                  previousLabel="<"
                  nextLabel=">"
                  breakLabel="..."
                  pageCount={totalPages}
                  marginPagesDisplayed={1}
                  pageRangeDisplayed={3}
                  onPageChange={({ selected }) => {
                    setPage(selected + 1);
                  }}
                  containerClassName="flex items-center gap-1"
                  pageClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
                  activeClassName="!bg-primary-1 hover:!bg-primary-2 text-white cursor-pointer"
                  previousClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
                  nextClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
                  disabledClassName="opacity-50 cursor-not-allowed hover:bg-transparent"
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

