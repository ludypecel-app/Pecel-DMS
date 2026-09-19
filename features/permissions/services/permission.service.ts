import "server-only";
import { SheetsRepository } from "@/lib/google-sheets/sheets-repository";
import { ROLE_PERMISSION_TABLE } from "@/lib/google-sheets/tables";
import { PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, type PermissionKey } from "@/config/permissions";
import type { RolePermission, UserRole } from "@/types/entities";

const repository = new SheetsRepository<RolePermission>(ROLE_PERMISSION_TABLE);

export const permissionService = {
  /** Semua permission per role. Fallback ke default bawaan jika sheet masih kosong (belum di-seed). */
  async getMapping(): Promise<Record<UserRole, PermissionKey[]>> {
    const rows = await repository.findAll();
    if (rows.length === 0) return DEFAULT_ROLE_PERMISSIONS as Record<UserRole, PermissionKey[]>;

    const mapping: Record<UserRole, PermissionKey[]> = { admin: [], sales: [] };
    rows.forEach((r) => {
      if (r.role === "admin" || r.role === "sales") {
        mapping[r.role].push(r.permission_key as PermissionKey);
      }
    });
    return mapping;
  },

  async hasPermission(role: UserRole, permission: PermissionKey): Promise<boolean> {
    const mapping = await this.getMapping();
    return mapping[role]?.includes(permission) ?? false;
  },

  /**
   * Set ulang seluruh permission untuk satu role (dipakai halaman
   * Pengaturan > Hak Akses). Menghapus mapping lama role tsb lalu
   * menulis yang baru — sederhana karena RolePermission tidak
   * direferensikan entitas lain.
   */
  async setRolePermissions(role: UserRole, permissions: PermissionKey[]): Promise<void> {
    const valid = permissions.filter((p) => (PERMISSION_KEYS as readonly string[]).includes(p));

    const existing = await repository.findAll({ role } as Partial<RolePermission>);
    await Promise.all(existing.map((r) => repository.remove(r.id)));

    await Promise.all(
      valid.map((permission_key) =>
        repository.create({ role, permission_key } as Omit<RolePermission, "id" | "created_at" | "updated_at">)
      )
    );
  },
};
