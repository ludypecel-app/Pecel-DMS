import { randomUUID } from "crypto";

/** ID generik untuk entitas apa pun (mis. Region, Warung, Payment). */
export function generateId(): string {
  return randomUUID();
}

/**
 * ID berformat manusiawi untuk entitas transaksional, mis. ORD-20260915-0001.
 * `sequence` sebaiknya dihitung di Service Layer (bukan row number sheet) —
 * misalnya dari counter tersendiri atau panjang hasil query hari itu + 1.
 */
export function generateSequentialId(prefix: string, sequence: number): string {
  const today = new Date();
  const datePart = [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("");
  return `${prefix}-${datePart}-${String(sequence).padStart(4, "0")}`;
}

/**
 * Kode singkat berurutan untuk master data (mis. Wilayah, Produk) yang
 * digenerate sistem — tidak boleh diinput manual oleh admin, dan begitu
 * dibuat, tidak berubah lagi (Service Layer menolak perubahan `code` lewat
 * update()).
 *
 * Dihitung dari angka TERBESAR yang pernah dipakai di antara kode-kode yang
 * sudah ada (bukan cuma jumlah baris + 1), supaya tetap aman dari duplikat
 * walau ada baris di tengah yang sudah dihapus permanen.
 */
export function generateNextCode(existingCodes: string[], prefix: string, padLength = 3): string {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`);
  let max = 0;
  for (const code of existingCodes) {
    const match = code.match(pattern);
    if (match && match[1]) {
      const n = parseInt(match[1], 10);
      if (n > max) max = n;
    }
  }
  return `${prefix}-${String(max + 1).padStart(padLength, "0")}`;
}
