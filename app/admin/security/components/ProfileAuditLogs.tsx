"use client";
import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import {
  CaretDown,
  ClockCounterClockwise,
  FunnelSimple,
  X,
  Eye,
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
import { DiffModal } from "./DiffModal";
import {
  formatUser,
  OPERATION_STYLES,
  type AuditLog,
} from "./ProfileAuditLogs.types";

const AUTO_REFRESH_MS = 30_000;

const TABLE_OPTIONS = [
  { value: "", label: "All Tables" },
  { value: "users", label: "Users" },
  { value: "dentistries", label: "Dentistries" },
  { value: "socials", label: "Socials" },
  { value: "link_groups", label: "Link Groups" },
  { value: "links", label: "Links" },
  { value: "dentistry_links", label: "Link Junctions" },
  { value: "galleries", label: "Galleries" },
  { value: "general_galleries", label: "General Galleries" },
  { value: "reviews", label: "Reviews" },
];

const ACTOR_STYLES: Record<string, { bg: string; text: string }> = {
  self: { bg: "bg-slate-100", text: "text-slate-700" },
  admin: { bg: "bg-violet-100", text: "text-violet-700" },
  system: { bg: "bg-sky-100", text: "text-sky-700" },
};

const ProfileAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState({
    table_name: "",
    operation: "",
    actor_role: "",
    email: "",
  });
  const [draftFilters, setDraftFilters] = useState({
    table_name: "",
    operation: "",
    actor_role: "",
    email: "",
  });
  const [detailLog, setDetailLog] = useState<AuditLog | null>(null);

  const pageSizeOptions = [10, 25, 50, 100];
  const totalPages = Math.ceil(total / limit);
  const activeFilterCount = [
    filters.table_name,
    filters.operation,
    filters.actor_role,
    filters.email,
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
        ...(filters.table_name && { table_name: filters.table_name }),
        ...(filters.operation && { operation: filters.operation }),
        ...(filters.actor_role && { actor_role: filters.actor_role }),
        ...(filters.email && { email: filters.email }),
      });
      const res = await fetch(`/api/admin/profile-audit-log?${params}`);
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
    let active = true;
    queueMicrotask(() => {
      if (active) void fetchLogs();
    });
    const id = setInterval(() => {
      if (
        typeof document === "undefined" ||
        document.visibilityState === "visible"
      ) {
        fetchLogs(true);
      }
    }, AUTO_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, filters]);

  const applyFilters = () => {
    setFilters(draftFilters);
    setPage(1);
    setIsFilterOpen(false);
  };

  const clearFilters = () => {
    const empty = { table_name: "", operation: "", actor_role: "", email: "" };
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
              <ClockCounterClockwise
                size={20}
                weight="fill"
                className="text-slate-600"
              />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Profile Activity
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isLoading
                  ? "Loading…"
                  : `${total.toLocaleString()} change${total !== 1 ? "s" : ""} recorded`}
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
              Filter Activity
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Select
                value={draftFilters.table_name || "all"}
                onValueChange={(table_name) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    table_name: table_name === "all" ? "" : table_name,
                  }))
                }
              >
                <SelectTrigger aria-label="Filter by table">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tables</SelectItem>
                  {TABLE_OPTIONS.filter((o) => o.value).map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={draftFilters.operation || "all"}
                onValueChange={(operation) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    operation: operation === "all" ? "" : operation,
                  }))
                }
              >
                <SelectTrigger aria-label="Filter by operation">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Operations</SelectItem>
                  <SelectItem value="INSERT">Insert</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={draftFilters.actor_role || "all"}
                onValueChange={(actor_role) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    actor_role: actor_role === "all" ? "" : actor_role,
                  }))
                }
              >
                <SelectTrigger aria-label="Filter by actor">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actors</SelectItem>
                  <SelectItem value="self">Self</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Input
                aria-label="Filter activity by user email"
                value={draftFilters.email}
                onChange={(e) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    email: e.target.value,
                  }))
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
                  Operation
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Table
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Profile (subject)
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Changed Fields
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Actor
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  IP Address
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide">
                  Time
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                  <tr key={i} className="bg-white">
                    {Array.from({ length: 9 }).map((_, j) => (
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
                  <td colSpan={9} className="px-4 py-16 text-center bg-white">
                    <ClockCounterClockwise
                      size={40}
                      className="mx-auto mb-3 text-gray-300"
                      weight="fill"
                    />
                    <p className="font-medium text-gray-500">
                      No activity recorded
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Profile changes will appear here as they happen
                    </p>
                  </td>
                </tr>
              ) : (
                logs.map((log, i) => {
                  const op = OPERATION_STYLES[log.operation] ?? {
                    bg: "bg-gray-100",
                    text: "text-gray-600",
                  };
                  const role = log.actor_role
                    ? ACTOR_STYLES[log.actor_role]
                    : null;
                  const subj = formatUser(log.subject);
                  const actor = formatUser(log.actor);
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
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${op.bg} ${op.text}`}
                        >
                          {log.operation}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {log.table_name}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-700">
                        {subj || (
                          <span className="text-gray-300 font-mono">
                            {log.user_id.slice(0, 8)}…
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 max-w-[240px]">
                        {log.changed_keys.length > 0 ? (
                          <div
                            className="flex flex-wrap gap-1"
                            title={log.changed_keys.join(", ")}
                          >
                            {log.changed_keys.slice(0, 3).map((k) => (
                              <span
                                key={k}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]"
                              >
                                {k}
                              </span>
                            ))}
                            {log.changed_keys.length > 3 && (
                              <span className="text-[10px] text-gray-400">
                                +{log.changed_keys.length - 3}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {log.actor_role ? (
                          <div className="flex flex-col gap-0.5">
                            <span
                              className={`inline-flex w-fit items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${role!.bg} ${role!.text}`}
                            >
                              {log.actor_role}
                            </span>
                            {actor && log.actor_role !== "self" && (
                              <span
                                className="text-[10px] text-gray-500 truncate max-w-[160px]"
                                title={actor}
                              >
                                {actor}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {log.ip_address || (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 text-right whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setDetailLog(log)}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-gray-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                          title="View diff"
                        >
                          <Eye size={15} />
                        </button>
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

      {/* ── Diff modal ─────────────────────────────────────────────────── */}
      {detailLog && (
        <DiffModal log={detailLog} onClose={() => setDetailLog(null)} />
      )}
    </div>
  );
};

export default ProfileAuditLogs;
