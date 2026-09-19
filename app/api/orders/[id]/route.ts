import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/features/orders/services/order.service";
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
  const item = await orderService.getById(params.id);
  if (!item) return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: item });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const body = await request.json();
    const updated = await orderService.update(params.id, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Pembatalan pesanan — bukan hard delete. Body: { reason: string } */
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    const updated = await orderService.cancel(params.id, body, actor.id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
