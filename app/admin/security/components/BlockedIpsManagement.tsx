'use client'
import { useEffect, useState } from "react";
import ReactPaginate from 'react-paginate';
import ConfirmMessage from "../../../components/Modal/ConfirmMessage";
import { useMessage } from "@/app/contexts/MessageContext";
import { WifiHigh, Trash, Plus, CaretDown, LockKeyOpen, X } from "@phosphor-icons/react/dist/ssr";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";

interface AssociatedUser {
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
}

interface BlockedIp {
  id: number;
  ip_address: string;
  reason: string | null;
  created_at: string;
  associated_users: AssociatedUser[];
}

const BlockedIpsManagement: React.FC = () => {
  const { setNotificationMessage } = useMessage();
  const [blockedIps,    setBlockedIps]    = useState<BlockedIp[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [newIp,         setNewIp]         = useState('');
  const [newReason,     setNewReason]     = useState('');
  const [isAddingOpen,  setIsAddingOpen]  = useState(false);
  const [deleteIp,      setDeleteIp]      = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [page,          setPage]          = useState(1);
  const [limit,         setLimit]         = useState(10);
  const [total,         setTotal]         = useState(0);

  const pageSizeOptions = [10, 25, 50, 100];
  const totalPages = Math.ceil(total / limit);

  const fetchBlockedIps = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      const res = await fetch(`/api/admin/blocked-ips?${params}`);
      const result = await res.json();
      setBlockedIps(result.data  || []);
      setTotal(result.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBlockedIps(); }, [page, limit]);

  const handleAdd = async () => {
    if (!newIp.trim()) {
      setNotificationMessage({ message: 'IP address is required', type: 'error' });
      return;
    }
    try {
      const res = await fetch('/api/admin/blocked-ips', {
        method: 'POST',
        body: JSON.stringify({ ip_address: newIp.trim(), reason: newReason.trim() || null }),
      });
      if (res.ok) {
        setNotificationMessage({ message: 'IP blocked successfully', type: 'success' });
        setNewIp('');
        setNewReason('');
        setIsAddingOpen(false);
        setPage(1);
        fetchBlockedIps();
      } else {
        const data = await res.json();
        setNotificationMessage({ message: data.error || 'Failed to block IP', type: 'error' });
      }
    } catch {
      setNotificationMessage({ message: 'Failed to block IP', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteIp) return;
    try {
      const res = await fetch('/api/admin/blocked-ips', {
        method: 'DELETE',
        body: JSON.stringify({ ip_address: deleteIp }),
      });
      if (res.ok) {
        setNotificationMessage({ message: 'IP unblocked successfully', type: 'success' });
        fetchBlockedIps();
      } else {
        setNotificationMessage({ message: 'Failed to unblock IP', type: 'error' });
      }
    } catch {
      setNotificationMessage({ message: 'Failed to unblock IP', type: 'error' });
    } finally {
      setIsConfirmOpen(false);
      setDeleteIp(null);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">

        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center">
              <WifiHigh size={20} weight="fill" className="text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Blocked IP Addresses</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isLoading ? 'Loading…' : `${total} IP address${total !== 1 ? 'es' : ''} blocked`}
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsAddingOpen(!isAddingOpen)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            {isAddingOpen ? <X size={15} /> : <Plus size={15} />}
            {isAddingOpen ? 'Cancel' : 'Block IP Address'}
          </button>
        </div>

        {/* ── Add form ─────────────────────────────────────────────────── */}
        {isAddingOpen && (
          <div className="px-6 py-5 border-b border-gray-100 bg-slate-50">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Block an IP Address</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">IP Address <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="192.168.1.1"
                  className="w-full bg-white border border-gray-200 rounded-xl h-11 px-3 text-sm text-gray-800 outline-none focus:border-slate-400 font-mono placeholder:font-sans"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Reason <span className="text-gray-400">(optional)</span></label>
                <input
                  type="text"
                  value={newReason}
                  onChange={(e) => setNewReason(e.target.value)}
                  placeholder="Reason for blocking"
                  className="w-full bg-white border border-gray-200 rounded-xl h-11 px-3 text-sm text-gray-800 outline-none focus:border-slate-400"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
              >
                <WifiHigh size={14} />
                Block IP
              </button>
            </div>
          </div>
        )}

        {/* ── Table ────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Reason</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">Associated Users</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Blocked At</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                  <tr key={i} className="bg-white">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3.5 bg-gray-100 rounded-full animate-pulse" style={{ width: `${50 + (j * 17) % 45}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : blockedIps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center bg-white">
                    <WifiHigh size={40} className="mx-auto mb-3 text-gray-200" weight="fill" />
                    <p className="font-medium text-gray-400">No blocked IPs</p>
                    <p className="text-xs text-gray-300 mt-1">Use the button above to block an IP address</p>
                  </td>
                </tr>
              ) : (
                blockedIps.map((item, i) => (
                  <tr key={item.id} className="bg-white hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-400">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-3 font-mono text-xs font-medium text-gray-800">{item.ip_address}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {item.reason || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {item.associated_users?.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {item.associated_users.map((u, j) => (
                            <span key={j} className="text-xs text-gray-600">
                              <span className="font-medium">@{u.username}</span>
                              <span className="text-gray-400 ml-1">({u.email})</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">No linked accounts</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 text-center">
                      {formatDateAsDDMMYYYY(item.created_at)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { setDeleteIp(item.ip_address); setIsConfirmOpen(true); }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50 transition-all"
                        title="Unblock IP"
                      >
                        <LockKeyOpen size={13} />
                        Unblock
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
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  className="appearance-none bg-white border border-gray-200 rounded-lg h-8 pl-2.5 pr-7 text-sm text-gray-700 outline-none focus:border-slate-400 cursor-pointer"
                >
                  {pageSizeOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <CaretDown size={12} weight="bold" className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
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
        title="Unblock IP?"
        description="Are you sure you want to unblock this IP address? Users from this IP will be able to register and sign in again."
        okText="Unblock"
        type="danger"
        isOpen={isConfirmOpen}
        onClose={() => { setIsConfirmOpen(false); setDeleteIp(null); }}
        onOk={handleDelete}
      />
    </div>
  );
};

export default BlockedIpsManagement;
