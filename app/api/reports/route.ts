import { NextResponse } from "next/server";

import {
  formatReportReference,
  submitProfileReportSchema,
} from "@/lib/reporting/contract";
import {
  PublicReportError,
  submitPublicProfileReport,
} from "@/lib/reporting/public-repository";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = submitProfileReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Check the report details and try again." },
      { status: 400 },
    );
  }

  try {
    const report = await submitPublicProfileReport({
      report: parsed.data,
      request,
    });
    return NextResponse.json(
      {
        reference: formatReportReference(report.id),
        duplicate: !report.created,
      },
      {
        status: report.created ? 201 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (error) {
    if (error instanceof PublicReportError) {
      if (error.code === "RATE_LIMITED") {
        return NextResponse.json(
          { error: "Too many reports were submitted. Please try again later." },
          { status: 429, headers: { "Retry-After": "3600" } },
        );
      }
      if (error.code === "PROFILE_NOT_FOUND") {
        return NextResponse.json(
          { error: "This public profile is no longer available." },
          { status: 404 },
        );
      }
    }

    return NextResponse.json(
      {
        error:
          "The report could not be submitted. Your details are still here.",
      },
      { status: 503 },
    );
  }
}
