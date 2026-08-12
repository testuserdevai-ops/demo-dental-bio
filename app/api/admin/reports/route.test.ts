import { beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("server-only", () => ({}));

type Actor = {
  id: string;
  role: "admin" | "security_admin" | "user";
} | null;
let actor: Actor = null;
let requestedCapability = "";

mock.module("@/lib/admin/http", () => ({
  withAdminAuthorization:
    (
      capability: string,
      handler: (
        request: Request,
        context: { actor: Exclude<Actor, null> },
      ) => Promise<Response>,
    ) =>
    async (request: Request) => {
      requestedCapability = capability;
      if (!actor || !["admin", "security_admin"].includes(actor.role)) {
        return Response.json({ error: "Not authorized" }, { status: 403 });
      }
      return handler(request, { actor });
    },
}));

class ReportRepositoryError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}

const repository = {
  listProfileReports: mock(async () => ({ data: [], count: 0 })),
  getProfileReportSummary: mock(async () => ({
    open: 0,
    new: 0,
    unassigned: 0,
    overdue: 0,
    critical: 0,
  })),
  listReportModerators: mock(async () => []),
  getProfileReportDetail: mock(async () => null),
  moderateProfileReport: mock(async () => ({ id: reportId, version: 2 })),
  addProfileReportNote: mock(async () => ({
    id: "00000000-0000-4000-8000-000000000003",
    note: "Review note",
  })),
};

mock.module("@/lib/reporting/admin-repository", () => ({
  ...repository,
  ReportRepositoryError,
}));

const { GET, PATCH } = await import("./route");
const notes = await import("./[id]/notes/route");
const reportId = "00000000-0000-4000-8000-000000000001";
const admin = {
  id: "00000000-0000-4000-8000-000000000002",
  role: "admin",
} as const;

beforeEach(() => {
  actor = null;
  requestedCapability = "";
  for (const method of Object.values(repository)) method.mockClear();
  repository.listProfileReports.mockResolvedValue({ data: [], count: 0 });
  repository.getProfileReportSummary.mockResolvedValue({
    open: 0,
    new: 0,
    unassigned: 0,
    overdue: 0,
    critical: 0,
  });
  repository.listReportModerators.mockResolvedValue([]);
  repository.getProfileReportDetail.mockResolvedValue(null);
  repository.moderateProfileReport.mockResolvedValue({
    id: reportId,
    version: 2,
  });
  repository.addProfileReportNote.mockResolvedValue({
    id: "00000000-0000-4000-8000-000000000003",
    note: "Review note",
  });
});

describe("admin report routes", () => {
  test("requires report moderation capability", async () => {
    expect(
      (await GET(new Request("https://dental.test/api/admin/reports"))).status,
    ).toBe(403);
    actor = { ...admin, role: "user" };
    expect(
      (await GET(new Request("https://dental.test/api/admin/reports"))).status,
    ).toBe(403);
    actor = admin;
    expect(
      (await GET(new Request("https://dental.test/api/admin/reports"))).status,
    ).toBe(200);
    expect(requestedCapability).toBe("reports:moderate");
  });

  test("passes only validated bounded filters to the repository", async () => {
    actor = admin;
    const response = await GET(
      new Request(
        "https://dental.test/api/admin/reports?page=2&limit=25&priority=high&sort=sla_due_at&direction=asc",
      ),
    );
    expect(response.status).toBe(200);
    expect(repository.listProfileReports).toHaveBeenCalledWith({
      page: 2,
      limit: 25,
      priority: "high",
      sort: "sla_due_at",
      direction: "asc",
    });

    const invalid = await GET(
      new Request("https://dental.test/api/admin/reports?limit=1000"),
    );
    expect(invalid.status).toBe(400);
  });

  test("requires closure evidence and forwards the actor identity", async () => {
    actor = admin;
    const invalid = await PATCH(
      new Request("https://dental.test/api/admin/reports", {
        method: "PATCH",
        body: JSON.stringify({
          id: reportId,
          expectedVersion: 1,
          status: "resolved",
          priority: "high",
          assignedTo: null,
          outcome: null,
          outcomeReason: null,
        }),
      }),
    );
    expect(invalid.status).toBe(400);
    expect(repository.moderateProfileReport).not.toHaveBeenCalled();

    const response = await PATCH(
      new Request("https://dental.test/api/admin/reports", {
        method: "PATCH",
        body: JSON.stringify({
          id: reportId,
          expectedVersion: 1,
          status: "resolved",
          priority: "high",
          assignedTo: admin.id,
          outcome: "warning_requested",
          outcomeReason:
            "Confirmed policy violation and requested owner warning.",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(repository.moderateProfileReport).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: admin.id, expectedVersion: 1 }),
    );
  });

  test("returns a conflict instead of overwriting another moderator", async () => {
    actor = admin;
    repository.moderateProfileReport.mockRejectedValue(
      new ReportRepositoryError("REPORT_VERSION_CONFLICT"),
    );
    const response = await PATCH(
      new Request("https://dental.test/api/admin/reports", {
        method: "PATCH",
        body: JSON.stringify({
          id: reportId,
          expectedVersion: 1,
          status: "in_review",
          priority: "high",
          assignedTo: null,
          outcome: null,
          outcomeReason: null,
        }),
      }),
    );
    expect(response.status).toBe(409);
  });

  test("validates note targets and records the authorized actor", async () => {
    actor = admin;
    const invalidId = await notes.POST(
      new Request("https://dental.test/api/admin/reports/not-a-uuid/notes", {
        method: "POST",
        body: JSON.stringify({ note: "Review note" }),
      }),
    );
    expect(invalidId.status).toBe(400);

    const invalidNote = await notes.POST(
      new Request(`https://dental.test/api/admin/reports/${reportId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: "x" }),
      }),
    );
    expect(invalidNote.status).toBe(400);

    const response = await notes.POST(
      new Request(`https://dental.test/api/admin/reports/${reportId}/notes`, {
        method: "POST",
        body: JSON.stringify({ note: "  Review note  " }),
      }),
    );
    expect(response.status).toBe(201);
    expect(repository.addProfileReportNote).toHaveBeenCalledWith({
      id: reportId,
      actorId: admin.id,
      note: "Review note",
    });
  });
});
