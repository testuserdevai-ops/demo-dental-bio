"use client";
import { useCallback, useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import ReactPaginate from "react-paginate";
import { toast } from "sonner";
import {
  Fingerprint,
  Plus,
  CaretDown,
  LockKeyOpen,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";
import { Button } from "@/app/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
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
import {
  blockedFingerprintFormSchema,
  type BlockedFingerprintFormInput,
} from "./block-list-schema";

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

const BlockedFingerprintsManagement: React.FC<{ canManage?: boolean }> = ({
  canManage = true,
}) => {
  const notify = ({
    message,
    type,
  }: {
    message: string;
    type: "success" | "error";
  }) => toast[type](message);
  const [blockedFingerprints, setBlockedFingerprints] = useState<
    BlockedFingerprint[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingOpen, setIsAddingOpen] = useState(false);
  const [deleteFingerprint, setDeleteFingerprint] = useState<string | null>(
    null,
  );
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeletePending, setIsDeletePending] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);

  const pageSizeOptions = [10, 25, 50, 100];
  const totalPages = Math.ceil(total / limit);
  const addForm = useForm<BlockedFingerprintFormInput>({
    resolver: zodResolver(blockedFingerprintFormSchema),
    defaultValues: { fingerprint: "", reason: "" },
  });

  const fetchBlockedFingerprints = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      const res = await fetch(`/api/admin/blocked-fingerprints?${params}`);
      const result = await res.json();
      setBlockedFingerprints(result.data || []);
      setTotal(result.count || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [limit, page]);

  useEffect(() => {
    fetchBlockedFingerprints();
  }, [fetchBlockedFingerprints]);

  const handleAdd = async (values: BlockedFingerprintFormInput) => {
    try {
      const res = await fetch("/api/admin/blocked-fingerprints", {
        method: "POST",
        body: JSON.stringify({
          fingerprint: values.fingerprint,
          reason: values.reason || null,
        }),
      });
      if (res.ok) {
        notify({
          message: "Fingerprint blocked successfully",
          type: "success",
        });
        addForm.reset();
        setIsAddingOpen(false);
        setPage(1);
        fetchBlockedFingerprints();
      } else {
        const data = await res.json();
        notify({
          message: data.error || "Failed to block fingerprint",
          type: "error",
        });
      }
    } catch {
      notify({
        message: "Failed to block fingerprint",
        type: "error",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteFingerprint || isDeletePending) return;
    setIsDeletePending(true);
    try {
      const res = await fetch("/api/admin/blocked-fingerprints", {
        method: "DELETE",
        body: JSON.stringify({ fingerprint: deleteFingerprint }),
      });
      if (res.ok) {
        notify({
          message: "Fingerprint unblocked successfully",
          type: "success",
        });
        setIsConfirmOpen(false);
        setDeleteFingerprint(null);
        fetchBlockedFingerprints();
      } else {
        notify({
          message: "Failed to unblock fingerprint",
          type: "error",
        });
      }
    } catch {
      notify({
        message: "Failed to unblock fingerprint",
        type: "error",
      });
    } finally {
      setIsDeletePending(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-8">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* ── Section header ──────────────────────────────────────────── */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 flex items-center justify-center">
              <Fingerprint size={20} weight="fill" className="text-rose-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Blocked Device Fingerprints
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {isLoading
                  ? "Loading…"
                  : `${total} device${total !== 1 ? "s" : ""} blocked`}
              </p>
            </div>
          </div>
          {canManage && (
            <Button
              type="button"
              onClick={() => setIsAddingOpen((open) => !open)}
              variant={isAddingOpen ? "outline" : "default"}
            >
              {isAddingOpen ? <X size={15} /> : <Plus size={15} />}
              {isAddingOpen ? "Cancel" : "Block Fingerprint"}
            </Button>
          )}
        </div>

        {/* ── Add form ─────────────────────────────────────────────────── */}
        {isAddingOpen && (
          <form
            className="px-6 py-5 border-b border-gray-100 bg-slate-50"
            noValidate
            onSubmit={addForm.handleSubmit(handleAdd)}
          >
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Block a Device Fingerprint
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <Field invalid={Boolean(addForm.formState.errors.fingerprint)}>
                <FieldLabel className="text-xs font-medium text-gray-600">
                  Fingerprint <span className="text-red-500">*</span>
                </FieldLabel>
                <Input
                  {...addForm.register("fingerprint")}
                  placeholder="Device fingerprint hash"
                  className="font-mono placeholder:font-sans"
                />
                <FieldError>
                  {addForm.formState.errors.fingerprint?.message}
                </FieldError>
              </Field>
              <Field invalid={Boolean(addForm.formState.errors.reason)}>
                <FieldLabel className="text-xs font-medium text-gray-600">
                  Reason <span className="text-gray-400">(optional)</span>
                </FieldLabel>
                <Input
                  {...addForm.register("reason")}
                  placeholder="Reason for blocking"
                />
                <FieldError>
                  {addForm.formState.errors.reason?.message}
                </FieldError>
              </Field>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                type="submit"
                variant="destructive"
                isPending={addForm.formState.isSubmitting}
              >
                <Fingerprint size={14} />
                Block Device
              </Button>
            </div>
          </form>
        )}

        {/* ── Table ────────────────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-900 text-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide w-10">
                  #
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Fingerprint
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide">
                  Associated Users
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
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div
                          className="h-3.5 bg-gray-100 rounded-full animate-pulse"
                          style={{ width: `${50 + ((j * 17) % 45)}%` }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : blockedFingerprints.length === 0 ? (
                <tr>
                  <td
                    colSpan={canManage ? 6 : 5}
                    className="px-4 py-16 text-center bg-white"
                  >
                    <Fingerprint
                      size={40}
                      className="mx-auto mb-3 text-gray-200"
                      weight="fill"
                    />
                    <p className="font-medium text-gray-400">
                      No blocked fingerprints
                    </p>
                    <p className="text-xs text-gray-300 mt-1">
                      Use the button above to block a device fingerprint
                    </p>
                  </td>
                </tr>
              ) : (
                blockedFingerprints.map((item, i) => (
                  <tr
                    key={item.id}
                    className="bg-white hover:bg-slate-50/60 transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {(page - 1) * limit + i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="font-mono text-xs text-gray-700 bg-gray-50 px-2 py-1 rounded-md border border-gray-100"
                        title={item.fingerprint}
                      >
                        {item.fingerprint.substring(0, 16)}…
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {item.reason || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {item.associated_users?.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {item.associated_users.map((u, j) => (
                            <span key={j} className="text-xs text-gray-600">
                              <span className="font-medium">@{u.username}</span>
                              <span className="text-gray-400 ml-1">
                                ({u.email})
                              </span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">
                          No linked accounts
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 text-center">
                      {formatDateAsDDMMYYYY(item.created_at)}
                    </td>
                    {canManage && (
                      <td className="px-4 py-3 text-center">
                        <Button
                          type="button"
                          onClick={() => {
                            setDeleteFingerprint(item.fingerprint);
                            setIsConfirmOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          title="Unblock fingerprint"
                        >
                          <LockKeyOpen size={13} />
                          Unblock
                        </Button>
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
          if (!open && !isDeletePending) {
            setIsConfirmOpen(false);
            setDeleteFingerprint(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock device?</AlertDialogTitle>
            <AlertDialogDescription>
              This device fingerprint can sign in and register again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel autoFocus disabled={isDeletePending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={isDeletePending}
            >
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default BlockedFingerprintsManagement;
