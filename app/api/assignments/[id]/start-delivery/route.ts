import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/features/assignments/services/assignment.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireUser } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (user.role !== "sales" || !user.salesId) {
      throw new Error("FORBIDDEN: hanya akun sales yang bisa memulai pengiriman");
    }
    const updated = await assignmentService.startDelivery(params.id, user.salesId);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
