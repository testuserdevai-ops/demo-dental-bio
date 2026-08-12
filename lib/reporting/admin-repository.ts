import "server-only";

import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ReportCategory, ReportPriority, ReportStatus } from "./contract";

type ReportListInput = {
  page: number;
  limit: number;
  search?: string;
  status?: ReportStatus;
  category?: ReportCategory;
  priority?: ReportPriority;
  assignee?: string;
  overdue?: "true" | "false";
  sort: "created_at" | "updated_at" | "sla_due_at" | "priority_rank";
  direction: "asc" | "desc";
};

export class ReportRepositoryError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ReportRepositoryError";
  }
}

function requireResult<T>(result: {
  data: T;
  error: { message: string; code?: string } | null;
}): T {
  if (result.error) {
    throw new ReportRepositoryError(result.error.message, result.error.code);
  }
  return result.data;
}

function escapeLike(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

export async function listProfileReports(input: ReportListInput) {
  const start = (input.page - 1) * input.limit;
  let query = supabaseAdmin
    .from("profile_reports")
    .select(
      "id,profile_id,profile_username,category,severity,status,priority,priority_rank,assigned_to,sla_due_at,created_at,updated_at,version",
      { count: "exact" },
    );

  if (input.search) {
    const search = input.search.trim();
    if (/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(search)) {
      query = query.or(`id.eq.${search},profile_id.eq.${search}`);
    } else {
      query = query.ilike("profile_username", `%${escapeLike(search)}%`);
    }
  }
  if (input.status) query = query.eq("status", input.status);
  if (input.category) query = query.eq("category", input.category);
  if (input.priority) query = query.eq("priority", input.priority);
  if (input.assignee === "unassigned") query = query.is("assigned_to", null);
  else if (input.assignee) query = query.eq("assigned_to", input.assignee);
  if (input.overdue === "true") {
    query = query
      .lt("sla_due_at", new Date().toISOString())
      .not("status", "in", '("resolved","dismissed")');
  }

  const result = await query
    .order(input.sort, { ascending: input.direction === "asc" })
    .order("id", { ascending: input.direction === "asc" })
    .range(start, start + input.limit - 1);
  if (result.error) {
    throw new ReportRepositoryError(result.error.message, result.error.code);
  }
  return { data: result.data ?? [], count: result.count ?? 0 };
}

export async function getProfileReportSummary() {
  const results = await Promise.all([
    supabaseAdmin
      .from("profile_reports")
      .select("id", { count: "exact", head: true })
      .not("status", "in", '("resolved","dismissed")'),
    supabaseAdmin
      .from("profile_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
    supabaseAdmin
      .from("profile_reports")
      .select("id", { count: "exact", head: true })
      .is("assigned_to", null)
      .not("status", "in", '("resolved","dismissed")'),
    supabaseAdmin
      .from("profile_reports")
      .select("id", { count: "exact", head: true })
      .lt("sla_due_at", new Date().toISOString())
      .not("status", "in", '("resolved","dismissed")'),
    supabaseAdmin
      .from("profile_reports")
      .select("id", { count: "exact", head: true })
      .eq("priority", "critical")
      .not("status", "in", '("resolved","dismissed")'),
  ]);
  for (const result of results) {
    if (result.error) throw new ReportRepositoryError(result.error.message);
  }
  const [open, fresh, unassigned, overdue, critical] = results.map(
    ({ count }) => count ?? 0,
  );
  return { open, new: fresh, unassigned, overdue, critical };
}

export async function listReportModerators() {
  const result = await supabaseAdmin
    .from("users")
    .select("id,email,first_name,last_name,role")
    .in("role", ["admin", "security_admin"])
    .eq("is_blocked", false)
    .order("email", { ascending: true });
  return requireResult(result) ?? [];
}

export async function getProfileReportDetail(id: string) {
  const report = requireResult(
    await supabaseAdmin
      .from("profile_reports")
      .select(
        "id,profile_id,profile_username,category,severity,status,priority,assigned_to,details,reporter_email,reporter_email_expires_at,public_url,profile_snapshot,outcome,outcome_reason,sla_due_at,resolved_at,version,created_at,updated_at",
      )
      .eq("id", id)
      .maybeSingle(),
  );
  if (!report) return null;

  const [notes, audit, priorReports] = await Promise.all([
    supabaseAdmin
      .from("profile_report_notes")
      .select("id,author_id,note,created_at")
      .eq("report_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabaseAdmin
      .from("profile_report_audit_log")
      .select("id,actor_id,action,previous_state,next_state,created_at")
      .eq("report_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
    supabaseAdmin
      .from("profile_reports")
      .select("id,category,status,priority,created_at")
      .eq("profile_id", report.profile_id)
      .neq("id", id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (notes.error || audit.error || priorReports.error) {
    throw new ReportRepositoryError(
      notes.error?.message ??
        audit.error?.message ??
        priorReports.error!.message,
    );
  }
  return {
    report,
    notes: notes.data ?? [],
    audit: audit.data ?? [],
    priorReports: priorReports.data ?? [],
  };
}

export async function moderateProfileReport(input: {
  id: string;
  actorId: string;
  expectedVersion: number;
  status: ReportStatus;
  priority: ReportPriority;
  assignedTo: string | null;
  outcome: string | null;
  outcomeReason: string | null;
}) {
  const result = await supabaseAdmin
    .rpc("moderate_profile_report", {
      p_report_id: input.id,
      p_actor_id: input.actorId,
      p_expected_version: input.expectedVersion,
      p_status: input.status,
      p_priority: input.priority,
      p_assigned_to: input.assignedTo ?? undefined,
      p_outcome: input.outcome ?? undefined,
      p_outcome_reason: input.outcomeReason ?? undefined,
    })
    .single();
  if (result.error) {
    const code = result.error.message.includes("REPORT_VERSION_CONFLICT")
      ? "REPORT_VERSION_CONFLICT"
      : undefined;
    throw new ReportRepositoryError(result.error.message, code);
  }
  return result.data;
}

export async function addProfileReportNote(input: {
  id: string;
  actorId: string;
  note: string;
}) {
  return requireResult(
    await supabaseAdmin.rpc("add_profile_report_note", {
      p_report_id: input.id,
      p_actor_id: input.actorId,
      p_note: input.note,
    }),
  );
}
