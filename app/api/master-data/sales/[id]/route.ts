import { NextRequest, NextResponse } from "next/server";
import { salesService } from "@/features/sales/services/sales.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin, requireUser } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireUser();
  } catch (error) {
    return handleApiError(error);
  }
  const item = await salesService.getById(params.id);
  if (!item) return NextResponse.json({ error: "Sales tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: item });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const body = await request.json();
    const updated = await salesService.update(params.id, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    await salesService.deactivate(params.id);
    return NextResponse.json({ data: { id: params.id, status: "inactive" } });
  } catch (error) {
    return handleApiError(error);
  }
}
