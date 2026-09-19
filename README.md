# Pecel DMS — Sales & Product Monitoring System

Sistem manajemen distribusi & pemantauan sales untuk produsen pecel. Next.js 14 (App Router) + TypeScript + Tailwind CSS, dengan Google Sheets sebagai backend sementara di belakang Repository Pattern (siap migrasi ke database relasional).

## Status: Tahap 10 — Testing dan Deployment (roadmap selesai)

Seluruh Tahap 1–9 selesai. Tahap 10 menutup roadmap awal dengan:
- **Unit test otomatis** (`tests/`, dijalankan `npm test` via Vitest) untuk skema validasi (aturan bisnis inti: pesanan butuh produk, role sales wajib terhubung ke Sales, dst.) dan utilitas ID
- **`docs/testing.md`**: rencana testing lengkap — cakupan unit test, checklist integration testing manual end-to-end, dan tabel gap/risiko teknis yang dikumpulkan dari seluruh tahap sebelumnya di satu tempat
- **`docs/deployment.md`**: panduan deploy ke Vercel langkah demi langkah, rencana migrasi ke Hostinger, dan rencana migrasi Google Sheets → database relasional (sesuai arsitektur Repository Pattern yang disiapkan sejak Tahap 1)

**Yang JUJUR perlu saya sampaikan tentang tahap ini**: saya tidak punya akses jaringan di lingkungan tempat kode ini disusun, jadi saya tidak bisa menjalankan `npm install`, `npm run build`, `npm test`, atau deploy sungguhan ke Vercel. Semua yang saya kerjakan di tahap ini adalah kode test yang saya susun cermat dan dokumentasi berdasarkan pengetahuan arsitektur Next.js/Vercel — **bukan** hasil yang sudah tervalidasi berjalan. Langkah paling penting yang perlu ANDA lakukan sebelum menganggap proyek ini selesai:
1. `npm install` di mesin lokal — kemungkinan ada error dependency/versi yang baru ketahuan di sini.
2. `npm test` — jalankan unit test yang saya buat.
3. `npm run build` — build produksi, ini akan menangkap error TypeScript yang mungkin lolos dari saya sepanjang 10 tahap ini.
4. Setup spreadsheet & kredensial sungguhan, jalankan `npm run dev`, lalu susuri checklist testing manual di `docs/testing.md`.
5. Baru setelah semua itu lolos, ikuti `docs/deployment.md` untuk deploy ke Vercel.

Saya sangat menyarankan Anda (atau developer yang mendampingi) mengalokasikan waktu khusus untuk langkah 1–4 di atas sebelum menganggap aplikasi ini siap dipakai tim sungguhan — 10 tahap kode yang belum pernah di-build sekalipun punya risiko nyata ada kesalahan kecil (typo import, mismatch tipe) yang baru muncul saat kompilasi asli.

## Cara menjalankan secara lokal

```bash
npm install
cp .env.example .env.local
```

Isi `.env.local` dengan:
- `GOOGLE_SERVICE_ACCOUNT_EMAIL` & `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` dari Service Account Google Cloud yang punya akses Editor ke spreadsheet.
- `GOOGLE_SHEETS_SPREADSHEET_ID_MASTER` — spreadsheet dengan tab `Region`, `Sales`, `Warung`, `Product`, `User`, `RolePermission`.
- `GOOGLE_SHEETS_SPREADSHEET_ID_ORDERS` — spreadsheet dengan tab `Order`, `OrderDetail`.
- `GOOGLE_SHEETS_SPREADSHEET_ID_ASSIGNMENTS` — spreadsheet dengan tab `Assignment`.
- `GOOGLE_SHEETS_SPREADSHEET_ID_VISITS` — spreadsheet dengan tab `Visit`, `StockTransaction`.
- `GOOGLE_SHEETS_SPREADSHEET_ID_PAYMENTS` — spreadsheet dengan tab `Payment` (tab `Attachment` disiapkan tapi belum dipakai — lihat catatan Tahap 6 di atas).
- `GOOGLE_SHEETS_SPREADSHEET_ID_LOGS` — spreadsheet dengan tab `Notification`, `AuditLog`.
- Nama tab dan urutan kolom harus sama persis dengan `docs/database-schema.md` / `lib/google-sheets/tables.ts`. Baris pertama tiap tab wajib berisi nama kolom (header).
- Bagikan (share) semua spreadsheet ke email Service Account dengan akses **Editor**.
- Isi juga `NEXTAUTH_SECRET` (string acak bebas, mis. hasil `openssl rand -base64 32`) dan `NEXTAUTH_URL=http://localhost:3000`.

