"use client";
import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import {
  CaretDown,
  ShieldWarning,
  FunnelSimple,
  X,
  ArrowClockwise,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";

const AUTO_REFRESH_MS = 30_000;

interface SecurityLog {
  id: number;
  event_type: string;
  email: string | null;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  ip_address: string | null;
  user_agent: string | null;
  fingerprint: string | null;
  country: string | null;
  location: string | null;
  route: string | null;
  details: Record<string, any> | null;
  created_at: string;
}

const EVENT_TYPES: Record<string, { label: string; bg: string; text: string }> =
  {
    blocked_domain: {
      label: "Domain",
      bg: "bg-orange-100",
      text: "text-orange-700",
    },
    blocked_fingerprint: {
      label: "Fingerprint",
      bg: "bg-rose-100",
      text: "text-rose-700",
    },
    blocked_ip: { label: "IP", bg: "bg-red-100", text: "text-red-700" },
    blocked_user: {
      label: "User",
      bg: "bg-purple-100",
      text: "text-purple-700",
    },
  };

const SecurityLogs: React.FC = () => {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({ event_type: "", email: "", ip: "" });
  const [draftFilters, setDraftFilters] = useState({
    event_type: "",
    email: "",
    ip: "",
  });

  const pageSizeOptions = [10, 25, 50, 100];
  const totalPages = Math.ceil(total / limit);
  const activeFilterCount = [
    filters.event_type,
    filters.email,
    filters.ip,
  ].filter(Boolean).length;

  // Background flag = true skips the loading skeleton so auto-refresh and
  // manual refresh after the first load swap data in place without flashing.
  const fetchLogs = async (background = false) => {
    if (background) setIsRefreshing(true);
    else setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(filters.event_type && { event_type: filters.event_type }),
        ...(filters.email && { email: filters.email }),
        ...(filters.ip && { ip: filters.ip }),
      });
      const res = await fetch(`/api/admin/security-logs?${params}`);
      const result = await res.json();
      setLogs(result.data || []);
      setTotal(result.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      if (background) setIsRefreshing(false);
      else setIsLoading(false);
    }
  };

  // Initial / dependency-driven fetch shows the skeleton; the 30s timer
  // re-runs in the background so the table doesn't blank out. The timer
  // skips its tick when the tab isn't visible to avoid wasted polling
  // for backgrounded windows; the next visible tick will catch up.
  useEffect(() => {
    fetchLogs();
    const id = setInterval(() => {
      if (
        typeof document === "undefined" ||
        document.visibilityState === "visible"
      ) {
        fetchLogs(true);
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters]);

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    const empty = { event_type: "", email: "", ip: "" };
    setDraftFilters(empty);
    setFilters(empty);
    setPage(1);
    setIsFilterOpen(false);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
              <ShieldWarning
                size={20}
                weight="fill"
                className="text-slate-600"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Activity Logs
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isLoading
                  ? "Loading…"
                  : `${total.toLocaleString()} event${total !== 1 ? "s" : ""} recorded`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchLogs(true)}
              disabled={isLoading || isRefreshing}
              title={`Refresh (auto every ${AUTO_REFRESH_MS / 1000}s)`}
              className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <ArrowClockwise
                size={15}
                className={isRefreshing ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={() => {
                setIsFilterOpen(!isFilterOpen);
                if (!isFilterOpen) setDraftFilters(filters);
              }}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                activeFilterCount > 0
                  ? "bg-slate-900 border-slate-900 text-white"
                  : "bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <FunnelSimple size={15} />
              Filters
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-white/20 text-white text-xs flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ── Filter panel ─────────────────────────────────────────────── */}
        {isFilterOpen && (
          <div className="px-6 py-5 border-b border-gray-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Filter Logs
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                value={draftFilters.event_type || "all"}
                onValueChange={(event_type) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    event_type: event_type === "all" ? "" : event_type,
                  }))
                }
              >
                <SelectTrigger aria-label="Event type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Event Types</SelectItem>
                  <SelectItem value="blocked_domain">Blocked Domain</SelectItem>
                  <SelectItem value="blocked_fingerprint">
                    Blocked Fingerprint
                  </SelectItem>
                  <SelectItem value="blocked_ip">Blocked IP</SelectItem>
                  <SelectItem value="blocked_user">Blocked User</SelectItem>
                </SelectContent>
              </Select>
              <Input
                aria-label="Filter by email"
                value={draftFilters.email}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
                }
              />
              <Input
                aria-label="Filter by IP address"
                value={draftFilters.ip}
                onChange={(e) =>
                  setDraftFilters((prev) => ({ ...prev, ip: e.target.value }))
                }
              />
            </div>
            <div className="flex items-center gap-2 mt-4">
              <Button type="button" variant="outline" onClick={clearFilters}>
                <X size={14} />
                Clear
              </Button>
              <Button type="button" onClick={applyFilters}>
                Apply Filters
              </Button>
            </div>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Event
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  IP Address
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Fingerprint
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Country
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Route
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Details
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Time
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                  <tr key={i} className="bg-white">
                    {Array.from({ length: 10 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-3.5 bg-gray-100 rounded-full animate-pulse"
                          style={{ width: `${60 + ((j * 17) % 40)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-16 text-center bg-white">
                    <ShieldWarning
                      size={40}
                      className="mx-auto mb-3 text-gray-300"
                      weight="fill"
                    />
                    <p className="font-medium text-gray-500">
                      No security events found
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Blocked attempts will appear here
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => {
                  const ev = EVENT_TYPES[log.event_type] ?? {
                    label: log.event_type,
                    bg: "bg-gray-100",
                    text: "text-gray-600",
                  };
                  return (
                    <tr
                      key={log.id}
                      className="bg-white hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 text-xs text-gray-400">
                        {(page - 1) * limit + i + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${ev.bg} ${ev.text}`}
                        >
                          {ev.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {log.email || <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {log.first_name || log.last_name ? (
                          `${log.first_name ?? ""} ${log.last_name ?? ""}`.trim()
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {log.ip_address || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {log.fingerprint ? (
                          <span title={log.fingerprint} className="cursor-help">
                            {log.fingerprint.substring(0, 12)}…
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {log.country || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600">
                        {log.route || <span className="text-gray-300">—</span>}
                      </td>
                      <td
                        className="px-4 py-3 text-xs text-gray-600 max-w-[180px] truncate"
                        title={log.details ? JSON.stringify(log.details) : ""}
                      >
                        {log.details ? (
                          Object.entries(log.details)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(", ")
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 text-right whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination footer ─────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows per page:</span>
              <Select
                value={String(limit)}
                onValueChange={(value) => {
                  setLimit(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Rows per page" className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-gray-400">
                · {total.toLocaleString()} total
              </span>
            </div>
            <ReactPaginate
              previousLabel="‹"
              nextLabel="›"
              breakLabel="…"
              pageCount={totalPages}
              marginPagesDisplayed={1}
              pageRangeDisplayed={3}
              onPageChange={({ selected }) => setPage(selected + 1)}
              forcePage={page - 1}
              containerClassName="flex items-center gap-1"
              pageClassName="w-8 h-8 flex items-center justify-center rounded-lg text-sm text-gray-600 hover:bg-gray-100 cursor-pointer"
              activeClassName="!bg-slate-900 !text-white hover:!bg-slate-700"
              previousClassName="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer text-lg"
              nextClassName="w-8 h-8 flex items-center justify-center rounded-lg text-gray-600 hover:bg-gray-100 cursor-pointer text-lg"
              disabledClassName="opacity-30 cursor-not-allowed hover:bg-transparent"
              breakClassName="w-8 h-8 flex items-center justify-center text-gray-400"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityLogs;
