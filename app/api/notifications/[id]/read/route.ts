import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/features/notifications/services/notification.service";
import { handleApiError } from "@/lib/utils/api-response";
import { requireUser } from "@/lib/auth/session";

interface Params {
  params: { id: string };
}

/** Menandai satu notifikasi sebagai sudah dibaca (dipanggil saat item diklik di panel notifikasi). */
export async function POST(_request: NextRequest, { params }: Params) {
  try {
    await requireUser();
    const updated = await notificationService.markRead(params.id);
    return NextResponse.json({ data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
