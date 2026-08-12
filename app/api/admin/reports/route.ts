import { NextResponse } from "next/server";

import { withAdminAuthorization } from "@/lib/admin/http";
import {
  moderateProfileReportSchema,
  reportDetailQuerySchema,
  reportListQuerySchema,
} from "@/lib/reporting/contract";
import {
  getProfileReportDetail,
  getProfileReportSummary,
  listProfileReports,
  listReportModerators,
  moderateProfileReport,
  ReportRepositoryError,
} from "@/lib/reporting/admin-repository";

export const dynamic = "force-dynamic";

export const GET = withAdminAuthorization(
  "reports:moderate",
  async (request) => {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (id) {
      const parsed = reportDetailQuerySchema.safeParse({ id });
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Invalid report ID." },
          { status: 400 },
        );
      }
      const detail = await getProfileReportDetail(parsed.data.id);
      return detail
        ? NextResponse.json(detail, {
            headers: { "Cache-Control": "no-store" },
          })
        : NextResponse.json({ error: "Report not found." }, { status: 404 });
    }

    const parsed = reportListQuerySchema.safeParse(
      Object.fromEntries(url.searchParams),
    );
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid report queue filters." },
        { status: 400 },
      );
    }

    const [reports, summary, moderators] = await Promise.all([
      listProfileReports(parsed.data),
      getProfileReportSummary(),
      listReportModerators(),
    ]);
    return NextResponse.json(
      { ...reports, summary, moderators },
      { headers: { "Cache-Control": "no-store" } },
    );
  },
);

export const PATCH = withAdminAuthorization(
  "reports:moderate",
  async (request, { actor }) => {
    const body = await request.json().catch(() => null);
    const parsed = moderateProfileReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Check the moderation decision and reason." },
        { status: 400 },
      );
    }

    try {
      const report = await moderateProfileReport({
        id: parsed.data.id,
        actorId: actor.id,
        expectedVersion: parsed.data.expectedVersion,
        status: parsed.data.status,
        priority: parsed.data.priority,
        assignedTo: parsed.data.assignedTo,
        outcome: parsed.data.outcome,
        outcomeReason: parsed.data.outcomeReason,
      });
      return NextResponse.json({ report });
    } catch (error) {
      if (
        error instanceof ReportRepositoryError &&
        error.code === "REPORT_VERSION_CONFLICT"
      ) {
        return NextResponse.json(
          { error: "This report changed. Reload it before saving." },
          { status: 409 },
        );
      }
      throw error;
    }
  },
);
