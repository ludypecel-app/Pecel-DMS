import { NextRequest, NextResponse } from "next/server";
import { permissionService } from "@/features/permissions/services/permission.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireAdmin } from "@/lib/auth/session";
import type { PermissionKey } from "@/config/permissions";
import type { UserRole } from "@/types/entities";

export async function GET() {
  try {
    await requireAdmin();
    const data = await permissionService.getMapping();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}

/** Body: { role: "admin"|"sales", permissions: string[] } */
export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const role = body.role as UserRole;
    const permissions = body.permissions as PermissionKey[];
    if (role !== "admin" && role !== "sales") throw new Error("Role tidak valid");

    await permissionService.setRolePermissions(role, permissions ?? []);
    const data = await permissionService.getMapping();
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
