"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CaretDown,
  CaretUp,
  CaretUpDown,
  CloudArrowUp,
  CurrencyDollar,
  DownloadSimple,
  Eye,
  Funnel,
  Gear,
  MagnifyingGlass,
  Megaphone,
  Trash,
  UserCircle,
  X,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReactPaginate from "react-paginate";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
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
import { Badge } from "@/app/components/ui/badge";
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
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Textarea } from "@/app/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatDateAsDDMMYYYY } from "@/utils/formatDate";
import { AdminIconTooltip } from "../_components/AdminIconTooltip";
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
const adminUserSortFields = [
  "identity",
  "plan",
  "verification",
  "registered",
] as const;
type AdminUserSort = (typeof adminUserSortFields)[number];
type SortDirection = "asc" | "desc";
const filterTextFields = [
  ["email", "Email"],
  ["first_name", "First Name"],
  ["middle_name", "Middle Name"],
  ["last_name", "Last Name"],
  ["username", "Username"],
  ["country", "Country"],
] as const;

const filterLabels: Record<keyof AdminUserFilterInput, string> = {
  email: "Email",
  first_name: "First name",
  middle_name: "Middle name",
  last_name: "Last name",
  username: "Username",
  country: "Country",
  subscription_status: "Plan",
  isVerified: "Verification",
};

function userDisplayName(user: AdminUser) {
  const name = [user.title, user.first_name, user.last_name]
    .filter(Boolean)
    .join(" ");
  return name || user.username || user.email || "Unnamed user";
}

function planLabel(user: AdminUser) {
  return user.subscription_status || "FREE";
}

function activeFilterEntries(filters: AdminUserFilterInput) {
  return (Object.entries(filters) as [keyof AdminUserFilterInput, string][])
    .filter(([, value]) => value !== "" && value !== "all")
    .map(([key, value]) => ({
      key,
      label: filterLabels[key],
      value:
        key === "isVerified"
          ? value === "true"
            ? "Verified"
            : "Not verified"
          : value,
    }));
}

function SortableTableHead({
  field,
  label,
  currentSort,
  direction,
  onSort,
}: {
  field: AdminUserSort;
  label: string;
  currentSort: AdminUserSort;
  direction: SortDirection;
  onSort: (field: AdminUserSort) => void;
}) {
  const active = currentSort === field;
  const Icon = !active
    ? CaretUpDown
    : direction === "asc"
      ? CaretUp
      : CaretDown;
  return (
    <TableHead
      aria-sort={
        active ? (direction === "asc" ? "ascending" : "descending") : "none"
      }
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="-ml-3"
        onClick={() => onSort(field)}
      >
        {label}
        <Icon aria-hidden="true" className="size-4" />
        <span className="sr-only">
          {active
            ? `, sorted ${direction === "asc" ? "ascending" : "descending"}`
            : ", not sorted"}
        </span>
      </Button>
    </TableHead>
  );
}

