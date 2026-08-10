"use client";
import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { toast } from "sonner";
import {
  UserMinus,
  CaretDown,
  LockKeyOpen,
} from "@phosphor-icons/react/dist/ssr";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/app/components/ui/alert-dialog";

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

const BlockedUsersManagement: React.FC<{ canManage?: boolean }> = ({
  canManage = true,
}) => {
  const notify = ({
    message,
    type,
  }: {
    message: string;
    type: "success" | "error";
  }) => toast[type](message);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unblockUserId, setUnblockUserId] = useState<string | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isUnblockPending, setIsUnblockPending] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const pageSizeOptions = [10, 25, 50, 100];
  const totalPages = Math.ceil(total / limit);

  const fetchBlockedUsers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/admin/blocked-users?${params}`);
      const result = await res.json();
      setBlockedUsers(result.data || []);
      setTotal(result.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedUsers();
  }, [page, limit]);

  const handleUnblock = async () => {
    if (!unblockUserId || isUnblockPending) return;
    setIsUnblockPending(true);
    try {
      const res = await fetch("/api/admin/blocked-users", {
        method: "DELETE",
        body: JSON.stringify({ user_id: unblockUserId }),
      });
      if (res.ok) {
        notify({
          message: "User unblocked successfully",
          type: "success",
        });
        setIsConfirmOpen(false);
        setUnblockUserId(null);
        fetchBlockedUsers();
      } else {
        notify({
          message: "Failed to unblock user",
          type: "error",
        });
      }
    } catch {
      notify({
        message: "Failed to unblock user",
        type: "error",
      });
    } finally {
      setIsUnblockPending(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <UserMinus size={20} weight="fill" className="text-purple-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Blocked Users
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isLoading
                ? "Loading…"
                : `${total} user${total !== 1 ? "s" : ""} currently blocked`}
            </p>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Username
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Reason
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                  Blocked At
                </th>
                {canManage && (
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
                  <tr key={i} className="bg-white">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-3.5 bg-gray-100 rounded-full animate-pulse"
                          style={{ width: `${50 + ((j * 19) % 45)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : blockedUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 7 : 6}
                    className="px-4 py-16 text-center bg-white"
                  >
                    <UserMinus
                      size={40}
                      className="mx-auto mb-3 text-gray-200"
                      weight="fill"
                    />
                    <p className="font-medium text-gray-400">
                      No blocked users
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Block users from the Users Management table
                    </p>
                  </td>
                </tr>
              ) : (
                blockedUsers.map((user, i) => (
                  <tr
                    key={user.id}
                    className="bg-white hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 inline-block" />
                        @{user.username}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      {[user.first_name, user.last_name]
                        .filter(Boolean)
                        .join(" ") || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {user.blocked_reason || (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 text-center">
                      {user.blocked_at ? (
                        formatDateAsDDMMYYYY(user.blocked_at)
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => {
                            setUnblockUserId(user.id);
                            setIsConfirmOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-green-300 hover:text-green-700 hover:bg-green-50 transition-all"
                          title="Unblock user"
                        >
                          <LockKeyOpen size={13} />
                          Unblock
                        </button>
                      </td>
                    )}
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

      <AlertDialog
        open={isConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !isUnblockPending) {
            setIsConfirmOpen(false);
            setUnblockUserId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock user?</AlertDialogTitle>
            <AlertDialogDescription>
              This user will be able to sign in again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus disabled={isUnblockPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleUnblock();
              }}
              disabled={isUnblockPending}
            >
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlockedUsersManagement;
