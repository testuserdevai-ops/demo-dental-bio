"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CloudArrowUp,
  CurrencyDollar,
  DownloadSimple,
  Eye,
  Funnel,
  Gear,
  Megaphone,
  Trash,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactPaginate from "react-paginate";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import VerificationBadge from "@/app/components/VerificationBadge";
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
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Button, buttonVariants } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/app/components/ui/field";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";
import UpgradePlanModal from "./upgradePlanModal";
import {
  adminUserFilterSchema,
  announcementSchema,
  emptyAdminUserFilters,
  toAdminUserFilterPayload,
  type AdminPlanUser,
  type AdminUserFilterInput,
  type AnnouncementInput,
} from "./user-management-schema";

type AdminUser = AdminPlanUser & {
  title?: string | null;
  username?: string | null;
  position?: string | null;
  country?: string | null;
  created_at?: string | Date | null;
  current_period_end?: string | Date | null;
  trial_end?: string | Date | null;
  isVerified?: boolean | null;
  dentistries?: unknown;
};

type UserListResponse = { data: AdminUser[]; count: number };

export function parseAdminUserListResponse(value: unknown): UserListResponse {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { data?: unknown }).data) ||
    typeof (value as { count?: unknown }).count !== "number"
  ) {
    throw new Error("The user list returned an invalid response");
  }
  return value as UserListResponse;
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function formatAdminDate(value: string | Date) {
  return formatDateAsDDMMYYYY(
    typeof value === "string" ? value : value.toISOString(),
  );
}

function convertToCSV(rows: Record<string, unknown>[]) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
  ].join("\n");
}

const pageSizeOptions = [10, 15, 20, 25];
const filterTextFields = [
  ["email", "Email"],
  ["first_name", "First Name"],
  ["middle_name", "Middle Name"],
  ["last_name", "Last Name"],
  ["username", "Username"],
  ["country", "Country"],
] as const;

