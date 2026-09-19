import { NextResponse } from "next/server";
import { notificationService } from "@/features/notifications/services/notification.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireUser } from "@/lib/auth/session";

/** Selalu mengembalikan notifikasi milik user yang login — tidak menerima userId dari client. */
export async function GET() {
  try {
    const user = await requireUser();
    const targetId = user.role === "admin" ? "admin" : (user.salesId ?? user.id);
    const data = await notificationService.listForUser(targetId);
    return NextResponse.json({ data });
  } catch (error) {
    return handleApiError(error);
  }
}
