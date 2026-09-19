import { z } from "zod";

export const visitItemSchema = z.object({
  product_id: z.string().min(1),
  sold_quantity: z.number().int().min(0, "Jumlah penjualan tidak boleh negatif"),
  returned_quantity: z.number().int().min(0, "Jumlah produk ditarik tidak boleh negatif"),
});

export const checkOutSchema = z.object({
  items: z.array(visitItemSchema).min(1, "Minimal satu produk harus didata"),
  payment: z.object({
    status: z.enum(["belum_bayar", "sebagian", "lunas", "ditangguhkan"]),
    method: z.enum(["tunai", "transfer", "qris", "lainnya"]),
    proof_url: z.string().trim().optional(),
  }),
  notes: z.string().trim().optional(),
});
export type CheckOutInput = z.infer<typeof checkOutSchema>;
