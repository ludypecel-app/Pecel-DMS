import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/features/users/services/user.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const item = await userService.getById(params.id);
    if (!item) return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireAdmin();
    const body = await request.json();
    const updated = await userService.update(params.id, body);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const actor = await requireAdmin();
    const permanent = request.nextUrl.searchParams.get("permanent") === "true";
    if (permanent) {
      await userService.remove(params.id, actor.id);
      return NextResponse.json({ data: { id: params.id, deleted: true } });
    }
    await userService.deactivate(params.id);
    return NextResponse.json({ data: { id: params.id, status: "inactive" } });
  } catch (error) {
    return handleApiError(error);
  }
}
