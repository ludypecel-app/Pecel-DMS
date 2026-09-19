import { z } from "zod";

export const orderItemSchema = z.object({
  product_id: z.string().min(1, "Produk wajib dipilih"),
  quantity: z.number().int().positive("Jumlah harus lebih besar dari 0"),
});

export const createOrderSchema = z.object({
  warung_id: z.string().min(1, "Warung wajib dipilih"),
  delivery_date: z.string().min(1, "Tanggal pengiriman wajib diisi"),
  items: z.array(orderItemSchema).min(1, "Pesanan harus memiliki minimal 1 produk"),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

/**
 * Edit pesanan hanya diperbolehkan pada status Scheduling (lihat aturan bisnis
 * Tahap 2/3). Field yang boleh diubah: tanggal pengiriman dan daftar produk;
 * warung tidak boleh diubah (buat pesanan baru jika warung salah).
 */
export const updateOrderSchema = z.object({
  delivery_date: z.string().min(1).optional(),
  items: z.array(orderItemSchema).min(1).optional(),
});

export type UpdateOrderInput = z.infer<typeof updateOrderSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().min(1, "Alasan pembatalan wajib diisi"),
});
