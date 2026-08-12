"use client";

import {
  ArrowClockwise,
  ClockCountdown,
  MagnifyingGlass,
  ShieldWarning,
  UserCircle,
} from "@phosphor-icons/react";
import Link from "next/link";
import * as React from "react";

import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button, buttonVariants } from "@/app/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Textarea } from "@/app/components/ui/textarea";
import {
  reportCategories,
  reportCategoryLabels,
  reportOutcomeLabels,
  reportOutcomes,
  reportPriorities,
  reportPriorityLabels,
  reportStatuses,
  reportStatusLabels,
  type ReportCategory,
  type ReportOutcome,
  type ReportPriority,
  type ReportStatus,
} from "@/lib/reporting/contract";

type QueueReport = {
  id: string;
  profile_id: string;
  profile_username: string;
  category: ReportCategory;
  severity: ReportPriority;
  status: ReportStatus;
  priority: ReportPriority;
  priority_rank: number;
  assigned_to: string | null;
  sla_due_at: string;
  created_at: string;
  updated_at: string;
  version: number;
};

type Moderator = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
};

type QueueResponse = {
  data: QueueReport[];
  count: number;
  summary: {
    open: number;
    new: number;
    unassigned: number;
    overdue: number;
    critical: number;
  };
  moderators: Moderator[];
};

type ReportDetail = {
  report: QueueReport & {
    details: string | null;
    reporter_email: string | null;
    reporter_email_expires_at: string | null;
    public_url: string;
    profile_snapshot: Record<string, unknown>;
    outcome: ReportOutcome | null;
    outcome_reason: string | null;
    resolved_at: string | null;
  };
  notes: Array<{
    id: string;
    author_id: string;
    note: string;
    created_at: string;
  }>;
  audit: Array<{
    id: number;
    actor_id: string | null;
    action:
      | "submitted"
      | "moderation_updated"
      | "note_added"
      | "reporter_contact_expired";
    previous_state: Record<string, unknown> | null;
    next_state: Record<string, unknown> | null;
    created_at: string;
  }>;
  priorReports: Array<{
    id: string;
    category: ReportCategory;
    status: ReportStatus;
    priority: ReportPriority;
    created_at: string;
  }>;
};

type Filters = {
  search: string;
  status: "all" | ReportStatus;
  category: "all" | ReportCategory;
  priority: "all" | ReportPriority;
  assignee: "all" | "unassigned" | string;
  overdue: boolean;
  sort: "created_at" | "updated_at" | "sla_due_at" | "priority_rank";
  direction: "asc" | "desc";
};

const initialFilters: Filters = {
  search: "",
  status: "all",
  category: "all",
  priority: "all",
  assignee: "all",
  overdue: false,
  sort: "created_at",
  direction: "desc",
};

function dateTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function moderatorName(moderator: Moderator) {
  const name = [moderator.first_name, moderator.last_name]
    .filter(Boolean)
    .join(" ");
  return name || moderator.email;
}

function statusVariant(status: ReportStatus) {
  return status === "action_required"
    ? "destructive"
    : status === "resolved" || status === "dismissed"
      ? "secondary"
      : "outline";
}

function priorityVariant(priority: ReportPriority) {
  return priority === "critical" || priority === "high"
    ? "destructive"
    : "secondary";
}

function buildQueueUrl(filters: Filters, page: number) {
  const params = new URLSearchParams({
    page: String(page),
    limit: "25",
    sort: filters.sort,
    direction: filters.direction,
  });
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.priority !== "all") params.set("priority", filters.priority);
  if (filters.assignee !== "all") params.set("assignee", filters.assignee);
  if (filters.overdue) params.set("overdue", "true");
  return `/api/admin/reports?${params}`;
}

