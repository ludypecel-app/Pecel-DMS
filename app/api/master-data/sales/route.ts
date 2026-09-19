import { NextRequest, NextResponse } from "next/server";
import { salesService } from "@/features/sales/services/sales.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin, requireUser } from "@/lib/auth/session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const status = (searchParams.get("status") as "active" | "inactive" | null) ?? undefined;
  const regionId = searchParams.get("regionId") ?? undefined;

  try {
    await requireUser(); // master data boleh dibaca admin & sales (dipakai form pesanan/kunjungan)
    const data = await salesService.list({ search, status: status ?? undefined, regionId });
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Hanya admin yang boleh mengubah master data. */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const created = await salesService.create(body);
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
