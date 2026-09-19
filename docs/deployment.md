# Deployment — Pecel DMS

## 1. Persiapan sebelum deploy

- [ ] Semua spreadsheet Google sudah dibuat sesuai `docs/database-schema.md`, dengan header kolom yang persis sama urutannya dengan `lib/google-sheets/tables.ts`.
- [ ] Service Account Google Cloud sudah dibuat, dengan **Google Sheets API** diaktifkan di proyek GCP-nya.
- [ ] Kelima spreadsheet (`master`, `orders`, `assignments`, `visits`, `payments`/`logs`) sudah di-share ke email Service Account dengan akses **Editor**.
- [ ] `npm install` & `npm run build` berjalan tanpa error di mesin lokal (langkah ini WAJIB dites lokal — lingkungan tempat saya menyusun kode ini tidak punya akses jaringan untuk menjalankannya).
- [ ] Admin pertama sudah dibuat manual di sheet `User` (lihat `scripts/hash-password.js`).
- [ ] `npm test` lolos (lihat `docs/testing.md`).

## 2. Deploy ke Vercel

1. Push kode ke repository GitHub (`git init`, `git add .`, `git commit`, buat repo baru di GitHub, `git push`).
2. Di [vercel.com](https://vercel.com), klik **Add New → Project**, impor repository tersebut.
3. Framework Preset otomatis terdeteksi sebagai **Next.js** — biarkan default (`next build`, output `.next`).
4. Di bagian **Environment Variables**, isi seluruh variabel dari `.env.example`:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` — **penting**: tempel dengan newline literal `\n` di dalam string (Vercel menyimpan sebagai satu baris), kode di `lib/google-sheets/client.ts` sudah menangani un-escape `\n` → newline asli.
   - `GOOGLE_SHEETS_SPREADSHEET_ID_MASTER`, `..._ORDERS`, `..._ASSIGNMENTS`, `..._VISITS`, `..._PAYMENTS`, `..._LOGS`
   - `NEXTAUTH_SECRET` — generate baru khusus produksi (`openssl rand -base64 32`), JANGAN pakai yang sama dengan development.
   - `NEXTAUTH_URL` — isi dengan URL Vercel yang akan didapat (mis. `https://pecel-dms.vercel.app`); bisa diisi setelah deploy pertama lalu redeploy.
5. Klik **Deploy**. Setelah selesai, buka URL yang diberikan Vercel dan uji login.
6. Update `NEXTAUTH_URL` dengan domain final (custom domain jika ada), lalu **Redeploy** (Vercel → Deployments → ⋯ → Redeploy) agar NextAuth memakai URL yang benar.

## 3. Custom Domain (opsional)

Di Vercel project settings → **Domains**, tambahkan domain Anda, ikuti instruksi DNS (CNAME/A record) dari Vercel. Setelah domain aktif, update `NEXTAUTH_URL` ke domain tersebut dan redeploy.

## 4. Setelah Deploy — Verifikasi

- [ ] Buka domain produksi → redirect ke `/login`
- [ ] Login dengan admin pertama → berhasil, dashboard tampil dengan data dari spreadsheet asli
- [ ] Buat satu Wilayah/Sales/Warung/Produk uji coba → tersimpan, muncul di Google Sheets
- [ ] Cek Vercel → **Logs** (tab Functions) bila ada error 500 saat testing manual

## 5. Migrasi ke Hostinger (rencana, belum dijalankan)

Arsitektur sudah disiapkan agar tidak terlalu terikat ke Vercel (lihat `docs/architecture.md`):
- `next.config.js` memakai `output: "standalone"` — menghasilkan server Node.js mandiri (`.next/standalone/`) yang bisa dijalankan di server mana pun tanpa bergantung fitur khusus Vercel.
- Business logic sepenuhnya di Service Layer, terpisah dari framework — migrasi backend tidak menyentuh logic ini.

Langkah migrasi ke Hostinger (VPS/Cloud Hosting yang mendukung Node.js — **bukan** shared hosting biasa, karena Next.js server butuh proses Node.js berjalan):
1. `npm run build` menghasilkan `.next/standalone/server.js`.
2. Upload folder `.next/standalone/`, `.next/static/` (disalin ke `.next/standalone/.next/static/`), dan folder `public/` ke server Hostinger.
3. Set environment variables yang sama seperti di Vercel lewat panel Hostinger atau file `.env` di server.
4. Jalankan `node server.js` (idealnya lewat process manager seperti `pm2` agar tetap hidup setelah restart: `pm2 start server.js --name pecel-dms`).
5. Konfigurasi reverse proxy (Nginx) di Hostinger untuk mengarahkan domain ke port yang dipakai `server.js` (default 3000, bisa diubah lewat env `PORT`).
6. Update `NEXTAUTH_URL` ke domain Hostinger, redeploy.

**Belum dikerjakan/diuji** — ini rencana berdasarkan arsitektur yang sudah disiapkan, bukan langkah yang sudah saya jalankan. Beri tahu kalau migrasi ini sudah mau dilakukan sungguhan, supaya saya bisa bantu susun skrip build/deploy yang lebih spesifik dengan detail paket hosting Hostinger yang dipakai.

## 6. Migrasi Google Sheets → Database Relasional (rencana jangka panjang)

Disebutkan sebagai risiko sejak Tahap 0 — ketika volume transaksi sudah besar:
1. Setup PostgreSQL (mis. lewat Supabase, Neon, atau instance terkelola lain).
2. Buat implementasi baru dari interface `Repository<T>` (`lib/google-sheets/repository.ts`) — mis. `PostgresRepository<T>` — dengan kontrak yang sama persis.
3. Ganti instansiasi `new SheetsRepository(...)` di tiap Service Layer menjadi `new PostgresRepository(...)`. Karena Service Layer hanya bergantung pada interface `Repository<T>`, tidak ada perubahan logic bisnis yang diperlukan.
4. Tulis skrip migrasi data dari Google Sheets (baca lewat Sheets API) ke tabel Postgres, memetakan kolom 1:1 sesuai `docs/database-schema.md`.
5. Uji paralel (dual-write atau staging) sebelum cutover penuh.