export function ReportsManagement({
  currentActorId,
}: {
  currentActorId: string;
}) {
  const [filters, setFilters] = React.useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = React.useState(initialFilters);
  const [page, setPage] = React.useState(1);
  const [queue, setQueue] = React.useState<QueueResponse | null>(null);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [detail, setDetail] = React.useState<ReportDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [detailLoading, setDetailLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const requestSequence = React.useRef(0);

  const loadQueue = React.useCallback(async () => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setError(null);
    const response = await fetch(buildQueueUrl(appliedFilters, page), {
      cache: "no-store",
    }).catch(() => null);
    if (sequence !== requestSequence.current) return;
    if (!response?.ok) {
      const payload = await response?.json().catch(() => null);
      setError(payload?.error ?? "The report queue could not be loaded.");
      setLoading(false);
      return;
    }
    setQueue((await response.json()) as QueueResponse);
    setLoading(false);
  }, [appliedFilters, page]);

  React.useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (active) void loadQueue();
    });
    return () => {
      active = false;
    };
  }, [loadQueue]);

  async function openReport(id: string) {
    setSelectedId(id);
    setDetail(null);
    setDetailLoading(true);
    const response = await fetch(
      `/api/admin/reports?id=${encodeURIComponent(id)}`,
      {
        cache: "no-store",
      },
    ).catch(() => null);
    if (!response?.ok) {
      setError("The report details could not be loaded.");
      setSelectedId(null);
      setDetailLoading(false);
      return;
    }
    setDetail((await response.json()) as ReportDetail);
    setDetailLoading(false);
  }

  function applyFilters() {
    setPage(1);
    setAppliedFilters(filters);
  }

  const totalPages = Math.max(1, Math.ceil((queue?.count ?? 0) / 25));

  return (
    <div className="mx-auto max-w-[1500px] space-y-6 p-4 sm:p-8 lg:p-10">
      <header className="space-y-2">
        <p className="text-sm font-semibold text-primary">Trust and safety</p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Profile reports
        </h1>
        <p className="max-w-3xl text-muted-foreground">
          Triage public-profile concerns, preserve every original report, and
          record accountable moderation decisions without automatic enforcement.
        </p>
      </header>

      {queue ? (
        <section
          aria-label="Report queue summary"
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
        >
          {[
            ["Open", queue.summary.open],
            ["New", queue.summary.new],
            ["Unassigned", queue.summary.unassigned],
            ["Overdue", queue.summary.overdue],
            ["Critical", queue.summary.critical],
          ].map(([label, count]) => (
            <Card key={label}>
              <CardContent className="pt-6">
                <p className="text-sm font-medium text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 text-3xl font-bold tabular-nums">{count}</p>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Review queue</CardTitle>
          <CardDescription>
            Search by report UUID, profile UUID, or username. Filters are
            server-authoritative and pagination is bounded to 25 reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative md:col-span-2">
              <MagnifyingGlass
                aria-hidden="true"
                className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                aria-label="Search reports"
                className="pl-10"
                maxLength={160}
                placeholder="Report ID, profile ID, or username"
                value={filters.search}
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    search: event.target.value,
                  }))
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") applyFilters();
                }}
              />
            </div>
            <QueueSelect
              label="Status"
              value={filters.status}
              onValueChange={(status) =>
                setFilters((current) => ({
                  ...current,
                  status: status as Filters["status"],
                }))
              }
              options={[
                ["all", "All statuses"],
                ...reportStatuses.map(
                  (status) => [status, reportStatusLabels[status]] as const,
                ),
              ]}
            />
            <QueueSelect
              label="Category"
              value={filters.category}
              onValueChange={(category) =>
                setFilters((current) => ({
                  ...current,
                  category: category as Filters["category"],
                }))
              }
              options={[
                ["all", "All categories"],
                ...reportCategories.map(
                  (category) =>
                    [category, reportCategoryLabels[category]] as const,
                ),
              ]}
            />
            <QueueSelect
              label="Priority"
              value={filters.priority}
              onValueChange={(priority) =>
                setFilters((current) => ({
                  ...current,
                  priority: priority as Filters["priority"],
                }))
              }
              options={[
                ["all", "All priorities"],
                ...reportPriorities.map(
                  (priority) =>
                    [priority, reportPriorityLabels[priority]] as const,
                ),
              ]}
            />
            <QueueSelect
              label="Assignee"
              value={filters.assignee}
              onValueChange={(assignee) =>
                setFilters((current) => ({ ...current, assignee }))
              }
              options={[
                ["all", "All assignees"],
                ["unassigned", "Unassigned"],
                ...(queue?.moderators ?? []).map(
                  (moderator) =>
                    [moderator.id, moderatorName(moderator)] as const,
                ),
              ]}
            />
            <QueueSelect
              label="Sort"
              value={`${filters.sort}:${filters.direction}`}
              onValueChange={(value) => {
                const [sort, direction] = value.split(":") as [
                  Filters["sort"],
                  Filters["direction"],
                ];
                setFilters((current) => ({ ...current, sort, direction }));
              }}
              options={[
                ["created_at:desc", "Newest first"],
                ["created_at:asc", "Oldest first"],
                ["priority_rank:asc", "Highest priority"],
                ["sla_due_at:asc", "SLA due first"],
                ["updated_at:desc", "Recently updated"],
              ]}
            />
            <label className="flex min-h-11 items-center gap-2 rounded-md border px-3 text-sm font-medium">
              <input
                checked={filters.overdue}
                type="checkbox"
                onChange={(event) =>
                  setFilters((current) => ({
                    ...current,
                    overdue: event.target.checked,
                  }))
                }
              />
              Overdue only
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={applyFilters}>
              Apply filters
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFilters(initialFilters);
                setAppliedFilters(initialFilters);
                setPage(1);
              }}
            >
              Clear filters
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void loadQueue()}
            >
              <ArrowClockwise aria-hidden="true" className="size-4" />
              Refresh
            </Button>
          </div>

          {error ? (
            <Alert variant="destructive" role="alert">
              <AlertTitle>Report queue unavailable</AlertTitle>
              <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
                {error}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void loadQueue()}
                >
                  Try again
                </Button>
              </AlertDescription>
            </Alert>
          ) : null}

          {loading ? (
            <div className="rounded-md border p-8 text-center" role="status">
              Loading report queue…
            </div>
          ) : queue?.data.length ? (
            <div className="overflow-x-auto rounded-md border">
              <Table aria-label="Profile report queue">
                <TableCaption>
                  Showing {queue.data.length} of {queue.count} reports.
                </TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Report</TableHead>
                    <TableHead>Profile</TableHead>
                    <TableHead>Concern</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>SLA</TableHead>
                    <TableHead>Assigned</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {queue.data.map((report) => {
                    const overdue =
                      new Date(report.sla_due_at) < new Date() &&
                      !["resolved", "dismissed"].includes(report.status);
                    const assignee = queue.moderators.find(
                      ({ id }) => id === report.assigned_to,
                    );
                    return (
                      <TableRow key={report.id}>
                        <TableCell>
                          <p className="font-mono text-xs font-semibold">
                            {report.id.slice(0, 8).toUpperCase()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {dateTime(report.created_at)}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold">
                            @{report.profile_username}
                          </p>
                          <p className="font-mono text-xs text-muted-foreground">
                            {report.profile_id.slice(0, 8)}…
                          </p>
                        </TableCell>
                        <TableCell>
                          {reportCategoryLabels[report.category]}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(report.status)}>
                            {reportStatusLabels[report.status]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={priorityVariant(report.priority)}>
                            {reportPriorityLabels[report.priority]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              overdue ? "font-semibold text-destructive" : ""
                            }
                          >
                            {overdue ? "Overdue · " : ""}
                            {dateTime(report.sla_due_at)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {assignee ? moderatorName(assignee) : "Unassigned"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            aria-label={`Review report ${report.id.slice(0, 8)} for ${report.profile_username}`}
                            size="sm"
                            variant="outline"
                            onClick={() => void openReport(report.id)}
                          >
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="rounded-md border border-dashed p-10 text-center">
              <ShieldWarning
                aria-hidden="true"
                className="mx-auto size-10 text-muted-foreground"
              />
              <p className="mt-3 font-semibold">
                No reports match these filters
              </p>
              <p className="text-sm text-muted-foreground">
                Clear the filters or refresh the queue.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                disabled={page <= 1}
                type="button"
                variant="outline"
                onClick={() => setPage((current) => current - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={page >= totalPages}
                type="button"
                variant="outline"
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ReportDetailDialog
        currentActorId={currentActorId}
        detail={detail}
        loading={detailLoading}
        moderators={queue?.moderators ?? []}
        open={Boolean(selectedId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedId(null);
            setDetail(null);
          }
        }}
        onSaved={async () => {
          if (selectedId) await openReport(selectedId);
          await loadQueue();
        }}
      />
    </div>
  );
}

function QueueSelect({
  label,
  value,
  onValueChange,
  options,
  disabled = false,
}: {
  label: string;
  value: string;
  onValueChange(value: string): void;
  options: readonly (readonly [string, string])[];
  disabled?: boolean;
}) {
  return (
    <Select disabled={disabled} value={value} onValueChange={onValueChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map(([optionValue, optionLabel]) => (
          <SelectItem key={optionValue} value={optionValue}>
            {optionLabel}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ReportDetailDialog({
  currentActorId,
  detail,
  loading,
  moderators,
  open,
  onOpenChange,
  onSaved,
}: {
  currentActorId: string;
  detail: ReportDetail | null;
  loading: boolean;
  moderators: Moderator[];
  open: boolean;
  onOpenChange(open: boolean): void;
  onSaved(): Promise<void>;
}) {
  const [draft, setDraft] = React.useState<{
    status: ReportStatus;
    priority: ReportPriority;
    assignedTo: string;
    outcome: "none" | ReportOutcome;
    outcomeReason: string;
  } | null>(null);
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!detail) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setDraft({
        status: detail.report.status,
        priority: detail.report.priority,
        assignedTo: detail.report.assigned_to ?? "unassigned",
        outcome: detail.report.outcome ?? "none",
        outcomeReason: detail.report.outcome_reason ?? "",
      });
      setNote("");
      setError(null);
    });
    return () => {
      active = false;
    };
  }, [detail]);

  async function saveDecision() {
    if (!detail || !draft) return;
    setSaving(true);
    setError(null);
    const response = await fetch("/api/admin/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: detail.report.id,
        expectedVersion: detail.report.version,
        status: draft.status,
        priority: draft.priority,
        assignedTo: draft.assignedTo === "unassigned" ? null : draft.assignedTo,
        outcome: draft.outcome === "none" ? null : draft.outcome,
        outcomeReason: draft.outcome === "none" ? null : draft.outcomeReason,
      }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "The moderation decision could not be saved.");
      setSaving(false);
      return;
    }
    await onSaved();
    setSaving(false);
  }

  async function addNote() {
    if (!detail || note.trim().length < 2) return;
    setSaving(true);
    setError(null);
    const response = await fetch(
      `/api/admin/reports/${encodeURIComponent(detail.report.id)}/notes`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      setError(payload?.error ?? "The internal note could not be saved.");
      setSaving(false);
      return;
    }
    setNote("");
    await onSaved();
    setSaving(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>Report review</DialogTitle>
          <DialogDescription>
            Submitted evidence, related history, internal notes, and immutable
            moderation audit events.
          </DialogDescription>
        </DialogHeader>
        {loading || !detail || !draft ? (
          <div className="p-10 text-center" role="status">
            Loading report details…
          </div>
        ) : (
          <div className="space-y-6">
            {error ? (
              <Alert variant="destructive" role="alert">
                <AlertTitle>Changes not saved</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid gap-4 lg:grid-cols-3">
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2">
                    @{detail.report.profile_username}
                    <Badge variant={priorityVariant(detail.report.priority)}>
                      {reportPriorityLabels[detail.report.priority]}
                    </Badge>
                    <Badge variant={statusVariant(detail.report.status)}>
                      {reportStatusLabels[detail.report.status]}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="font-mono">
                    {detail.report.id}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <dl className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <dt className="font-semibold">Category</dt>
                      <dd>{reportCategoryLabels[detail.report.category]}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Submitted</dt>
                      <dd>{dateTime(detail.report.created_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">SLA due</dt>
                      <dd>{dateTime(detail.report.sla_due_at)}</dd>
                    </div>
                    <div>
                      <dt className="font-semibold">Reporter contact</dt>
                      <dd>{detail.report.reporter_email ?? "Not provided"}</dd>
                    </div>
                  </dl>
                  <div>
                    <h3 className="font-semibold">Submitted details</h3>
                    <p className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3">
                      {detail.report.details ??
                        "No additional details provided."}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold">
                      Submission-time profile snapshot
                    </h3>
                    <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
                      {JSON.stringify(detail.report.profile_snapshot, null, 2)}
                    </pre>
                  </div>
                  <Link
                    className={buttonVariants({ variant: "outline" })}
                    href={detail.report.public_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open current public profile
                  </Link>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Moderation decision</CardTitle>
                  <CardDescription>
                    High-impact outcomes create a requested review; they do not
                    silently suspend or alter the profile.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <QueueSelect
                    disabled={saving}
                    label="Decision status"
                    value={draft.status}
                    onValueChange={(status) =>
                      setDraft(
                        (current) =>
                          current && {
                            ...current,
                            status: status as ReportStatus,
                          },
                      )
                    }
                    options={reportStatuses.map((status) => [
                      status,
                      reportStatusLabels[status],
                    ])}
                  />
                  <QueueSelect
                    disabled={saving}
                    label="Decision priority"
                    value={draft.priority}
                    onValueChange={(priority) =>
                      setDraft(
                        (current) =>
                          current && {
                            ...current,
                            priority: priority as ReportPriority,
                          },
                      )
                    }
                    options={reportPriorities.map((priority) => [
                      priority,
                      reportPriorityLabels[priority],
                    ])}
                  />
                  <QueueSelect
                    disabled={saving}
                    label="Assigned moderator"
                    value={draft.assignedTo}
                    onValueChange={(assignedTo) =>
                      setDraft(
                        (current) => current && { ...current, assignedTo },
                      )
                    }
                    options={[
                      ["unassigned", "Unassigned"],
                      ...moderators.map(
                        (moderator) =>
                          [
                            moderator.id,
                            `${moderatorName(moderator)}${moderator.id === currentActorId ? " (you)" : ""}`,
                          ] as const,
                      ),
                    ]}
                  />
                  <QueueSelect
                    disabled={saving}
                    label="Outcome"
                    value={draft.outcome}
                    onValueChange={(outcome) =>
                      setDraft(
                        (current) =>
                          current && {
                            ...current,
                            outcome: outcome as typeof draft.outcome,
                          },
                      )
                    }
                    options={[
                      ["none", "No outcome yet"],
                      ...reportOutcomes.map(
                        (outcome) =>
                          [outcome, reportOutcomeLabels[outcome]] as const,
                      ),
                    ]}
                  />
                  <div className="space-y-2">
                    <label
                      className="text-sm font-semibold"
                      htmlFor="moderation-reason"
                    >
                      Outcome reason
                    </label>
                    <Textarea
                      disabled={saving}
                      id="moderation-reason"
                      maxLength={1000}
                      rows={4}
                      value={draft.outcomeReason}
                      onChange={(event) =>
                        setDraft(
                          (current) =>
                            current && {
                              ...current,
                              outcomeReason: event.target.value,
                            },
                        )
                      }
                      placeholder="Required when an outcome is selected and before resolving or dismissing."
                    />
                  </div>
                  <Button
                    className="w-full"
                    isPending={saving}
                    onClick={() => void saveDecision()}
                  >
                    Save moderation decision
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Internal notes</CardTitle>
                  <CardDescription>
                    Never shown publicly or to the profile owner.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {detail.notes.length ? (
                    detail.notes.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-md border p-3 text-sm"
                      >
                        <p className="whitespace-pre-wrap">{item.note}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {dateTime(item.created_at)} ·{" "}
                          {item.author_id === currentActorId
                            ? "You"
                            : item.author_id.slice(0, 8)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No internal notes yet.
                    </p>
                  )}
                  <Textarea
                    aria-label="New internal note"
                    disabled={saving}
                    maxLength={2000}
                    rows={3}
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Add investigation context or a handoff note."
                  />
                  <Button
                    disabled={note.trim().length < 2}
                    isPending={saving}
                    variant="outline"
                    onClick={() => void addNote()}
                  >
                    Add internal note
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Audit history</CardTitle>
                  <CardDescription>
                    Append-only record of submission, decisions, and notes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {detail.audit.map((event) => (
                    <div
                      key={event.id}
                      className="flex gap-3 border-b pb-3 last:border-0"
                    >
                      {event.action === "submitted" ? (
                        <ShieldWarning
                          aria-hidden="true"
                          className="mt-0.5 size-5"
                        />
                      ) : event.action === "note_added" ? (
                        <UserCircle
                          aria-hidden="true"
                          className="mt-0.5 size-5"
                        />
                      ) : (
                        <ClockCountdown
                          aria-hidden="true"
                          className="mt-0.5 size-5"
                        />
                      )}
                      <div className="min-w-0 text-sm">
                        <p className="font-semibold">
                          {event.action.replace(/_/g, " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {dateTime(event.created_at)} ·{" "}
                          {event.actor_id
                            ? event.actor_id.slice(0, 8)
                            : "Public submission"}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Prior reports for this profile</CardTitle>
                <CardDescription>
                  Every original report remains distinct.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {detail.priorReports.length ? (
                  <ul className="space-y-2">
                    {detail.priorReports.map((report) => (
                      <li
                        key={report.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm"
                      >
                        <span>
                          {dateTime(report.created_at)} ·{" "}
                          {reportCategoryLabels[report.category]}
                        </span>
                        <span className="flex gap-2">
                          <Badge variant={statusVariant(report.status)}>
                            {reportStatusLabels[report.status]}
                          </Badge>
                          <Badge variant={priorityVariant(report.priority)}>
                            {reportPriorityLabels[report.priority]}
                          </Badge>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No earlier reports for this profile.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
