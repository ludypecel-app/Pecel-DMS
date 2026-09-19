import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/features/assignments/services/assignment.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const actor = await requireAdmin();
    const updated = await assignmentService.confirmCompletion(params.id, actor.id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
