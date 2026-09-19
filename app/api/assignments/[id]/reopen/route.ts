import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/features/assignments/services/assignment.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

/** Body: { reason: string } */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireAdmin();
    const body = await request.json();
    const updated = await assignmentService.reopen(params.id, body, actor.id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
