import { z } from "zod";

export const productSchema = z.object({
  // Kode digenerate otomatis oleh sistem (lihat product.service.ts) — bukan
  // input manual admin; nilai apa pun yang dikirim client untuk field ini
  // diabaikan.
  code: z.string().trim().max(20).optional(),
  name: z.string().trim().min(1, "Nama produk wajib diisi").max(150),
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(20),
  price: z.number().positive("Harga harus lebih besar dari 0"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type ProductInput = z.infer<typeof productSchema>;
