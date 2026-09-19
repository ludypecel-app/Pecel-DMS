import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { NOTIFICATION_TABLE } from "@/lib/google-sheets/tables";
import type { Notification } from "@/types/entities";

const repository = new SheetsRepository<Notification>(NOTIFICATION_TABLE);

export const notificationService = {
  /** Dipanggil dari service lain (mis. assignment.service) untuk mengirim notifikasi in-app. */
  async send(input: {
    userId: string;
    type: string;
    message: string;
    link?: string;
  }): Promise<Notification> {
    return repository.create({
      user_id: input.userId,
      type: input.type,
      message: input.message,
      link: input.link,
    } as Omit<Notification, "id" | "created_at" | "updated_at">);
  },

  async listForUser(userId: string): Promise<Notification[]> {
    const items = await repository.findAll({ user_id: userId } as Partial<Notification>);
    return items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  },

  async markRead(id: string): Promise<Notification> {
    return repository.update(id, { read_at: new Date().toISOString() } as Partial<Notification>);
  },
};
