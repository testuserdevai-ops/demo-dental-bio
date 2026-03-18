'use client'
import { useEffect, useState } from "react";
import ReactPaginate from 'react-paginate';
import FullRoundedButton from "../../components/Button/FullRoundedButton";
import LabeledInput from "../../dashboard/components/LabeledInput";
import ConfirmMessage from "../../components/Modal/ConfirmMessage";
import { useMessage } from "@/app/contexts/MessageContext";
import { Fingerprint, Trash, Plus, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";

interface AssociatedUser {
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
}

interface BlockedFingerprint {
  id: number;
  fingerprint: string;
  reason: string | null;
  created_at: string;
  associated_users: AssociatedUser[];
}

const BlockedFingerprintsManagement: React.FC = () => {
  const { setNotificationMessage } = useMessage();
  const [blockedFingerprints, setBlockedFingerprints] = useState<BlockedFingerprint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newFingerprint, setNewFingerprint] = useState('');
  const [newReason, setNewReason] = useState('');
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [deleteFingerprint, setDeleteFingerprint] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);

  const pageSizeOptions = [10, 25, 50, 100];
  const totalPages = Math.ceil(total / limit);

  const fetchBlockedFingerprints = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      const response = await fetch(`/api/admin/blocked-fingerprints?${params}`, { method: 'GET' });
      const result = await response.json();
      setBlockedFingerprints(result.data || []);
      setTotal(result.count || 0);
    } catch (error) {
      console.error('Failed to fetch blocked fingerprints:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedFingerprints();
  }, [page, limit]);

  const handleAdd = async () => {
    if (!newFingerprint.trim()) {
      setNotificationMessage({ message: 'Fingerprint is required', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/admin/blocked-fingerprints', {
        method: 'POST',
        body: JSON.stringify({ fingerprint: newFingerprint.trim(), reason: newReason.trim() || null }),
      });

      if (response.ok) {
        setNotificationMessage({ message: 'Fingerprint blocked successfully', type: 'success' });
        setNewFingerprint('');
        setNewReason('');
        setIsAddingOpen(false);
        setPage(1);
        fetchBlockedFingerprints();
      } else {
        const data = await response.json();
        setNotificationMessage({ message: data.error || 'Failed to block fingerprint', type: 'error' });
      }
    } catch {
      setNotificationMessage({ message: 'Failed to block fingerprint', type: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!deleteFingerprint) return;

    try {
      const response = await fetch('/api/admin/blocked-fingerprints', {
        method: 'DELETE',
        body: JSON.stringify({ fingerprint: deleteFingerprint }),
      });

      if (response.ok) {
        setNotificationMessage({ message: 'Fingerprint unblocked successfully', type: 'success' });
        fetchBlockedFingerprints();
      } else {
        setNotificationMessage({ message: 'Failed to unblock fingerprint', type: 'error' });
      }
    } catch {
      setNotificationMessage({ message: 'Failed to unblock fingerprint', type: 'error' });
    } finally {
      setIsConfirmOpen(false);
      setDeleteFingerprint(null);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Fingerprint size={28} />
          Blocked Device Fingerprints
          {total > 0 && <span className="text-sm font-normal text-gray-500">({total})</span>}
        </h2>
        <FullRoundedButton onClick={() => setIsAddingOpen(!isAddingOpen)} className="shadow-md">
          <Plus size={20} className="mr-1" />
          Block Fingerprint
        </FullRoundedButton>
      </div>

      {isAddingOpen && (
        <div className="bg-surface-alt border rounded-[26px] shadow-xl p-6 mb-6">
          <h3 className="font-semibold mb-4 text-gray-700">Block a Device Fingerprint</h3>
          <div className="space-y-3 max-w-md">
            <LabeledInput
              label="Fingerprint"
              name="fingerprint"
              type="text"
              value={newFingerprint}
              onChange={(e: any) => setNewFingerprint(e.target.value)}
            />
            <LabeledInput
              label="Reason (optional)"
              name="reason"
              type="text"
              value={newReason}
              onChange={(e: any) => setNewReason(e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-4">
            <FullRoundedButton onClick={() => setIsAddingOpen(false)} buttonType="danger">
              Cancel
            </FullRoundedButton>
            <FullRoundedButton onClick={handleAdd}>
              Block
            </FullRoundedButton>
          </div>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Rows per page:</label>
            <div className="relative">
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="w-24 appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <CaretDown size={20} weight="bold" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none" />
            </div>
          </div>

          <ReactPaginate
            previousLabel="<"
            nextLabel=">"
            breakLabel="..."
            pageCount={totalPages}
            marginPagesDisplayed={1}
            pageRangeDisplayed={3}
            onPageChange={({ selected }) => setPage(selected + 1)}
            forcePage={page - 1}
            containerClassName="flex items-center gap-1 min-w-fit mb-0"
            pageClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
            activeClassName="!bg-primary-1 hover:!bg-primary-2 text-white cursor-pointer"
            previousClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer no-underline pagination-ctrl-btn"
            nextClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer no-underline pagination-ctrl-btn"
            disabledClassName="opacity-50 cursor-not-allowed hover:bg-transparent"
            breakClassName="px-3 py-2"
          />
        </div>
      )}

      <div className="overflow-x-auto rounded-[26px] border border-gray-200 shadow-xl pb-1">
        <table className="w-full">
          <thead className="bg-primary-1 text-white">
            <tr>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">#</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Fingerprint</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Reason</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Associated Users</th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">Blocked At</th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              Array.from({ length: Math.min(limit, 10) }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <td key={`skeleton-cell-${cellIndex}`} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : blockedFingerprints.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <Fingerprint size={48} className="mb-4 opacity-50" />
                    <p className="text-xl font-semibold">No blocked fingerprints</p>
                    <p className="text-sm mt-1">Block device fingerprints from the user table above</p>
                  </div>
                </td>
              </tr>
            ) : (
              blockedFingerprints.map((item, index) => (
                <tr key={item.id} className="hover:bg-gray-50 text-sm text-gray-700">
                  <td className="px-4 py-3">{(page - 1) * limit + index + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{item.fingerprint}</td>
                  <td className="px-4 py-3">{item.reason || '-'}</td>
                  <td className="px-4 py-3">
                    {item.associated_users && item.associated_users.length > 0 ? (
                      <div className="flex flex-col gap-0.5">
                        {item.associated_users.map((u, i) => (
                          <span key={i} className="text-xs text-gray-600">
                            @{u.username} <span className="text-gray-400">({u.email})</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">No linked accounts</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">{formatDateAsDDMMYYYY(item.created_at)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setDeleteFingerprint(item.fingerprint);
                        setIsConfirmOpen(true);
                      }}
                      className="text-gray-600 hover:text-red-600 transition-colors inline-flex"
                      title="Unblock fingerprint"
                    >
                      <Trash weight="fill" size={20} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600 whitespace-nowrap">Rows per page:</label>
            <div className="relative">
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="w-24 appearance-none p-2 rounded-[26px] h-[50px] py-2 text-base px-3 text-neutral-800 pr-10 outline-none cursor-pointer"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>{size}</option>
                ))}
              </select>
              <CaretDown size={20} weight="bold" className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-500 pointer-events-none" />
            </div>
          </div>

          <ReactPaginate
            previousLabel="<"
            nextLabel=">"
            breakLabel="..."
            pageCount={totalPages}
            marginPagesDisplayed={1}
            pageRangeDisplayed={3}
            onPageChange={({ selected }) => setPage(selected + 1)}
            forcePage={page - 1}
            containerClassName="flex items-center gap-1 min-w-fit mb-0"
            pageClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer"
            activeClassName="!bg-primary-1 hover:!bg-primary-2 text-white cursor-pointer"
            previousClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer no-underline pagination-ctrl-btn"
            nextClassName="px-3 py-2 rounded-md hover:bg-gray-100 cursor-pointer no-underline pagination-ctrl-btn"
            disabledClassName="opacity-50 cursor-not-allowed hover:bg-transparent"
            breakClassName="px-3 py-2"
          />
        </div>
      )}

      <ConfirmMessage
        title="Unblock fingerprint?"
        description="Are you sure you want to unblock this device fingerprint? The user will be able to register and sign in again."
        okText="Unblock"
        type="danger"
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setDeleteFingerprint(null);
        }}
        onOk={handleDelete}
      />
    </div>
  );
};

export default BlockedFingerprintsManagement;
