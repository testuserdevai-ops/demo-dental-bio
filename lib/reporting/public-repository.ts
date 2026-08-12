import "server-only";

import { createHmac } from "node:crypto";

import { supabaseAdmin } from "@/lib/supabase/admin";

import type { z } from "zod";
import type { submitProfileReportSchema } from "./contract";

type SubmitProfileReport = z.output<typeof submitProfileReportSchema>;

export class PublicReportError extends Error {
  constructor(
    public readonly code:
      "RATE_LIMITED" | "PROFILE_NOT_FOUND" | "SUBMISSION_FAILED",
  ) {
    super(code);
    this.name = "PublicReportError";
  }
}

function reportingSecret(): string {
  const secret =
    process.env.REPORT_ABUSE_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new PublicReportError("SUBMISSION_FAILED");
  return secret;
}

function digest(parts: string[]): string {
  return createHmac("sha256", reportingSecret())
    .update(parts.join("\u001f"))
    .digest("hex");
}

export function getReportSource(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

export async function submitPublicProfileReport(input: {
  report: SubmitProfileReport;
  request: Request;
}) {
  const profile = await supabaseAdmin
    .from("public_profiles")
    .select("username")
    .eq("profile_id", input.report.profileId)
    .maybeSingle();
  if (profile.error) throw new PublicReportError("SUBMISSION_FAILED");
  if (!profile.data) throw new PublicReportError("PROFILE_NOT_FOUND");

  const sourceHash = digest(["source", getReportSource(input.request)]);
  const fingerprint = digest([
    "duplicate",
    sourceHash,
    input.report.profileId,
    input.report.category,
    input.report.details ?? "",
    input.report.reporterEmail ?? "",
  ]);

  const claim = await supabaseAdmin.rpc("claim_profile_report_submission", {
    p_source_hash: sourceHash,
    p_limit: 5,
    p_window_seconds: 3600,
  });
  if (claim.error) throw new PublicReportError("SUBMISSION_FAILED");
  if (!claim.data) throw new PublicReportError("RATE_LIMITED");

  const origin = new URL(input.request.url).origin;
  const publicUrl = `${origin}/${encodeURIComponent(profile.data.username)}`;
  const result = await supabaseAdmin
    .rpc("submit_profile_report", {
      p_profile_id: input.report.profileId,
      p_category: input.report.category,
      p_details: input.report.details ?? "",
      p_reporter_email: input.report.reporterEmail ?? "",
      p_public_url: publicUrl,
      p_submission_fingerprint: fingerprint,
    })
    .single();

  if (result.error) {
    if (result.error.message.includes("PROFILE_NOT_FOUND")) {
      throw new PublicReportError("PROFILE_NOT_FOUND");
    }
    throw new PublicReportError("SUBMISSION_FAILED");
  }

  return {
    id: result.data.report_id,
    created: result.data.created,
  };
}
