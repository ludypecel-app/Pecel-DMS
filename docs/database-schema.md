# Skema Database (Google Sheets) — Revisi Tahap 0

Satu spreadsheet Google per grup entitas (bukan satu sheet besar untuk semua data), sesuai instruksi brief.

## Master Data (spreadsheet: `master`)
- **Region**: id, code, name, status, created_at, updated_at
- **Sales**: id, user_id, name, phone, assigned_region_id, status, created_at, updated_at
- **Warung**: id, name, region_id, address, phone, latitude, longitude, status, created_at, updated_at
- **Product**: id, code, name, unit, price, status, created_at, updated_at
- **User**: id, name, email, password_hash, role (admin/sales), sales_id, status, created_at, updated_at
  - `sales_id` hanya diisi untuk role `sales` — menghubungkan akun login ke record Sales terkait (dipakai untuk membatasi sales hanya melihat/mengubah tugas miliknya sendiri).
  - `password_hash` di-hash dengan bcrypt, tidak pernah dikirim ke client (lihat `features/users/services/user.service.ts`).
- **RolePermission**: id, role, permission_key, created_at, updated_at
  - Menyimpan mapping role→permission untuk halaman Pengaturan > Hak Akses (Tahap 8). Jika sheet ini kosong, aplikasi memakai default di `config/permissions.ts`.

## Orders (spreadsheet: `orders`)
- **Order**: id, order_number, warung_id, region_id, order_date, delivery_date, status, created_by, cancelled_by, cancelled_at, cancellation_reason, created_at, updated_at
- **OrderDetail**: id, order_id, product_id, quantity, unit_price, subtotal, created_at, updated_at
  - `unit_price`/`subtotal` dibekukan saat pesanan dibuat — perubahan harga produk di master data tidak memengaruhi pesanan yang sudah ada.
  - Saat pesanan diedit (hanya boleh selagi status `scheduling`), baris detail lama dikosongkan (hard delete via `remove()`) dan digantikan baris baru — aman karena belum ada proses picking/stok yang bergantung padanya.

## Assignments (spreadsheet: `assignments`)
- **Assignment**: id, order_id, sales_id, picking_date, picking_time, delivery_date, status, assigned_by, assigned_at, accepted_at, rejected_at, rejection_reason, picking_confirmed_by, picking_confirmed_at, cancelled_by, cancelled_at, cancellation_reason, completed_by, completed_at, reopened_by, reopened_at, reopen_reason, created_at, updated_at
  - *Perubahan dari draft awal*: Picking digabung ke Assignment (bukan entitas terpisah) — cukup kolom tambahan, karena picking adalah bagian dari siklus hidup satu Assignment, bukan entitas dengan relasi many-to-many sendiri.
  - Saat sales menolak, `status` Assignment ini menjadi `cancelled` (riwayat tetap tersimpan) dan `Order.status` dikembalikan ke `scheduling` agar admin bisa menugaskan ulang ke sales lain (record Assignment baru).
  - Pembatalan oleh admin (Tahap 5) memakai `cancelled_by`/`cancelled_at`/`cancellation_reason` — field terpisah dari `rejected_at`/`rejection_reason` (milik aksi sales menolak) agar riwayat dua jenis peristiwa ini tidak tercampur.
  - Konfirmasi admin (Tahap 7) memakai `completed_by`/`completed_at`. Pembukaan kembali (reopen) untuk koreksi memakai `reopened_by`/`reopened_at`/`reopen_reason` dan mengembalikan `status` ke `visited` — data StockTransaction/Payment lama TIDAK dihapus.

## Visits (spreadsheet: `visits`)
- **Visit**: id, assignment_id, sales_id, warung_id, checked_in_at, checked_in_lat, checked_in_lng, checked_out_at, notes, created_at, updated_at, checked_in_out_of_range, checked_in_distance_m
  - Dibuat otomatis saat sales check-in (Tahap 5); `checked_out_at` & `notes` diisi saat Check-Out (Tahap 6).
  - `checked_in_out_of_range` (boolean) & `checked_in_distance_m` (angka, meter): hasil validasi **soft** jarak check-in terhadap koordinat Warung (radius toleransi 50m, lihat `lib/utils/geo.ts`). Tidak pernah memblokir check-in — hanya menandai untuk ditinjau admin di halaman Review. Kosong kalau Warung atau sales tidak punya koordinat.
  - **Kolom baru** — ditambahkan di UJUNG baris header sheet "Visit" (kolom setelah `updated_at`), bukan disisipkan di tengah, supaya kolom lama yang sudah ada datanya tidak bergeser posisi. Kalau sheet lama belum punya 2 kolom ini, tambahkan manual di header sebelum deploy.
- **StockTransaction**: id, visit_id, assignment_id, product_id, type (picking_out/sales_out/returned/retur_pembatalan), quantity, created_at, updated_at
  - `picking_out` dicatat saat admin konfirmasi picking (Tahap 5). `sales_out` & `returned` dicatat saat sales Check-Out (Tahap 6) — masing-masing dari field Penjualan & Produk Ditarik. `retur_pembatalan` dicatat otomatis bila tugas dibatalkan saat status `on_delivery`.
  - "Sisa Stok" dan "Total Stok Saat Ini" (Bagian 9 brief) **tidak disimpan** sebagai kolom — dihitung dari jumlah `picking_out − sales_out − returned` setiap kali dibutuhkan, sesuai keputusan Tahap 0 (menghindari perhitungan ganda).

## Payments (spreadsheet: `payments`)
- **Payment**: id, visit_id, amount, status (belum_bayar/sebagian/lunas/ditangguhkan), method (tunai/transfer/qris/lainnya), proof_attachment_id, created_at, updated_at
  - `amount` dihitung server-side dari `Penjualan × unit_price` (harga pesanan yang dibekukan), tidak dikirim dari client.
  - `proof_attachment_id` untuk MVP menyimpan URL yang ditempel manual sales (bukan file asli) — entitas `Attachment` & integrasi Google Drive API belum diimplementasikan di iterasi ini; lihat catatan di `docs/architecture.md`.
- **Attachment**: id, file_id, file_name, file_type, size_bytes, uploaded_by, created_at, updated_at
  - File fisik disimpan di Google Drive; sheet hanya menyimpan referensi. **Belum diimplementasikan** — lihat catatan di atas.

## Logs (spreadsheet: `logs`)
- **AuditLog**: id, entity_type, entity_id, action, actor_id, before (JSON string), after (JSON string), created_at, updated_at
  - Dicatat untuk setiap perubahan status penting (Assignment: create/accept/reject/confirm_picking/start_delivery/check_in/cancel). Modul Order (Tahap 3) belum menulis ke sini — evaluasi ulang bila audit trail Pesanan juga diperlukan.
- **Notification**: id, user_id, type, message, link, read_at, created_at, updated_at
  - `user_id` diisi id Sales untuk notifikasi ke sales, atau `"admin"` untuk notifikasi ke admin (belum granular per-admin sampai Tahap 8 User Management selesai).

## Aturan umum
- Semua `id` berupa string yang di-generate aplikasi (UUID atau kode custom seperti `ORD-20260915-0001`), bukan nomor baris.
- Semua entitas punya `created_at`/`updated_at`; master data punya `status` (`active`/`inactive`) untuk soft delete.
- Relasi antar-sheet selalu lewat `id`, tidak pernah lewat nama.
