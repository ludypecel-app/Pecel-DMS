import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/features/assignments/services/assignment.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin, requireUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  let salesId = searchParams.get("salesId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const user = await requireUser();
    // Sales hanya boleh melihat penugasan miliknya sendiri, apa pun query-nya.
    if (user.role === "sales") salesId = user.salesId;
    const data = await assignmentService.list({ salesId, status });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Hanya admin yang boleh menugaskan sales. */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await request.json();
    const created = await assignmentService.create(body, actor.id);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
