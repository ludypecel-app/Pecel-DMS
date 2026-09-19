# Arsitektur — Pecel DMS

## Lapisan aplikasi

```
Frontend (Next.js App Router, TS, Tailwind)
        ↓
API Routes / Server Actions — auth, validasi request
        ↓
Service Layer — business logic (workflow, kalkulasi stok/tagihan)
        ↓
Repository Layer — interface generik (lib/google-sheets/repository.ts)
        ↓
Google Sheets Adapter — implementasi awal (akan diganti/ditambah adapter DB relasional nanti)
```

## Kenapa App Router

- Mendukung layout bersarang (route group `(app)` membungkus semua halaman internal dengan satu shell sidebar+header).
- Server Actions memudahkan mutasi data tanpa membuat banyak API Route terpisah untuk aksi sederhana.
- `output: "standalone"` di `next.config.js` menghasilkan server Node.js mandiri — memudahkan migrasi dari Vercel ke Hostinger tanpa bergantung pada fitur khusus Vercel.

## Prinsip Repository Pattern

Google Sheets bukan database relasional dan punya keterbatasan (lihat bagian Risiko di bawah). Untuk menghindari ketergantungan langsung, seluruh akses data melewati `Repository<T>` interface. Service Layer tidak pernah memanggil Google Sheets API secara langsung.

## Keterbatasan Google Sheets & Mitigasi

| Isu | Mitigasi |
|---|---|
| Tidak ada transaksi/FK native | Validasi relasi di Service Layer sebelum write |
| Race condition saat edit bersamaan | Optimistic locking via kolom `updated_at`, retry dengan backoff |
| Quota API (100 req/100 detik/user) | Caching + batch read/write |
| ID baris tidak stabil | ID di-generate di aplikasi (UUID/kode custom), bukan row number |
| Tidak cocok simpan file besar | File (bukti pembayaran) disimpan di Google Drive API, sheet hanya simpan `file_id`/URL |

## Status: Rejected & Accepted bukan kolom Kanban permanen

`Rejected` mengembalikan pesanan ke status `scheduling` untuk ditugaskan ulang; riwayat penolakan (alasan, waktu) tetap tercatat di record `Assignment`. `Accepted` men-trigger transisi ke `ready_to_picking`. Kolom Kanban yang ditampilkan mengikuti field `status` pada `Order`/`Assignment`, bukan hasil aksi sales secara langsung.

## Keputusan bisnis yang jadi asumsi kerja (Tahap 0)

1. **Rumus stok**: `Total Stok Saat Ini = Sisa Stok − Produk Ditarik`. `Sisa Stok` = stok dari pengiriman ini saja yang belum terjual (tidak termasuk carry-over kunjungan sebelumnya).
2. **Pembatalan saat On Delivery**: diizinkan admin, wajib alasan, otomatis membuat `Stock Transaction` bertipe `retur_pembatalan`, tercatat di audit log.
3. **File bukti pembayaran**: Google Drive API (service account sama), maks 5MB, format JPG/PNG/PDF.
4. **Selisih picking**: partial fulfillment diperbolehkan — `actual_quantity` dicatat terpisah dari `quantity` pesanan.
5. **Notifikasi**: in-app saja untuk MVP, dengan badge unread di sidebar.
6. **Wilayah sales**: satu sales = satu wilayah; admin melihat semua wilayah.

Semua asumsi ini bisa direvisi — beri tahu di awal tahap terkait bila ada perubahan.