export default function UsersManagement() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState<AdminUserFilterInput>(
    emptyAdminUserFilters,
  );
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [announcementOpen, setAnnouncementOpen] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementInput>({
    title: "",
    content: "",
  });
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [upgradeUser, setUpgradeUser] = useState<AdminUser | null>(null);
  const [exportLoading, setExportLoading] = useState(false);

  const filterForm = useForm<AdminUserFilterInput>({
    resolver: zodResolver(adminUserFilterSchema),
    defaultValues: emptyAdminUserFilters,
  });
  const announcementForm = useForm<AnnouncementInput>({
    resolver: zodResolver(announcementSchema),
    defaultValues: announcements,
  });
  const resetAnnouncementForm = announcementForm.reset;

  const fetchUserList = useCallback(
    async ({ preserveExisting = false } = {}): Promise<boolean> => {
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await fetch("/api/user/list", {
          method: "POST",
          body: JSON.stringify({
            page,
            limit,
            filters: toAdminUserFilterPayload(filters),
          }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error || "Users could not be loaded");
        }
        const userList = parseAdminUserListResponse(body);
        setData(userList.data);
        setTotal(userList.count);
        return true;
      } catch (error) {
        if (!preserveExisting) {
          setData([]);
          setTotal(0);
        }
        setLoadError(
          error instanceof Error ? error.message : "Users could not be loaded",
        );
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [filters, limit, page],
  );

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await fetch("/api/admin/user");
        const userData = await response.json().catch(() => null);
        if (!active) return;
        if (!response.ok || userData?.role !== "admin") {
          router.push("/login");
          return;
        }
        setAuthorized(true);
      } catch {
        if (active) router.push("/login");
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (authorized) void fetchUserList();
  }, [authorized, fetchUserList]);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/announcements");
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error();
        const parsed = announcementSchema.safeParse(body);
        if (!parsed.success) throw new Error();
        setAnnouncements(parsed.data);
        resetAnnouncementForm(parsed.data);
      } catch {
        toast.error("Announcements could not be loaded");
      }
    })();
  }, [resetAnnouncementForm]);

  const applyFilters = filterForm.handleSubmit((values) => {
    setFilters(values);
    setPage(1);
    setFilterOpen(false);
  });

  const saveAnnouncements = announcementForm.handleSubmit(async (values) => {
    try {
      const response = await fetch("/api/announcements", {
        method: "PUT",
        body: JSON.stringify(values),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.error) {
        throw new Error(body?.error || "Announcement could not be saved");
      }
      setAnnouncements(values);
      setAnnouncementOpen(false);
      toast.success("Saved announcements content");
    } catch (error) {
      announcementForm.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Announcement could not be saved",
      });
    }
  });

  const handleDelete = async () => {
    if (!deleteUser?.id) return;
    setIsDeleting(true);
    setDeleteError("");
    try {
      const response = await fetch("/api/user", {
        method: "DELETE",
        body: JSON.stringify({ id: deleteUser.id, email: deleteUser.email }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok || body?.error) {
        throw new Error(body?.error || "User could not be deleted");
      }

      setData((current) => current.filter((user) => user.id !== deleteUser.id));
      setTotal((current) => Math.max(0, current - 1));
      setDeleteUser(null);
      toast.success("User deleted");
      const refreshed = await fetchUserList({ preserveExisting: true });
      if (!refreshed)
        toast.error("User deleted, but the list could not be refreshed");
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "User could not be deleted",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdateUser = (
    id: string,
    subscription_status: string,
    current_period_end: Date | null,
  ) => {
    setData((current) =>
      current.map((user) =>
        user.id === id
          ? { ...user, subscription_status, current_period_end }
          : user,
      ),
    );
    toast.success("User plan changed");
  };

  const handleExportUsers = async () => {
    setExportLoading(true);
    try {
      const response = await fetch("/api/user/list", { method: "GET" });
      const body = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(body?.data)) throw new Error();
      const csvContent = convertToCSV(body.data);
      const url = URL.createObjectURL(
        new Blob([csvContent], { type: "text/csv;charset=utf-8;" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "users_export.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error exporting users");
    } finally {
      setExportLoading(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const announcementRootError = announcementForm.formState.errors.root?.message;

  return (
    <div className="mx-auto max-w-[1400px] p-8">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button type="button" onClick={() => router.push("/dashboard")}>
          <ArrowLeft aria-hidden="true" className="size-5" />
          Dashboard
        </Button>
      </div>

      <div className="mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => {
            filterForm.reset(filters);
            setFilterOpen(true);
          }}
        >
          <Funnel aria-hidden="true" className="size-5" />
          Filters
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto"
          onClick={() => {
            announcementForm.reset(announcements);
            setAnnouncementOpen(true);
          }}
        >
          <Megaphone aria-hidden="true" className="size-5" />
          Universal Message
        </Button>
        <Button
          type="button"
          className="w-full sm:w-auto"
          isPending={exportLoading}
          onClick={() => void handleExportUsers()}
        >
          <DownloadSimple aria-hidden="true" className="size-5" />
          Export Users
        </Button>
        <Link
          href="/admin/paid-users"
          className={cn(buttonVariants(), "w-full sm:w-auto")}
        >
          <CurrencyDollar aria-hidden="true" className="size-5" />
          Paid Users &amp; Income
        </Link>
      </div>

      {loadError && (
        <Alert variant="destructive" role="alert" className="mb-4">
          <AlertTitle>Users could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{loadError}</span>
            <Button
              type="button"
              variant="outline"
              onClick={() => void fetchUserList({ preserveExisting: true })}
            >
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-6 overflow-x-auto rounded-3xl border border-border bg-white shadow-sm">
        <table className="w-full min-w-[2400px]">
          <thead className="bg-primary text-primary-foreground">
            <tr>
              {[
                "#",
                "Title",
                "First Name",
                "Last Name",
                "Email",
                "Username",
                "Position",
                "Country",
                "Registered At",
                "Subscription Status",
                "Current Period End",
                "Trial End",
                "Verified",
                "Actions",
              ].map((heading) => (
                <th
                  key={heading}
                  className="border-b px-4 py-3 text-left text-sm font-semibold last:text-center"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: limit }).map((_, index) => (
                <tr key={`skeleton-${index}`}>
                  {Array.from({ length: 14 }).map((_, cellIndex) => (
                    <td
                      key={`skeleton-cell-${cellIndex}`}
                      className="px-4 py-3"
                    >
                      <div className="h-4 animate-pulse rounded bg-muted" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={14}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No users found. Try adjusting your filters or search criteria.
                </td>
              </tr>
            ) : (
              data.map((row, index) => (
                <tr
                  key={row.id}
                  className="text-sm text-foreground hover:bg-muted/50"
                >
                  <td className="px-4 py-3">
                    {(page - 1) * limit + index + 1}
                  </td>
                  <td className="px-4 py-3">{row.title}</td>
                  <td className="px-4 py-3">{row.first_name}</td>
                  <td className="px-4 py-3">{row.last_name}</td>
                  <td className="px-4 py-3">{row.email}</td>
                  <td className="px-4 py-3">{row.username}</td>
                  <td className="px-4 py-3">{row.position}</td>
                  <td className="px-4 py-3">{row.country}</td>
                  <td className="px-4 py-3 text-center">
                    {row.created_at ? formatAdminDate(row.created_at) : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex flex-col items-center justify-center gap-1">
                      {row.trial_end &&
                        new Date(row.trial_end) > new Date() && (
                          <span className="rounded-full bg-blue-500 px-2.5 py-0.5 text-xs font-medium text-white">
                            trialing
                          </span>
                        )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
                          row.subscription_status === "PRO"
                            ? "bg-green-500"
                            : row.subscription_status === "PREMIUM PRO"
                              ? "bg-purple-500"
                              : "bg-gray-500"
                        }`}
                      >
                        {row.subscription_status || "Free"}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.current_period_end
                      ? formatAdminDate(row.current_period_end)
                      : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.trial_end ? formatAdminDate(row.trial_end) : "-"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.isVerified ? <VerificationBadge /> : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      {Boolean(row.dentistries) && row.username && (
                        <>
                          <Link
                            href={`/${row.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={buttonVariants({
                              variant: "ghost",
                              size: "icon",
                            })}
                            aria-label={`View ${row.username}'s public profile`}
                          >
                            <Eye aria-hidden="true" className="size-5" />
                          </Link>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`View ${row.email ?? "user"} dashboard`}
                            onClick={() =>
                              window.open(
                                `/dashboard?userId=${row.id}`,
                                "_blank",
                              )
                            }
                          >
                            <Gear aria-hidden="true" className="size-5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label={`Change plan for ${row.email ?? "user"}`}
                            onClick={() => setUpgradeUser(row)}
                          >
                            <CloudArrowUp
                              aria-hidden="true"
                              className="size-5"
                            />
                          </Button>
                        </>
                      )}
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        aria-label={`Delete ${row.email ?? "user"}`}
                        onClick={() => {
                          setDeleteError("");
                          setDeleteUser(row);
                        }}
                      >
                        <Trash aria-hidden="true" className="size-5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col items-end justify-end gap-4 sm:flex-row sm:items-center">
          <Field id="page-size" className="w-36">
            <FieldLabel>Rows per page</FieldLabel>
            <Select
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <ReactPaginate
            previousLabel="Previous"
            nextLabel="Next"
            breakLabel="…"
            pageCount={totalPages}
            marginPagesDisplayed={1}
            pageRangeDisplayed={3}
            onPageChange={({ selected }) => setPage(selected + 1)}
            forcePage={page - 1}
            containerClassName="flex items-center gap-1"
            pageClassName="rounded-md px-3 py-2 hover:bg-muted"
            activeClassName="bg-primary text-primary-foreground"
            previousClassName="rounded-md px-3 py-2 hover:bg-muted"
            nextClassName="rounded-md px-3 py-2 hover:bg-muted"
            disabledClassName="pointer-events-none opacity-50"
            breakClassName="px-3 py-2"
          />
        </div>
      )}

      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter users</DialogTitle>
            <DialogDescription>
              Narrow the admin list without changing any user data.
            </DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={applyFilters} className="space-y-4">
            <div className="grid max-h-[55vh] gap-4 overflow-y-auto px-1 sm:grid-cols-2">
              {filterTextFields.map(([name, label]) => (
                <Field
                  key={name}
                  id={`filter-${name.replace(/_/g, "-")}`}
                  invalid={Boolean(filterForm.formState.errors[name])}
                >
                  <FieldLabel>{label}</FieldLabel>
                  <Input {...filterForm.register(name)} />
                  {filterForm.formState.errors[name] && (
                    <FieldError assertive>
                      {filterForm.formState.errors[name]?.message}
                    </FieldError>
                  )}
                </Field>
              ))}
              <Controller
                control={filterForm.control}
                name="subscription_status"
                render={({ field }) => (
                  <Field id="filter-subscription-status">
                    <FieldLabel>Subscription status</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger ref={field.ref}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="trialing">Trialing</SelectItem>
                        <SelectItem value="FREE">Free</SelectItem>
                        <SelectItem value="PRO">Pro</SelectItem>
                        <SelectItem value="PREMIUM PRO">Premium Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
              <Controller
                control={filterForm.control}
                name="isVerified"
                render={({ field }) => (
                  <Field id="filter-verification-status">
                    <FieldLabel>Verification status</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger ref={field.ref}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="true">Verified</SelectItem>
                        <SelectItem value="false">Not verified</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setFilterOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Apply filters</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage announcements</DialogTitle>
            <DialogDescription>
              Update the universal message shown across the product.
            </DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={saveAnnouncements} className="space-y-4">
            <Field
              id="announcement-title"
              invalid={Boolean(announcementForm.formState.errors.title)}
            >
              <FieldLabel>Title</FieldLabel>
              <Input {...announcementForm.register("title")} />
              {announcementForm.formState.errors.title && (
                <FieldError assertive>
                  {announcementForm.formState.errors.title.message}
                </FieldError>
              )}
            </Field>
            <Field
              id="announcement-content"
              invalid={Boolean(announcementForm.formState.errors.content)}
            >
              <FieldLabel>Content</FieldLabel>
              <Textarea {...announcementForm.register("content")} />
              {announcementForm.formState.errors.content && (
                <FieldError assertive>
                  {announcementForm.formState.errors.content.message}
                </FieldError>
              )}
            </Field>
            {announcementRootError && (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Announcement was not saved</AlertTitle>
                <AlertDescription>{announcementRootError}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={announcementForm.formState.isSubmitting}
                onClick={() => setAnnouncementOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isPending={announcementForm.formState.isSubmitting}
              >
                Save announcement
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteUser !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setDeleteUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete {deleteUser?.email ?? "this user"}? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && (
            <Alert variant="destructive" role="alert">
              <AlertTitle>User was not deleted</AlertTitle>
              <AlertDescription>{deleteError}</AlertDescription>
            </Alert>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {isDeleting ? "Deleting…" : "Delete user"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <UpgradePlanModal
        isOpen={upgradeUser !== null}
        onClose={() => setUpgradeUser(null)}
        user={upgradeUser}
        onSuccess={handleUpdateUser}
      />
    </div>
  );
}
