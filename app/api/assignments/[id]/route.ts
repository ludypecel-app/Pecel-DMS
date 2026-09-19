import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/features/assignments/services/assignment.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireUser } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser();
  } catch (error) {
    return handleApiError(error);
  }
  const item = await assignmentService.getById(params.id);
  if (!item) return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: item });
}
