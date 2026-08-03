"use client";
import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import ConfirmMessage from "../../../components/Modal/ConfirmMessage";
import { useMessage } from "@/app/contexts/MessageContext";
import {
  Globe,
  Trash,
  Plus,
  CaretDown,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";

interface BlockedDomain {
  id: number;
  domain: string;
  is_active: boolean;
  created_at: string;
}

const BlockedDomainsManagement: React.FC = () => {
  const { setNotificationMessage } = useMessage();
  const [domains, setDomains] = useState<BlockedDomain[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newDomain, setNewDomain] = useState("");
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [deleteDomain, setDeleteDomain] = useState<BlockedDomain | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const pageSizeOptions = [10, 25, 50, 100];
  const totalPages = Math.ceil(total / limit);

  const fetchDomains = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/admin/blocked-domains?${params}`);
      const result = await res.json();
      setDomains(result.data || []);
      setTotal(result.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDomains();
  }, [page, limit]);

  const handleAdd = async () => {
    if (!newDomain.trim()) {
      setNotificationMessage({ message: "Domain is required", type: "error" });
      return;
    }
    try {
      const res = await fetch("/api/admin/blocked-domains", {
        method: "POST",
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      if (res.ok) {
        setNotificationMessage({
          message: "Domain blocked successfully",
          type: "success",
        });
        setNewDomain("");
        setIsAddingOpen(false);
        setPage(1);
        fetchDomains();
      } else {
        const data = await res.json();
        setNotificationMessage({
          message: data.error || "Failed to block domain",
          type: "error",
        });
      }
    } catch {
      setNotificationMessage({
        message: "Failed to block domain",
        type: "error",
      });
    }
  };

  const handleToggle = async (domain: BlockedDomain) => {
    setTogglingId(domain.id);
    try {
      const res = await fetch("/api/admin/blocked-domains", {
        method: "PATCH",
        body: JSON.stringify({ id: domain.id, is_active: !domain.is_active }),
      });
      if (res.ok) {
        setDomains((prev) =>
          prev.map((d) =>
            d.id === domain.id ? { ...d, is_active: !d.is_active } : d,
          ),
        );
        setNotificationMessage({
          message: `Domain ${!domain.is_active ? "enabled" : "disabled"} successfully`,
          type: "success",
        });
      } else {
        setNotificationMessage({
          message: "Failed to update domain status",
          type: "error",
        });
      }
    } catch {
      setNotificationMessage({
        message: "Failed to update domain status",
        type: "error",
      });
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteDomain) return;
    try {
      const res = await fetch("/api/admin/blocked-domains", {
        method: "DELETE",
        body: JSON.stringify({ id: deleteDomain.id }),
      });
      if (res.ok) {
        setNotificationMessage({
          message: "Domain removed successfully",
          type: "success",
        });
        fetchDomains();
      } else {
        setNotificationMessage({
          message: "Failed to remove domain",
          type: "error",
        });
      }
    } catch {
      setNotificationMessage({
        message: "Failed to remove domain",
        type: "error",
      });
    } finally {
      setIsConfirmOpen(false);
      setDeleteDomain(null);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
              <Globe size={20} weight="fill" className="text-orange-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Blocked Email Domains
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isLoading
                  ? "Loading…"
                  : `${total} domain${total !== 1 ? "s" : ""} on the block list`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddingOpen(!isAddingOpen)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            {isAddingOpen ? <X size={15} /> : <Plus size={15} />}
            {isAddingOpen ? "Cancel" : "Block Domain"}
          </button>
        </div>

        {/* ── Add form ─────────────────────────────────────────────────── */}
        {isAddingOpen && (
          <div className="px-6 py-5 border-b border-gray-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Block an Email Domain
            </p>
            <div className="max-w-sm">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Domain <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="example.com"
                className="w-full bg-white border border-gray-200 rounded-xl h-11 px-3 text-sm text-gray-800 outline-none focus:border-slate-400 font-mono placeholder:font-sans"
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-orange-600 text-white rounded-xl text-sm font-medium hover:bg-orange-700 transition-colors"
              >
                <Globe size={14} />
                Block Domain
              </button>
            </div>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Domain
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                  Added At
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                  <tr key={i} className="bg-white">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-3.5 bg-gray-100 rounded-full animate-pulse"
                          style={{ width: `${50 + ((j * 17) % 45)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : domains.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-16 text-center bg-white">
                    <Globe
                      size={40}
                      className="mx-auto mb-3 text-gray-200"
                      weight="fill"
                    />
                    <p className="font-medium text-gray-400">
                      No blocked domains
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Block email domains to prevent registration from them
                    </p>
                  </td>
                </tr>
              ) : (
                domains.map((item, i) => (
                  <tr
                    key={item.id}
                    className="bg-white hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-medium text-gray-800 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        @{item.domain}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleToggle(item)}
                          disabled={togglingId === item.id}
                          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                            item.is_active ? "bg-green-500" : "bg-gray-200"
                          } ${togglingId === item.id ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          title={
                            item.is_active
                              ? "Click to disable"
                              : "Click to enable"
                          }
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                              item.is_active
                                ? "translate-x-[18px]"
                                : "translate-x-[3px]"
                            }`}
                          />
                        </button>
                        <span
                          className={`text-xs font-medium ${item.is_active ? "text-green-600" : "text-gray-400"}`}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 text-center">
                      {formatDateAsDDMMYYYY(item.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => {
                          setDeleteDomain(item);
                          setIsConfirmOpen(true);
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Remove domain"
                      >
                        <Trash size={13} />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination footer ─────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/50">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows per page:</span>
              <div className="relative">
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="appearance-none bg-white border border-gray-200 rounded-lg h-8 pl-2.5 pr-7 text-sm text-gray-700 outline-none focus:border-slate-400 cursor-pointer"
                >
                  {pageSizeOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <CaretDown
                  size={12}
                  weight="bold"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                />
              </div>
              <span className="text-gray-400">· {total} total</span>
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

      <ConfirmMessage
        title="Remove Domain?"
        description={`Are you sure you want to remove "${deleteDomain?.domain}" from the blocked list? Users with this email domain will be able to register.`}
        okText="Remove"
        type="danger"
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setDeleteDomain(null);
        }}
        onOk={handleDelete}
      />
    </div>
  );
};

export default BlockedDomainsManagement;
