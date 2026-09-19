import { NextRequest, NextResponse } from "next/server";
import { regionService } from "@/features/regions/services/region.service";
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
  const item = await regionService.getById(params.id);
  if (!item) return NextResponse.json({ error: "Wilayah tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: item });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const body = await request.json();
    const updated = await regionService.update(params.id, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    // ?permanent=true -> hapus permanen (ditolak kalau masih dirujuk data
    // lain, lihat regionService.remove). Tanpa parameter itu -> perilaku
    // lama: nonaktifkan (soft delete), dipakai tombol "Nonaktifkan".
    const permanent = request.nextUrl.searchParams.get("permanent") === "true";
    if (permanent) {
      await regionService.remove(params.id);
      return NextResponse.json({ data: { id: params.id, deleted: true } });
    }
    await regionService.deactivate(params.id);
    return NextResponse.json({ data: { id: params.id, status: "inactive" } });
  } catch (error) {
    return handleApiError(error);
  }
}
