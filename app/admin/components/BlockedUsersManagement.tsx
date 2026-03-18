'use client'
import { useEffect, useState } from "react";
import ReactPaginate from 'react-paginate';
import FullRoundedButton from "../../components/Button/FullRoundedButton";
import LabeledInput from "../../dashboard/components/LabeledInput";
import ConfirmMessage from "../../components/Modal/ConfirmMessage";
import { useMessage } from "@/app/contexts/MessageContext";
import { UserMinus, Trash, Plus, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";

interface BlockedUser {
  id: string;
  email: string;
  username: string;
  first_name: string | null;
  last_name: string | null;
  is_blocked: boolean;
  blocked_reason: string | null;
  blocked_at: string | null;
}

const BlockedUsersManagement: React.FC = () => {
  const { setNotificationMessage } = useMessage();
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockUserId, setUnblockUserId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);

  const pageSizeOptions = [10, 25, 50, 100];
  const totalPages = Math.ceil(total / limit);

  const fetchBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
      const response = await fetch(`/api/admin/blocked-users?${params}`, { method: 'GET' });
      const result = await response.json();
      setBlockedUsers(result.data || []);
      setTotal(result.count || 0);
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, [page, limit]);

  const handleUnblock = async () => {
    if (!unblockUserId) return;

    try {
      const response = await fetch('/api/admin/blocked-users', {
        method: 'DELETE',
        body: JSON.stringify({ user_id: unblockUserId }),
      });

      if (response.ok) {
        setNotificationMessage({ message: 'User unblocked successfully', type: 'success' });
        fetchBlockedUsers();
      } else {
        setNotificationMessage({ message: 'Failed to unblock user', type: 'error' });
      }
    } catch {
      setNotificationMessage({ message: 'Failed to unblock user', type: 'error' });
    } finally {
      setIsConfirmOpen(false);
      setUnblockUserId(null);
    }
  };

  return (
    <div className="p-8 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <UserMinus size={28} />
          Blocked Users
          {total > 0 && <span className="text-sm font-normal text-gray-500">({total})</span>}
        </h2>
      </div>

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
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Username</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Email</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Name</th>
              <th className="border-b px-4 py-3 text-left text-sm font-semibold">Reason</th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">Blocked At</th>
              <th className="border-b px-4 py-3 text-center text-sm font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {isLoading ? (
              Array.from({ length: Math.min(limit, 10) }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {Array.from({ length: 7 }).map((_, cellIndex) => (
                    <td key={`skeleton-cell-${cellIndex}`} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : blockedUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center">
                  <div className="flex flex-col items-center justify-center text-gray-500">
                    <UserMinus size={48} className="mb-4 opacity-50" />
                    <p className="text-xl font-semibold">No blocked users</p>
                    <p className="text-sm mt-1">Block users from the users management table</p>
                  </div>
                </td>
              </tr>
            ) : (
              blockedUsers.map((user, index) => (
                <tr key={user.id} className="hover:bg-gray-50 text-sm text-gray-700">
                  <td className="px-4 py-3">{(page - 1) * limit + index + 1}</td>
                  <td className="px-4 py-3 font-medium">@{user.username}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    {[user.first_name, user.last_name].filter(Boolean).join(' ') || '-'}
                  </td>
                  <td className="px-4 py-3">{user.blocked_reason || '-'}</td>
                  <td className="px-4 py-3 text-center">
                    {user.blocked_at ? formatDateAsDDMMYYYY(user.blocked_at) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => {
                        setUnblockUserId(user.id);
                        setIsConfirmOpen(true);
                      }}
                      className="text-gray-600 hover:text-red-600 transition-colors inline-flex"
                      title="Unblock user"
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
        title="Unblock user?"
        description="Are you sure you want to unblock this user? They will be able to log in again."
        okText="Unblock"
        type="danger"
        isOpen={isConfirmOpen}
        onClose={() => {
          setIsConfirmOpen(false);
          setUnblockUserId(null);
        }}
        onOk={handleUnblock}
      />
    </div>
  );
};

export default BlockedUsersManagement;
