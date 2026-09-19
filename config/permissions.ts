export const PERMISSION_KEYS = [
  "orders.view",
  "orders.create",
  "orders.edit",
  "orders.cancel",
  "assignments.view",
  "assignments.create",
  "assignments.accept",
  "assignments.reject",
  "picking.manage",
  "delivery.start",
  "visit.checkin",
  "visit.checkout",
  "payments.view",
  "payments.manage",
  "master_data.manage",
  "users.manage",
  "permissions.manage",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

/**
 * Default permission per role — dipakai untuk seed data pertama kali
 * (lihat scripts/seed jika ada) dan sebagai fallback bila RolePermission
 * di spreadsheet kosong. Perubahan sesungguhnya disimpan di sheet
 * `RolePermission` lewat halaman Pengaturan > Hak Akses.
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<"admin" | "sales", PermissionKey[]> = {
  admin: [...PERMISSION_KEYS],
  sales: [
    "assignments.view",
    "assignments.accept",
    "assignments.reject",
    "delivery.start",
    "visit.checkin",
    "visit.checkout",
    "payments.view",
  ],
};
