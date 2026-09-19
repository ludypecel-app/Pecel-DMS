// Definisi kolom sheet per entitas. Urutan array HARUS sama dengan urutan
// kolom di baris header spreadsheet Google Sheets yang sesungguhnya.
// spreadsheetId diambil dari env agar tidak hardcode dan mudah beda per environment.

export const REGION_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_MASTER ?? "",
  sheetName: "Region",
  columns: ["id", "code", "name", "status", "created_at", "updated_at"],
};

export const SALES_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_MASTER ?? "",
  sheetName: "Sales",
  columns: [
    "id",
    "user_id",
    "name",
    "phone",
    "assigned_region_id",
    "status",
    "created_at",
    "updated_at",
  ],
};

export const WARUNG_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_MASTER ?? "",
  sheetName: "Warung",
  columns: [
    "id",
    "name",
    "region_id",
    "address",
    "phone",
    "latitude",
    "longitude",
    "status",
    "created_at",
    "updated_at",
  ],
};

export const PRODUCT_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_MASTER ?? "",
  sheetName: "Product",
  columns: ["id", "code", "name", "unit", "price", "status", "created_at", "updated_at"],
};

export const USER_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_MASTER ?? "",
  sheetName: "User",
  columns: [
    "id",
    "name",
    "email",
    "password_hash",
    "role",
    "sales_id",
    "status",
    "created_at",
    "updated_at",
  ],
};

export const ROLE_PERMISSION_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_MASTER ?? "",
  sheetName: "RolePermission",
  columns: ["id", "role", "permission_key", "created_at", "updated_at"],
};

export const ORDER_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERS ?? "",
  sheetName: "Order",
  columns: [
    "id",
    "order_number",
    "warung_id",
    "region_id",
    "order_date",
    "delivery_date",
    "status",
    "created_by",
    "cancelled_by",
    "cancelled_at",
    "cancellation_reason",
    "created_at",
    "updated_at",
  ],
};

export const ORDER_DETAIL_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ORDERS ?? "",
  sheetName: "OrderDetail",
  columns: [
    "id",
    "order_id",
    "product_id",
    "quantity",
    "unit_price",
    "subtotal",
    "created_at",
    "updated_at",
  ],
};

export const ASSIGNMENT_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_ASSIGNMENTS ?? "",
  sheetName: "Assignment",
  columns: [
    "id",
    "order_id",
    "sales_id",
    "picking_date",
    "picking_time",
    "delivery_date",
    "status",
    "assigned_by",
    "assigned_at",
    "accepted_at",
    "rejected_at",
    "rejection_reason",
    "picking_confirmed_by",
    "picking_confirmed_at",
    "cancelled_by",
    "cancelled_at",
    "cancellation_reason",
    "completed_by",
    "completed_at",
    "reopened_by",
    "reopened_at",
    "reopen_reason",
    "created_at",
    "updated_at",
  ],
};

export const VISIT_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_VISITS ?? "",
  sheetName: "Visit",
  columns: [
    "id",
    "assignment_id",
    "sales_id",
    "warung_id",
    "checked_in_at",
    "checked_in_lat",
    "checked_in_lng",
    "checked_out_at",
    "notes",
    "created_at",
    "updated_at",
    // Ditambahkan belakangan (validasi jarak check-in) — sengaja diletakkan
    // di AKHIR array ini, bukan disisipkan di tengah, supaya kolom baru
    // tinggal ditambahkan di ujung kanan sheet "Visit" tanpa mengubah posisi
    // kolom lama. Lihat docs/database-schema.md.
    "checked_in_out_of_range",
    "checked_in_distance_m",
  ],
};

export const STOCK_TRANSACTION_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_VISITS ?? "",
  sheetName: "StockTransaction",
  columns: [
    "id",
    "visit_id",
    "assignment_id",
    "product_id",
    "type",
    "quantity",
    "created_at",
    "updated_at",
  ],
};

export const AUDIT_LOG_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_LOGS ?? "",
  sheetName: "AuditLog",
  columns: [
    "id",
    "entity_type",
    "entity_id",
    "action",
    "actor_id",
    "before",
    "after",
    "created_at",
    "updated_at",
  ],
};

export const NOTIFICATION_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_LOGS ?? "",
  sheetName: "Notification",
  columns: ["id", "user_id", "type", "message", "link", "read_at", "created_at", "updated_at"],
};

export const PAYMENT_TABLE = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID_PAYMENTS ?? "",
  sheetName: "Payment",
  columns: [
    "id",
    "visit_id",
    "amount",
    "status",
    "method",
    "proof_attachment_id",
    "created_at",
    "updated_at",
  ],
};
