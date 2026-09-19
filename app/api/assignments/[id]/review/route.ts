import { NextRequest, NextResponse } from "next/server";
import { visitService } from "@/features/visits/services/visit.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireUser } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const data = await visitService.getReviewData(params.id);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
