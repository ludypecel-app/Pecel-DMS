# Rencana Testing — Pecel DMS

## 1. Unit Testing (otomatis)

Dijalankan dengan Vitest:

```bash
npm install
npm test
```

Cakupan saat ini (`tests/`):
- **Skema validasi** (`tests/schemas/`): aturan bisnis yang dienkode di Zod — pesanan butuh minimal 1 produk, quantity harus positif, role sales wajib terhubung ke data Sales, password minimal 8 karakter, alasan pembatalan/penolakan wajib diisi, dsb.
- **Utilitas** (`tests/utils/`): format ID (`ORD-YYYYMMDD-NNNN`), keunikan UUID.

**Kenapa hanya skema & utilitas yang diuji otomatis di sini**: Service Layer (`features/*/services/*.ts`) memanggil Google Sheets API secara langsung lewat `SheetsRepository`, yang butuh kredensial nyata untuk diuji end-to-end. Untuk unit test Service Layer yang sesungguhnya (tanpa memanggil Google Sheets asli), langkah berikutnya yang disarankan:
1. Buat `lib/google-sheets/repository.ts` interface sudah ada — tinggal buat implementasi in-memory (`InMemoryRepository<T>`) untuk testing.
2. Inject repository ke Service Layer lewat constructor/factory, bukan `new SheetsRepository(...)` langsung di top-level module (saat ini masih hardcoded — perubahan kecil tapi menyentuh semua file service).
3. Test Service Layer dengan `InMemoryRepository`, assert business rules (mis. "edit pesanan ditolak jika bukan status scheduling", "stok tidak boleh minus").

Ini sengaja belum dikerjakan di iterasi ini karena mengubah struktur Service Layer yang sudah berjalan — beri tahu jika ingin direfactor ke arah ini.

## 2. Integration Testing (manual, butuh spreadsheet nyata)

Checklist lengkap per tahap sudah ada di README.md (bagian "Testing Tahap N"). Ringkasan alur end-to-end yang WAJIB dites sebelum dianggap siap produksi:

1. **Setup**: buat 5 spreadsheet sesuai `docs/database-schema.md`, share ke Service Account, isi `.env.local`, buat admin pertama (`scripts/hash-password.js`).
2. **Master Data**: buat Wilayah → Sales → Warung → Produk. Coba nonaktifkan Wilayah yang masih dipakai Warung aktif (sistem saat ini TIDAK mencegah ini — lihat Risiko di bawah).
3. **Alur pesanan penuh (jalur bahagia)**: Buat Pesanan → Tugaskan Sales → (sebagai sales) Terima → Admin konfirmasi Picking → (sales) Mulai Kirim → Check-In → Isi Data Kunjungan & Check-Out → Admin Konfirmasi Selesai. Setiap langkah, verifikasi status Kanban berpindah sesuai alur Bagian 7 brief.
4. **Alur penolakan & penugasan ulang**: Tugaskan sales A → sales A tolak dengan alasan → pesanan kembali ke Scheduling → tugaskan ke sales B → sales B terima.
5. **Alur pembatalan**: uji pembatalan di tiap status (Scheduling, Assigned, Ready to Picking, Ready to Delivery, On Delivery — retur otomatis, Arrived — harus ditolak).
6. **Multi-role**: login sebagai admin di satu browser, sebagai sales di browser/incognito lain, lakukan alur bersamaan untuk memverifikasi notifikasi & pembatasan akses (sales tidak bisa lihat tugas sales lain, dst).
7. **Laporan**: verifikasi angka di Dashboard & halaman Laporan cocok dengan data yang baru saja dibuat.

## 3. Known Gaps & Risiko Teknis (belum diuji/diimplementasikan)

Daftar ini dikumpulkan dari catatan risiko yang sudah disampaikan di sepanjang pengembangan (Tahap 1–9), dikumpulkan di satu tempat:

| Area | Gap | Dampak |
|---|---|---|
| Upload bukti pembayaran | Belum ada integrasi Google Drive API — field masih menerima link manual | Sales harus upload ke layanan lain dulu, tempel link (Tahap 6) |
| Reopen kunjungan Completed | Status kembali ke Visited, tapi belum ada form otomatis untuk mengisi ulang Check-Out tanpa risiko dobel hitung stok | Koreksi data saat ini perlu penanganan manual/manual sheet edit (Tahap 7) |
| Permission granular | Penegakan akses berbasis role (Admin/Sales tetap), bukan permission per-pengguna meski tabelnya sudah ada | Tidak bisa membuat role kustom pihak ketiga tanpa kerja tambahan (Tahap 8) |
| Performa Dashboard/Laporan | `findAll()` membaca seluruh baris sheet lalu filter di memori | Melambat pada volume data besar — lihat README Tahap 9 |
| Validasi relasi saat nonaktifkan | Menonaktifkan Wilayah/Produk yang masih dipakai record aktif tidak diblokir sistem | Berpotensi data tidak konsisten secara tampilan (bukan integritas data, karena relasi tetap by-ID) |
| Rate limit Google Sheets API | Belum ada retry/backoff eksplisit di luar cache 15 detik | Request beruntun dalam volume tinggi bisa kena limit 100 req/100 detik |

## 4. Testing Checklist Per Tahap

Lihat README.md — setiap tahap (1–9) punya bagian "Testing Tahap N" dan "Acceptance Criteria Tahap N" tersendiri, total lebih dari 60 skenario manual yang sudah terdaftar sepanjang pengembangan.
