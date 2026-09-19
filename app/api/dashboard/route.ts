import { NextResponse } from "next/server";
import { dashboardService } from "@/features/dashboard/services/dashboard.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const user = await requireUser();
    if (user.role === "admin") {
      const data = await dashboardService.getAdminDashboard();
      return NextResponse.json({ role: "admin", data });
    }
    if (!user.salesId) throw new Error("Akun sales ini belum terhubung ke data Sales");
    const data = await dashboardService.getSalesDashboard(user.salesId);
    return NextResponse.json({ role: "sales", data });
  } catch (error) {
    return handleApiError(error);
  }
}
