import { NextRequest, NextResponse } from "next/server";
import { visitService } from "@/features/visits/services/visit.service";
import { assignmentService } from "@/features/assignments/services/assignment.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireUser } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const assignment = await assignmentService.getById(params.id);
    if (!assignment) return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
    // Sales hanya boleh membuka form check-in/out untuk tugas miliknya sendiri.
    if (user.role === "sales" && assignment.sales_id !== user.salesId) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke penugasan ini" }, { status: 403 });
    }
    const data = await visitService.getFormData(params.id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