**Buat admin pertama** (sheet `User` masih kosong):
```bash
npm install   # sekali saja, sebelum menjalankan script di bawah
node scripts/hash-password.js "passwordAnda"
```
Salin hash yang tercetak ke kolom `password_hash` pada baris baru di tab `User`, isi kolom lain (`id` UUID bebas, `role: admin`, `status: active`, dst — detail di komentar file script tersebut).

```bash
npm run dev
```

Buka http://localhost:3000 — akan redirect ke `/login`.

> Catatan: lingkungan pengembangan Claude saat ini tidak memiliki akses jaringan, sehingga `npm install` belum dijalankan/diverifikasi di sini. Jalankan perintah di atas di mesin lokal Anda (Node.js 18+ direkomendasikan) untuk memverifikasi build.

## Struktur folder

```
pecel-dms/
├── app/
│   ├── (app)/            ← route group, dibungkus AppShell (sidebar+header)
│   │   ├── dashboard/
│   │   ├── orders/
│   │   ├── assignments/
│   │   ├── master-data/{regions,sales,warungs,products}/
│   │   └── settings/{users,permissions}/
│   ├── api/               ← API Routes (diisi mulai Tahap 2)
│   ├── layout.tsx          ← root layout
│   └── page.tsx            ← redirect ke /dashboard
├── components/layout/      ← Sidebar, Header, AppShell
├── config/navigation.ts    ← sumber tunggal menu sidebar (role & permission aware)
├── lib/google-sheets/       ← Repository interface (implementasi menyusul)
├── types/entities.ts        ← tipe data sesuai rancangan skema
├── docs/                    ← architecture.md, database-schema.md, testing.md, deployment.md
├── tests/                   ← unit test (Vitest) — skema validasi & utilitas
├── scripts/                 ← hash-password.js (buat admin pertama)
└── .env.example
```

## Testing Tahap 7

- [ ] Assignment berstatus `visited` menampilkan tautan "Review & Konfirmasi" di `/assignments`
- [ ] Halaman review menampilkan breakdown stok (Kirim/Jual/Ditarik/Sisa) sesuai data Check-Out Tahap 6
- [ ] Total Tagihan & status/metode pembayaran di review sama dengan yang diisi sales saat Check-Out
- [ ] Klik "Konfirmasi Selesai" → status jadi Completed, sales dapat notifikasi
- [ ] Assignment Completed menampilkan "Lihat Review" (bukan tombol konfirmasi lagi) dan info "Dikonfirmasi oleh..."
- [ ] Klik "Buka Kembali untuk Koreksi" pada assignment Completed → wajib isi alasan, status kembali ke Visited
- [ ] Riwayat reopen (siapa, kapan, alasan) tercatat di Audit Log

## Acceptance Criteria Tahap 7

- Admin dapat memeriksa data kunjungan lengkap sebelum konfirmasi (tidak ada data yang hilang dari Tahap 6)
- Hanya assignment berstatus Visited yang bisa dikonfirmasi; hanya Completed yang bisa dibuka kembali
- Setiap konfirmasi & reopen tercatat waktu dan pelaku, serta masuk Audit Log
- Data kunjungan lama tidak terhapus saat reopen (audit trail terjaga)

## Acceptance Criteria Tahap 1–6 (selesai)

- Layout responsif, struktur folder modular sesuai `docs/architecture.md`
- CRUD lengkap Wilayah/Sales/Warung/Produk, Pesanan dengan wilayah auto-fill & harga dibekukan
- Penugasan & Kanban dengan drag & drop tervalidasi, picking mendukung partial fulfillment, Audit Log aktif
- Pendataan Kunjungan: jumlah pengiriman bersumber dari picking aktual, validasi stok & tagihan di server

## Testing Tahap 8

