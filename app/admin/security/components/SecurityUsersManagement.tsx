"use client";
import { useEffect, useState } from "react";
import ReactPaginate from "react-paginate";
import { useMessage } from "@/app/contexts/MessageContext";
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
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  MagnifyingGlass,
  Fingerprint,
  WifiHigh,
  ShieldSlash,
  UserMinus,
  X,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";

interface User {
  id: string;
  username: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  is_blocked: boolean;
  user_device_fingerprints: {
    fingerprint: string;
    last_seen_at: string | null;
  }[];
  user_ips: { ip_address: string; last_seen_at: string | null }[];
}

const SecurityUsersManagement: React.FC<{ canManage?: boolean }> = ({
  canManage = true,
}) => {
  const { setNotificationMessage } = useMessage();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [draftSearch, setDraftSearch] = useState("");

  const [blockedFingerprints, setBlockedFingerprints] = useState<Set<string>>(
    new Set(),
  );
  const [blockedIps, setBlockedIps] = useState<Set<string>>(new Set());

  const [blockUserId, setBlockUserId] = useState("");
  const [blockUsername, setBlockUsername] = useState("");
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [isBlockPending, setIsBlockPending] = useState(false);

  const pageSizeOptions = [10, 15, 25, 50];
  const totalPages = Math.ceil(total / limit);

  // ── Fetch users ─────────────────────────────────────────────────────────
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (search) {
        // Search across both email and username
        filters.email = search;
      }
      const res = await fetch("/api/user/list", {
        method: "POST",
        body: JSON.stringify({ page, limit, filters }),
      });
      const result = await res.json();
      setUsers(result.data || []);
      setTotal(result.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, limit, search]);

  // ── Fetch blocked sets ───────────────────────────────────────────────────
  const fetchBlockedFingerprints = async () => {
    try {
      const res = await fetch(
        "/api/admin/blocked-fingerprints?page=1&limit=10000",
      );
      const result = await res.json();
      if (Array.isArray(result.data)) {
        setBlockedFingerprints(
          new Set(result.data.map((i: any) => i.fingerprint)),
        );
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchBlockedIps = async () => {
    try {
      const res = await fetch("/api/admin/blocked-ips?page=1&limit=10000");
      const result = await res.json();
      if (Array.isArray(result.data)) {
        setBlockedIps(new Set(result.data.map((i: any) => i.ip_address)));
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBlockedFingerprints();
    fetchBlockedIps();
  }, []);

  // ── Block / unblock fingerprint ──────────────────────────────────────────
  const handleBlockFingerprint = async (
    fingerprint: string,
    username: string,
  ) => {
    try {
      const res = await fetch("/api/admin/blocked-fingerprints", {
        method: "POST",
        body: JSON.stringify({
          fingerprint,
          reason: `Blocked from user @${username}`,
        }),
      });
      if (res.ok) {
        setBlockedFingerprints((prev) => new Set([...prev, fingerprint]));
        setNotificationMessage({
          message: `Device blocked for @${username}`,
          type: "success",
        });
      } else {
        const data = await res.json();
        setNotificationMessage({
          message: data.error || "Failed to block device",
          type: "error",
        });
      }
    } catch {
      setNotificationMessage({
        message: "Failed to block device",
        type: "error",
      });
    }
  };

  const handleUnblockFingerprint = async (
    fingerprint: string,
    username: string,
  ) => {
    try {
      const res = await fetch("/api/admin/blocked-fingerprints", {
        method: "DELETE",
        body: JSON.stringify({ fingerprint }),
      });
      if (res.ok) {
        setBlockedFingerprints((prev) => {
          const s = new Set(prev);
          s.delete(fingerprint);
          return s;
        });
        setNotificationMessage({
          message: `Device unblocked for @${username}`,
          type: "success",
        });
      } else {
        setNotificationMessage({
          message: "Failed to unblock device",
          type: "error",
        });
      }
    } catch {
      setNotificationMessage({
        message: "Failed to unblock device",
        type: "error",
      });
    }
  };

  // ── Block / unblock IP ───────────────────────────────────────────────────
  const handleBlockIp = async (ip: string, username: string) => {
    try {
      const res = await fetch("/api/admin/blocked-ips", {
        method: "POST",
        body: JSON.stringify({
          ip_address: ip,
          reason: `Blocked from user @${username}`,
        }),
      });
      if (res.ok) {
        setBlockedIps((prev) => new Set([...prev, ip]));
        setNotificationMessage({
          message: `IP ${ip} blocked`,
          type: "success",
        });
      } else {
        const data = await res.json();
        setNotificationMessage({
          message: data.error || "Failed to block IP",
          type: "error",
        });
      }
    } catch {
      setNotificationMessage({ message: "Failed to block IP", type: "error" });
    }
  };

  const handleUnblockIp = async (ip: string) => {
    try {
      const res = await fetch("/api/admin/blocked-ips", {
        method: "DELETE",
        body: JSON.stringify({ ip_address: ip }),
      });
      if (res.ok) {
        setBlockedIps((prev) => {
          const s = new Set(prev);
          s.delete(ip);
          return s;
        });
        setNotificationMessage({
          message: `IP ${ip} unblocked`,
          type: "success",
        });
      } else {
        setNotificationMessage({
          message: "Failed to unblock IP",
          type: "error",
        });
      }
    } catch {
      setNotificationMessage({
        message: "Failed to unblock IP",
        type: "error",
      });
    }
  };

  // ── Block user ───────────────────────────────────────────────────────────
  const handleBlockUser = async () => {
    if (!blockUserId || isBlockPending) return;
    setIsBlockPending(true);
    try {
      const res = await fetch("/api/admin/blocked-users", {
        method: "POST",
        body: JSON.stringify({
          user_id: blockUserId,
          reason: "Blocked from security dashboard",
        }),
      });
      if (res.ok) {
        setNotificationMessage({
          message: `@${blockUsername} blocked`,
          type: "success",
        });
        setIsBlockConfirmOpen(false);
        setBlockUserId("");
        setBlockUsername("");
        fetchUsers();
      } else {
        const data = await res.json();
        setNotificationMessage({
          message: data.error || "Failed to block user",
          type: "error",
        });
      }
    } catch {
      setNotificationMessage({
        message: "Failed to block user",
        type: "error",
      });
    } finally {
      setIsBlockPending(false);
    }
  };

  const applySearch = () => {
    setSearch(draftSearch);
    setPage(1);
  };

  const clearSearch = () => {
    setDraftSearch("");
    setSearch("");
    setPage(1);
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <ShieldCheck size={20} weight="fill" className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                User Security Controls
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isLoading
                  ? "Loading…"
                  : `${total.toLocaleString()} user${total !== 1 ? "s" : ""} · manage device & IP blocks`}
              </p>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlass
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <Input
                type="text"
                value={draftSearch}
                onChange={(e) => setDraftSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && applySearch()}
                placeholder="Search by email…"
                aria-label="Search users by email"
                className="h-9 w-56 bg-gray-50 pl-8 pr-8 text-sm"
              />
              {draftSearch && (
                <Button
                  aria-label="Clear user search"
                  size="icon"
                  type="button"
                  onClick={clearSearch}
                  variant="ghost"
                  className="absolute right-1 top-1/2 size-7 -translate-y-1/2 text-gray-400"
                >
                  <X size={13} />
                </Button>
              )}
            </div>
            <Button type="button" size="sm" onClick={applySearch}>
              Search
            </Button>
          </div>
        </div>

        {/* ── Table ────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-52">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    <Fingerprint size={13} />
                    Device Fingerprints
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    <WifiHigh size={13} />
                    IP Addresses
                  </span>
                </th>
                {canManage && (
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide w-28">
                    Block User
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                Array.from({ length: limit }).map((_, i) => (
                  <tr key={i} className="bg-white">
                    {[10, 40, 30, 30, 12].map((w, j) => (
                      <td key={j} className="px-4 py-4">
                        <div
                          className="h-3.5 bg-gray-100 rounded-full animate-pulse"
                          style={{ width: `${w}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 5 : 4}
                    className="px-4 py-16 text-center bg-white"
                  >
                    <ShieldCheck
                      size={40}
                      className="mx-auto mb-3 text-gray-200"
                      weight="fill"
                    />
                    <p className="font-medium text-gray-400">No users found</p>
                    <p className="text-xs text-gray-300 mt-1">
                      Try a different search term
                    </p>
                  </td>
                </tr>
              ) : (
                users.map((user, i) => (
                  <tr
                    key={user.id}
                    className="bg-white hover:bg-slate-50/50 transition-colors align-top"
                  >
                    <td className="px-4 py-4 text-xs text-gray-400 pt-4">
                      {(page - 1) * limit + i + 1}
                    </td>

                    {/* User info */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium text-gray-800">
                          @{user.username}
                        </span>
                        <span className="text-xs text-gray-400 truncate max-w-[180px]">
                          {user.email}
                        </span>
                      </div>
                    </td>

                    {/* Device fingerprints */}
                    <td className="px-4 py-4">
                      {user.user_device_fingerprints?.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {user.user_device_fingerprints.map((device, j) => {
                            const isBlocked = blockedFingerprints.has(
                              device.fingerprint,
                            );
                            return (
                              <div key={j} className="flex items-center gap-2">
                                <span
                                  className="font-mono text-[11px] text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md cursor-default"
                                  title={device.fingerprint}
                                >
                                  {device.fingerprint.substring(0, 14)}…
                                </span>
                                {canManage &&
                                  (isBlocked ? (
                                    <button
                                      onClick={() =>
                                        handleUnblockFingerprint(
                                          device.fingerprint,
                                          user.username,
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                    >
                                      <ShieldSlash size={10} />
                                      Blocked
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleBlockFingerprint(
                                          device.fingerprint,
                                          user.username,
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                                    >
                                      <Fingerprint size={10} />
                                      Block
                                    </button>
                                  ))}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">
                          No devices
                        </span>
                      )}
                    </td>

                    {/* IP addresses */}
                    <td className="px-4 py-4">
                      {user.user_ips?.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {user.user_ips.map((ipEntry, j) => {
                            const isBlocked = blockedIps.has(
                              ipEntry.ip_address,
                            );
                            return (
                              <div key={j} className="flex items-center gap-2">
                                <span className="font-mono text-[11px] text-gray-600 bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md">
                                  {ipEntry.ip_address}
                                </span>
                                {canManage &&
                                  (isBlocked ? (
                                    <button
                                      onClick={() =>
                                        handleUnblockIp(ipEntry.ip_address)
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                                    >
                                      <ShieldSlash size={10} />
                                      Blocked
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() =>
                                        handleBlockIp(
                                          ipEntry.ip_address,
                                          user.username,
                                        )
                                      }
                                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-700 transition-colors"
                                    >
                                      <WifiHigh size={10} />
                                      Block
                                    </button>
                                  ))}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">No IPs</span>
                      )}
                    </td>

                    {/* Block user action */}
                    {canManage && (
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => {
                            setBlockUserId(user.id);
                            setBlockUsername(user.username);
                            setIsBlockConfirmOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all"
                          title="Block this user"
                        >
                          <UserMinus size={13} />
                          Block
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

      <AlertDialog
        open={isBlockConfirmOpen}
        onOpenChange={(open) => {
          if (!open && !isBlockPending) {
            setIsBlockConfirmOpen(false);
            setBlockUserId("");
            setBlockUsername("");
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block user?</AlertDialogTitle>
            <AlertDialogDescription>
              Block @{blockUsername} from signing in and registering?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus disabled={isBlockPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleBlockUser();
              }}
              disabled={isBlockPending}
            >
              Block
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SecurityUsersManagement;
