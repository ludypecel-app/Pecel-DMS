import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/features/products/services/product.service";
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
  const item = await productService.getById(params.id);
  if (!item) return NextResponse.json({ error: "Produk tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: item });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const body = await request.json();
    const updated = await productService.update(params.id, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    await productService.deactivate(params.id);
    return NextResponse.json({ data: { id: params.id, status: "inactive" } });
  } catch (error) {
    return handleApiError(error);
  }
}