- [ ] Akses `/dashboard` tanpa login → redirect ke `/login`
- [ ] Login dengan akun admin yang dibuat manual → berhasil masuk, sidebar menampilkan menu lengkap (termasuk Master Data & Pengaturan)
- [ ] Buat user baru dengan role Sales di Pengaturan > Pengguna, hubungkan ke data Sales yang sudah ada
- [ ] Login sebagai user Sales tersebut (browser/incognito terpisah) → sidebar hanya menampilkan Dashboard & Penugasan, tidak ada Master Data/Pengaturan
- [ ] Sebagai sales, coba akses langsung URL `/master-data/regions` → tidak muncul di menu (server tetap menolak mutasi lewat API meski halaman diakses langsung)
- [ ] Sebagai sales, terima/tolak/mulai kirim/check-in/check-out HANYA bisa untuk penugasan milik sendiri (tidak perlu pilih "acting as" lagi — otomatis dari login)
- [ ] Coba panggil API aksi sales (mis. `/api/assignments/{id}/accept`) saat login sebagai admin → ditolak 403
- [ ] Nonaktifkan user → user tersebut tidak bisa login lagi (ditolak di `authorize()`)
- [ ] Toggle permission di halaman Hak Akses → tersimpan (cek dengan reload halaman)
- [ ] Logout dari header → kembali ke `/login`, akses halaman lain otomatis redirect lagi

## Acceptance Criteria Tahap 8

- Tidak ada lagi endpoint yang menerima `salesId`/actor dari body request untuk menentukan identitas — semua dari session
- Middleware menolak akses tanpa login untuk seluruh halaman & API aplikasi
- API mutasi admin (master data, pesanan, penugasan, konfirmasi) ditolak untuk role sales, dan sebaliknya untuk aksi sales
- Password di-hash (bcrypt), tidak pernah dikembalikan ke client oleh `userService`
- User dapat dinonaktifkan dan langsung kehilangan akses login

## Testing Tahap 9

- [ ] Login sebagai admin → dashboard menampilkan 8 kartu statistik + ringkasan penjualan + ringkasan stok
- [ ] Login sebagai sales → dashboard menampilkan kartu berbeda (tugas hari ini, jadwal picking/kirim, riwayat kunjungan)
- [ ] Angka "Pesanan Terlambat" hanya menghitung pesanan dengan delivery_date lewat dan status belum Completed/Cancelled
- [ ] Buka `/reports` sebagai admin → tab Laporan Pembayaran tampil, filter tanggal berfungsi, total periode sesuai
- [ ] Ganti ke tab Monitoring Kunjungan → data check-in/check-out sesuai, filter sales berfungsi
- [ ] Klik Export CSV → file terunduh dengan data yang sesuai tab & filter aktif
- [ ] Sales mencoba akses `/reports` langsung → tidak ada di menu (dan API menolak dengan 403 bila dipanggil manual)

## Acceptance Criteria Tahap 9

- Dashboard menyesuaikan otomatis berdasarkan role login, tanpa toggle manual
- Semua angka dashboard dihitung dari data live Google Sheets, bukan data statis/contoh
- Laporan mendukung filter periode dan export CSV
- Endpoint laporan & dashboard sales membatasi data sesuai identitas/role dari session (bukan input client)

## Testing Tahap 10

- [ ] `npm test` lolos semua (lihat daftar test di `tests/`)
- [ ] `npm run build` sukses tanpa error TypeScript
- [ ] Checklist integration testing di `docs/testing.md` bagian 2 sudah disusuri minimal sekali penuh
- [ ] Deploy ke Vercel berhasil mengikuti `docs/deployment.md`, login & alur dasar berfungsi di URL produksi

## Acceptance Criteria Tahap 10

- Unit test mencakup aturan bisnis inti di lapisan validasi (bukan sekadar "hello world" test)
- Dokumentasi testing & deployment cukup lengkap untuk developer lain (atau Anda sendiri beberapa bulan kemudian) menjalankan ulang tanpa bertanya ke saya
- Gap dan keterbatasan yang belum diimplementasikan sepanjang 10 tahap terkumpul di satu tempat (`docs/testing.md` bagian 3), bukan tersebar dan mudah terlupakan

---

**Roadmap Tahap 0–10 dari brief awal telah selesai dikerjakan.** Lihat catatan jujur di bagian Status Tahap 10 di atas — langkah verifikasi lokal (install, test, build) adalah prasyarat sebelum aplikasi ini dianggap siap dipakai.
