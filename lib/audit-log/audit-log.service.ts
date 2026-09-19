import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { AUDIT_LOG_TABLE } from "@/lib/google-sheets/tables";
import type { AuditLog } from "@/types/entities";

const repository = new SheetsRepository<AuditLog>(AUDIT_LOG_TABLE);

export const auditLog = {
  /**
   * Catat satu perubahan penting. Dipanggil dari Service Layer modul lain
   * (Order, Assignment, dst) setiap kali status/data krusial berubah —
   * bukan untuk setiap request baca.
   */
  async record(entry: {
    entityType: string;
    entityId: string;
    action: string;
    actorId: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }): Promise<void> {
    await repository.create({
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      action: entry.action,
      actor_id: entry.actorId,
      before: entry.before ? (JSON.stringify(entry.before) as unknown as Record<string, unknown>) : undefined,
      after: entry.after ? (JSON.stringify(entry.after) as unknown as Record<string, unknown>) : undefined,
    } as unknown as Omit<AuditLog, "id" | "created_at" | "updated_at">);
  },
};
