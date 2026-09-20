/**
 * Membantu membuat user admin PERTAMA secara manual, karena sheet `User`
 * mulai kosong dan aplikasi mewajibkan login (Tahap 8).
 *
 * Cara pakai:
 *   node scripts/hash-password.js "passwordAnda"
 *
 * Salin hash yang dihasilkan ke kolom `password_hash` pada baris baru di
 * tab `User` (spreadsheet Master), lalu isi kolom lain secara manual:
 *   id: (UUID bebas, mis. dari https://www.uuidgenerator.net/)
 *   name, email, role: "admin", sales_id: (kosongkan), status: "active"
 *   created_at, updated_at: waktu sekarang dalam format ISO
 *
 * Setelah itu Anda bisa login lewat halaman /login dan mengelola user
 * berikutnya lewat menu Pengaturan > Pengguna di aplikasi.
 */
const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Pemakaian: node scripts/hash-password.js \"passwordAnda\"");
  process.exit(1);
}

bcrypt.hash(password, 10).then((hash) => {
  console.log(hash);
});
