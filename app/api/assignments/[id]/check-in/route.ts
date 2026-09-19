import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/features/assignments/services/assignment.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireUser } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

/** Body: { latitude?: number, longitude?: number } */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (user.role !== "sales" || !user.salesId) {
      throw new Error("FORBIDDEN: hanya akun sales yang bisa check-in");
    }
    const body = await request.json().catch(() => ({}));
    const updated = await assignmentService.checkIn(params.id, user.salesId, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
