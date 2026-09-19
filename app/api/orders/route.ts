import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/features/orders/services/order.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin, requireUser } from "@/lib/auth/session";
import type { OrderStatus } from "@/types/entities";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const status = (searchParams.get("status") as OrderStatus | null) ?? undefined;
  const regionId = searchParams.get("regionId") ?? undefined;

  try {
    await requireUser(); // baca boleh admin & sales, cukup wajib login
    const data = await orderService.list({ search, status: status ?? undefined, regionId });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Hanya admin yang boleh membuat pesanan (Bagian 6 brief). */
export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin();
    const body = await request.json();
    const created = await orderService.create(body, actor.id);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
