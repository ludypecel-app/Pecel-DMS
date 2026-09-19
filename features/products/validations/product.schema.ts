import { z } from "zod";

export const productSchema = z.object({
  code: z.string().trim().min(1, "Kode produk wajib diisi").max(20),
  name: z.string().trim().min(1, "Nama produk wajib diisi").max(150),
  unit: z.string().trim().min(1, "Satuan wajib diisi").max(20),
  price: z.number().positive("Harga harus lebih besar dari 0"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export type ProductInput = z.infer<typeof productSchema>;