export default function UsersManagement() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [data, setData] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [filters, setFilters] = useState<AdminUserFilterInput>(
    emptyAdminUserFilters,
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<AdminUserSort>("registered");
  const [direction, setDirection] = useState<SortDirection>("desc");
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
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const listRequestSequence = useRef(0);

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
      const requestId = ++listRequestSequence.current;
      setIsLoading(true);
      setLoadError("");
      try {
        const response = await fetch("/api/user/list", {
          method: "POST",
          body: JSON.stringify({
            page,
            limit,
            search: search || undefined,
            sort,
            direction,
            filters: toAdminUserFilterPayload(filters),
          }),
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(body?.error || "Users could not be loaded");
        }
        const userList = parseAdminUserListResponse(body);
        if (requestId !== listRequestSequence.current) return false;
        setData(userList.data);
        setTotal(userList.count);
        return true;
      } catch (error) {
        if (requestId !== listRequestSequence.current) return false;
        if (!preserveExisting) {
          setData([]);
          setTotal(0);
        }
        setLoadError(
          error instanceof Error ? error.message : "Users could not be loaded",
        );
        return false;
      } finally {
        if (requestId === listRequestSequence.current) setIsLoading(false);
      }
    },
    [direction, filters, limit, page, search, sort],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextSearch = searchInput.trim();
      setSearch(nextSearch);
      setPage(1);
    }, 350);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

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
    let active = true;
    queueMicrotask(() => {
      if (active && authorized) void fetchUserList();
    });
    return () => {
      active = false;
    };
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

  const clearFilter = (key: keyof AdminUserFilterInput) => {
    setFilters((current) => ({
      ...current,
      [key]: key === "subscription_status" || key === "isVerified" ? "all" : "",
    }));
    setPage(1);
  };

  const changeSort = (nextSort: AdminUserSort) => {
    setDirection((current) =>
      sort === nextSort ? (current === "asc" ? "desc" : "asc") : "asc",
    );
    setSort(nextSort);
    setPage(1);
  };

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
  const activeFilters = activeFilterEntries(filters);
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

      <div className="mb-6 space-y-4 rounded-xl border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <Field id="user-directory-search" className="w-full lg:max-w-xl">
            <FieldLabel>Search users</FieldLabel>
            <div className="relative">
              <MagnifyingGlass
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                value={searchInput}
                maxLength={160}
                className="pr-10 pl-9"
                placeholder="Email, name, or username"
                onChange={(event) => setSearchInput(event.target.value)}
              />
              {searchInput && (
                <AdminIconTooltip label="Clear search">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-0.5 -translate-y-1/2"
                    aria-label="Clear user search"
                    onClick={() => {
                      setSearchInput("");
                      setSearch("");
                      setPage(1);
                    }}
                  >
                    <X aria-hidden="true" className="size-4" />
                  </Button>
                </AdminIconTooltip>
              )}
            </div>
          </Field>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                filterForm.reset(filters);
                setFilterOpen(true);
              }}
            >
              <Funnel aria-hidden="true" className="size-4" />
              Filters{activeFilters.length ? ` (${activeFilters.length})` : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                announcementForm.reset(announcements);
                setAnnouncementOpen(true);
              }}
            >
              <Megaphone aria-hidden="true" className="size-4" />
              Universal Message
            </Button>
            <Button
              type="button"
              variant="outline"
              isPending={exportLoading}
              onClick={() => void handleExportUsers()}
            >
              <DownloadSimple aria-hidden="true" className="size-4" />
              Export Users
            </Button>
            <Link
              href="/admin/paid-users"
              className={buttonVariants({ variant: "outline" })}
            >
              <CurrencyDollar aria-hidden="true" className="size-4" />
              Paid Users &amp; Income
            </Link>
          </div>
        </div>

        {(activeFilters.length > 0 || search) && (
          <div
            aria-label="Active directory filters"
            className="flex flex-wrap items-center gap-2"
          >
            <span className="text-sm font-medium">Active:</span>
            {search && <Badge variant="secondary">Search: {search}</Badge>}
            {activeFilters.map(({ key, label, value }) => (
              <Badge key={key} variant="outline" className="gap-1 pr-1">
                {label}: {value}
                <AdminIconTooltip label={`Remove ${label} filter`}>
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove ${label} filter`}
                    onClick={() => clearFilter(key)}
                  >
                    <X aria-hidden="true" className="size-3" />
                  </button>
                </AdminIconTooltip>
              </Badge>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setFilters(emptyAdminUserFilters);
                filterForm.reset(emptyAdminUserFilters);
                setPage(1);
              }}
            >
              Clear all
            </Button>
          </div>
        )}
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <p aria-live="polite">
          {isLoading
            ? "Loading users…"
            : `${total.toLocaleString()} ${total === 1 ? "user" : "users"}`}
        </p>
        {!isLoading && total > 0 && (
          <p>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
          </p>
        )}
      </div>

      <div className="mb-6 rounded-xl border bg-card shadow-sm">
        <Table aria-label="Admin user directory">
          <TableHeader>
            <TableRow>
              <SortableTableHead
                field="identity"
                label="Identity"
                currentSort={sort}
                direction={direction}
                onSort={changeSort}
              />
              <SortableTableHead
                field="plan"
                label="Plan"
                currentSort={sort}
                direction={direction}
                onSort={changeSort}
              />
              <SortableTableHead
                field="verification"
                label="Verification"
                currentSort={sort}
                direction={direction}
                onSort={changeSort}
              />
              <SortableTableHead
                field="registered"
                label="Registered"
                currentSort={sort}
                direction={direction}
                onSort={changeSort}
              />
              <TableHead className="sticky right-0 bg-card text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: Math.min(limit, 6) }).map((_, index) => (
                <TableRow key={`skeleton-${index}`}>
                  {Array.from({ length: 5 }).map((__, cellIndex) => (
                    <TableCell key={`skeleton-cell-${cellIndex}`}>
                      <Skeleton className="h-5 w-full min-w-20" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-32 text-center text-muted-foreground"
                >
                  No users found. Clear search or adjust the active filters.
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="min-w-64 whitespace-normal">
                    <div className="font-medium">{userDisplayName(row)}</div>
                    <div className="text-muted-foreground">
                      {row.email || "No email"}
                    </div>
                    {row.username && (
                      <div className="text-xs text-muted-foreground">
                        @{row.username}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge
                        variant={
                          row.subscription_status ? "default" : "secondary"
                        }
                      >
                        {planLabel(row)}
                      </Badge>
                      {row.trial_end &&
                        new Date(row.trial_end) > new Date() && (
                          <Badge variant="outline">Trialing</Badge>
                        )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={row.isVerified ? "default" : "outline"}>
                      {row.isVerified ? "Verified" : "Not verified"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {row.created_at
                      ? formatAdminDate(row.created_at)
                      : "Unknown"}
                  </TableCell>
                  <TableCell className="sticky right-0 bg-card">
                    <div className="flex justify-end gap-1">
                      <AdminIconTooltip label="View account details">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`View account details for ${row.email ?? "user"}`}
                          onClick={() => setDetailUser(row)}
                        >
                          <UserCircle aria-hidden="true" className="size-5" />
                        </Button>
                      </AdminIconTooltip>
                      {Boolean(row.dentistries) && row.username && (
                        <>
                          <AdminIconTooltip label="View public profile">
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
                          </AdminIconTooltip>
                          <AdminIconTooltip label="Open user dashboard">
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
                          </AdminIconTooltip>
                          <AdminIconTooltip label="Change plan">
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
                          </AdminIconTooltip>
                        </>
                      )}
                      <AdminIconTooltip label="Delete user">
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
                      </AdminIconTooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {!isLoading && !loadError && (
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
          {totalPages > 1 && (
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
          )}
        </div>
      )}

      <Dialog
        open={detailUser !== null}
        onOpenChange={(open) => {
          if (!open) setDetailUser(null);
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Account details</DialogTitle>
            <DialogDescription>
              Read-only account information from the authorized user directory.
            </DialogDescription>
          </DialogHeader>
          {detailUser && (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Canonical identity</dt>
                <dd className="font-medium">{userDisplayName(detailUser)}</dd>
                <dd>{detailUser.email || "No email"}</dd>
                <dd>
                  {detailUser.username
                    ? `@${detailUser.username}`
                    : "No username"}
                </dd>
                <dd className="mt-1 break-all text-xs text-muted-foreground">
                  Account ID: {detailUser.id}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Plan</dt>
                <dd className="font-medium">{planLabel(detailUser)}</dd>
                <dd>
                  Period ends:{" "}
                  {detailUser.current_period_end
                    ? formatAdminDate(detailUser.current_period_end)
                    : "Not set"}
                </dd>
                <dd>
                  Trial ends:{" "}
                  {detailUser.trial_end
                    ? formatAdminDate(detailUser.trial_end)
                    : "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Verification</dt>
                <dd>{detailUser.isVerified ? "Verified" : "Not verified"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Location</dt>
                <dd>{detailUser.country || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Position</dt>
                <dd>{detailUser.position || "Not provided"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Registered</dt>
                <dd>
                  {detailUser.created_at
                    ? formatAdminDate(detailUser.created_at)
                    : "Unknown"}
                </dd>
              </div>
            </dl>
          )}
          <DialogFooter>
            {detailUser &&
              Boolean(detailUser.dentistries) &&
              detailUser.username && (
                <Link
                  href={`/${detailUser.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Eye aria-hidden="true" className="size-4" />
                  Open public profile
                </Link>
              )}
            <Button type="button" onClick={() => setDetailUser(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                variant="ghost"
                onClick={() => filterForm.reset(emptyAdminUserFilters)}
              >
                Reset filters
              </Button>
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
