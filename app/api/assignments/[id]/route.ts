import { NextRequest, NextResponse } from "next/server";
import { assignmentService } from "@/features/assignments/services/assignment.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireUser } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    const item = await assignmentService.getById(params.id);
    if (!item) return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
    // Sales hanya boleh melihat tugas miliknya sendiri — tanpa ini, sales
    // manapun yang tahu/menebak id penugasan bisa membaca data penugasan
    // sales lain (nama warung, status, dll).
    if (user.role === "sales" && item.sales_id !== user.salesId) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke penugasan ini" }, { status: 403 });
    }
    return NextResponse.json({ data: item });
  } catch (error) {
    return handleApiError(error);
  }
}
