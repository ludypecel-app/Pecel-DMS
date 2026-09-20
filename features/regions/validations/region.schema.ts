import { z } from "zod";

export const regionSchema = z.object({
  // Kode digenerate otomatis oleh sistem (lihat region.service.ts) — bukan
  // input manual admin. Dibuat optional di sini semata supaya schema ini
  // masih bisa dipakai untuk validasi baris yang sudah punya code tersimpan;
  // nilai apa pun yang dikirim client untuk field ini diabaikan.
  code: z.string().trim().max(20).optional(),
  name: z.string().trim().min(1, "Nama wilayah wajib diisi").max(100),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type RegionInput = z.infer<typeof regionSchema>;
