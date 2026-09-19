// Tipe dasar untuk seluruh entitas. Field id memakai string (bukan number)
// karena ID di-generate di aplikasi (UUID/kode custom), bukan nomor baris sheet.

export type ActiveStatus = "active" | "inactive";

export interface BaseEntity {
  id: string;
  created_at: string; // ISO timestamp
  updated_at: string;
}

export interface Region extends BaseEntity {
  code: string;
  name: string;
  status: ActiveStatus;
}

export interface Sales extends BaseEntity {
  user_id: string;
  name: string;
  phone: string;
  assigned_region_id: string;
  status: ActiveStatus;
}

export interface Warung extends BaseEntity {
  name: string;
  region_id: string;
  address: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  status: ActiveStatus;
}

export interface Product extends BaseEntity {
  code: string;
  name: string;
  unit: string;
  price: number;
  status: ActiveStatus;
}

export type OrderStatus =
  | "scheduling"
  | "assigned"
  | "ready_to_picking"
  | "picking_done"
  | "ready_to_delivery"
  | "on_delivery"
  | "arrived"
  | "visited"
  | "completed"
  | "cancelled";

export interface Order extends BaseEntity {
  order_number: string;
  warung_id: string;
  region_id: string; // auto-filled dari warung
  order_date: string;
  delivery_date: string;
  status: OrderStatus;
  created_by: string;
  cancelled_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
}

export interface OrderDetail extends BaseEntity {
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number; // harga dibekukan saat order dibuat
  subtotal: number;
}

export interface Assignment extends BaseEntity {
  order_id: string;
  sales_id: string;
  picking_date: string;
  picking_time: string;
  delivery_date: string;
  status: OrderStatus;
  assigned_by: string;
  assigned_at: string;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  picking_confirmed_by?: string;
  picking_confirmed_at?: string;
  cancelled_by?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  completed_by?: string;
  completed_at?: string;
  reopened_by?: string;
  reopened_at?: string;
  reopen_reason?: string;
}

export interface Visit extends BaseEntity {
  assignment_id: string;
  sales_id: string;
  warung_id: string;
  checked_in_at?: string;
  checked_in_lat?: number;
  checked_in_lng?: number;
  checked_out_at?: string;
  notes?: string;
}

export type StockTransactionType = "picking_out" | "sales_out" | "returned" | "retur_pembatalan";

export interface StockTransaction extends BaseEntity {
  visit_id?: string;
  assignment_id: string;
  product_id: string;
  type: StockTransactionType;
  quantity: number;
}

export type PaymentStatus = "belum_bayar" | "sebagian" | "lunas" | "ditangguhkan";
export type PaymentMethod = "tunai" | "transfer" | "qris" | "lainnya";

export interface Payment extends BaseEntity {
  visit_id: string;
  amount: number;
  status: PaymentStatus;
  method: PaymentMethod;
  proof_attachment_id?: string;
}

export interface Attachment extends BaseEntity {
  file_id: string; // ID/URL dari penyedia penyimpanan (Google Drive, dsb.)
  file_name: string;
  file_type: string;
  size_bytes: number;
  uploaded_by: string;
}

export interface AuditLog extends BaseEntity {
  entity_type: string;
  entity_id: string;
  action: string;
  actor_id: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

export interface Notification extends BaseEntity {
  user_id: string; // id sales ATAU "admin" untuk notifikasi ke semua admin
  type: string; // mis. "assignment_created", "assignment_accepted", "assignment_rejected"
  message: string;
  link?: string; // mis. /assignments/{id}
  read_at?: string;
}

export type UserRole = "admin" | "sales";

export interface User extends BaseEntity {
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  sales_id?: string; // relasi ke Sales, hanya untuk role "sales"
  status: ActiveStatus;
}

export interface RolePermission extends BaseEntity {
  role: UserRole;
  permission_key: string;
}
