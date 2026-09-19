import { NextRequest, NextResponse } from "next/server";
import { visitService } from "@/features/visits/services/visit.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireUser } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

/** Body: { items: [...], payment: {...}, notes? } */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const user = await requireUser();
    if (user.role !== "sales" || !user.salesId) {
      throw new Error("FORBIDDEN: hanya akun sales yang bisa Check-Out kunjungan");
    }
    const body = await request.json();
    await visitService.checkOut(params.id, body, user.salesId);
    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    return handleApiError(error);
  }
}
