import { NextResponse } from "next/server";

import { withAdminAuthorization } from "@/lib/admin/http";
import {
  addReportNoteSchema,
  reportDetailQuerySchema,
} from "@/lib/reporting/contract";
import { addProfileReportNote } from "@/lib/reporting/admin-repository";

export const POST = withAdminAuthorization(
  "reports:moderate",
  async (request, { actor }) => {
    const id = reportDetailQuerySchema.safeParse({
      id: new URL(request.url).pathname.split("/").at(-2),
    });
    if (!id.success) {
      return NextResponse.json(
        { error: "Invalid report ID." },
        { status: 400 },
      );
    }
    const body = await request.json().catch(() => null);
    const parsed = addReportNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "A note between 2 and 2,000 characters is required." },
        { status: 400 },
      );
    }
    const note = await addProfileReportNote({
      id: id.data.id,
      actorId: actor.id,
      note: parsed.data.note,
    });
    return NextResponse.json({ note }, { status: 201 });
  },
);
